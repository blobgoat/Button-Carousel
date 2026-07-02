//
// Generated tests for the `button-carousel` package described in prompt.txt.
// NOTE: src/index.ts and src/style.ts do not exist yet at the time these tests
// were written. Imports below will fail to resolve until an agent implements
// the package. This is expected — see test-generation skill instructions.
//
// Assumptions made where prompt.txt did not specify exact implementation
// details (documented per-domain below, and summarized in the final report):
//   - Each rendered "button" is a native <button> element.
//   - Active/inactive visual state is reflected in some way on the button's
//     className (a distinguishing class is added/removed), even though the
//     exact class name string is not specified in the prompt. Tests compare
//     className *relatively* (active vs inactive) rather than asserting a
//     literal class string, except where the prompt explicitly mandates the
//     `button-carousel-` prefix for ALL classes.
//   - Dedup of the injected <style> tag is verified by counting <style>
//     elements in <head> rather than assuming a literal id string.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createButtonCarousel,
  type ButtonCarouselInstance,
  type ButtonCarouselItem,
  type ButtonCarouselOptions,
} from "../src/index";

const STYLE_ID: string = "button-carousel-styles";
beforeEach(() => {
  document.body.innerHTML = "";
  document.getElementById(STYLE_ID)?.remove();
});

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------

const img1: ButtonCarouselItem = { type: "image", src: "/assets/image-1.jpg", alt: "Image One" };
const img2: ButtonCarouselItem = { type: "image", src: "/assets/image-2.jpg", alt: "Image Two" };
const img3: ButtonCarouselItem = { type: "image", src: "/assets/image-3.jpg", alt: "Image Three" };
const gif1: ButtonCarouselItem = { type: "gif", src: "/assets/demo.gif", alt: "Demo Gif" };
const video1: ButtonCarouselItem = { type: "video", src: "/assets/demo.mp4", alt: "Demo Video" };
const videoWithPoster: ButtonCarouselItem = {
  type: "video",
  src: "/assets/demo-2.mp4",
  alt: "Demo Video With Poster",
  poster: "/assets/poster.jpg",
};

// The prompt additionally allows `src` on an "image" item to be an
// object shaped like `{ src: string }`. The exported ButtonCarouselItem
// type may or may not model this in the union directly, so we cast here
// rather than fight the type checker — the *runtime* behavior is what's
// under test (req: "If `src` is an object with a `src` property, use that
// inner `src` string.").
const imgFromObjectSrc = {
  type: "image",
  src: { src: "/assets/object-image.jpg" },
  alt: "Object Image",
} as unknown as ButtonCarouselItem;

function tenMixedItems(): ButtonCarouselItem[] {
  const items: ButtonCarouselItem[] = [];
  for (let i = 0; i < 10; i++) {
    const kind = i % 3;
    if (kind === 0) {
      items.push({ type: "image", src: `/assets/ten-${i}.jpg`, alt: `Item ${i}` });
    } else if (kind === 1) {
      items.push({ type: "gif", src: `/assets/ten-${i}.gif`, alt: `Item ${i}` });
    } else {
      items.push({ type: "video", src: `/assets/ten-${i}.mp4`, alt: `Item ${i}` });
    }
  }
  return items;
}

const activeInstances: ButtonCarouselInstance[] = [];
const activeContainers: any[] = [];

function mount(items: ButtonCarouselItem[], initialIndex?: number) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  activeContainers.push(container);

  const options: ButtonCarouselOptions =
    initialIndex === undefined ? { container, items } : { container, items, initialIndex };

  const instance = createButtonCarousel(options);
  activeInstances.push(instance);
  return { container, instance };
}

function getButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll("button"));
}

// Relative "signature" of a button's visual state — used to compare active
// vs. inactive appearance without assuming a literal class name.
function classSignature(el: Element): string {
  return el.className;
}

afterEach(() => {
  while (activeInstances.length) {
    const instance = activeInstances.pop()!;
    try {
      instance.destroy();
    } catch {
      // destroy() safety is asserted explicitly in the "destroy cleanup"
      // domain below; here we just make sure teardown doesn't cascade.
    }
  }
  while (activeContainers.length) {
    const container = activeContainers.pop()!;
    container.remove();
  }
});

// ---------------------------------------------------------------------------
// Domain: instance API shape
// Verifies createButtonCarousel returns an object exposing goTo, next,
// previous, and destroy as callable functions (req: "The returned object
// should include: goTo/next/previous/destroy").
// ---------------------------------------------------------------------------
describe("Domain: instance API shape", () => {
  const cases: { name: string; items: ButtonCarouselItem[] }[] = [
    // Single item — verifies the API shape doesn't depend on having multiple items
    { name: "single image item", items: [img1] },
    // Mixed items — verifies the API shape holds for the general/mixed-media case
    { name: "mixed image/gif/video items", items: [img1, gif1, video1] },
  ];

  it.each(cases)("returns goTo/next/previous/destroy as functions ($name)", ({ items }) => {
    const { instance } = mount(items);
    expect(typeof instance.goTo).toBe("function");
    expect(typeof instance.next).toBe("function");
    expect(typeof instance.previous).toBe("function");
    expect(typeof instance.destroy).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Domain: DOM structure & button count
// Verifies exactly one button is rendered per item, and that this holds for
// both the 1-item and many-item boundary (req: "The component should work
// with 1 item or many items.").
// ---------------------------------------------------------------------------
describe("Domain: DOM structure & button count", () => {
  const cases: { name: string; items: ButtonCarouselItem[]; expectedCount: number }[] = [
    // 1 item — lower boundary explicitly called out by the prompt
    { name: "1 item", items: [img1], expectedCount: 1 },
    // 3 items — typical/mixed case
    { name: "3 mixed items", items: [img1, gif1, video1], expectedCount: 3 },
    // 10 items — the "Mixed Media — 10 Items" example section from the prompt
    { name: "10 mixed items", items: tenMixedItems(), expectedCount: 10 },
  ];

  it.each(cases)("renders exactly one button per item ($name)", ({ items, expectedCount }) => {
    const { container } = mount(items);
    expect(getButtons(container)).toHaveLength(expectedCount);
  });
});

// ---------------------------------------------------------------------------
// Domain: media rendering per item type
// Verifies image/gif items render an <img>, video items render a <video>
// with muted/loop/playsInline/autoplay, and that alt/poster are applied
// when provided (req: "Images and GIFs should use <img>." / "Videos should
// use <video muted loop playsInline autoplay>.").
// ---------------------------------------------------------------------------
describe("Domain: media rendering per item type", () => {
  const cases: {
    name: string;
    item: ButtonCarouselItem;
    expectedTag: "IMG" | "VIDEO";
  }[] = [
      // image item — must render as <img>
      { name: "image item", item: img1, expectedTag: "IMG" },
      // gif item — prompt explicitly groups gif with image for <img> rendering
      { name: "gif item", item: gif1, expectedTag: "IMG" },
      // video item — must render as <video> with autoplay attributes
      { name: "video item", item: video1, expectedTag: "VIDEO" },
      // video item with poster — poster should be forwarded to the element
      { name: "video item with poster", item: videoWithPoster, expectedTag: "VIDEO" },
    ];

  it.each(cases)("renders a <$expectedTag> for $name", ({ item, expectedTag }) => {
    const { container } = mount([item]);
    const button = getButtons(container)[0];
    const media = button.querySelector(expectedTag.toLowerCase());
    expect(media).not.toBeNull();
    expect(media!.tagName).toBe(expectedTag);

    if (item.type === "video") {
      const videoEl = media as HTMLVideoElement;
      expect(videoEl.muted).toBe(true);
      expect(videoEl.loop).toBe(true);
      expect(videoEl.autoplay).toBe(true);
      // playsInline is exposed as the `playsInline`/`playsinline` IDL property
      expect((videoEl as any).playsInline).toBe(true);
      if (item.poster) {
        expect(videoEl.poster).toContain(item.poster);
      }
    }

    if (item.alt) {
      expect((media as HTMLImageElement | HTMLVideoElement).getAttribute("alt")).toBe(item.alt);
    }
  });
});

// ---------------------------------------------------------------------------
// Domain: media covers the button (object-fit: cover)
// Verifies every media element (image, gif, video) is styled with
// object-fit: cover regardless of type (req: "The media should cover the
// full button using object-fit: cover.").
// ---------------------------------------------------------------------------
describe("Domain: media object-fit cover", () => {
  const cases: { name: string; item: ButtonCarouselItem; selector: "img" | "video" }[] = [
    { name: "image item", item: img1, selector: "img" },
    { name: "gif item", item: gif1, selector: "img" },
    { name: "video item", item: video1, selector: "video" },
  ];

  it.each(cases)("applies object-fit: cover to the media for $name", ({ item, selector }) => {
    const { container } = mount([item]);
    const media = container.querySelector(selector) as HTMLElement;
    expect(media).not.toBeNull();
    expect(getComputedStyle(media).objectFit).toBe("cover");
  });
});

// ---------------------------------------------------------------------------
// Domain: image-like object src normalization
// Verifies that when an "image" item's `src` is an object shaped like
// `{ src: string }`, the inner string is used as the rendered <img> src
// (req: "If src is an object with a src property, use that inner src
// string.").
// ---------------------------------------------------------------------------
describe("Domain: image-like object src normalization", () => {
  const cases: { name: string; item: ButtonCarouselItem; expectedSrcFragment: string }[] = [
    // Plain string src — baseline/control case
    { name: "plain string src", item: img1, expectedSrcFragment: "/assets/image-1.jpg" },
    // Object src ({ src: string }) — the special-cased "image-like object" form
    { name: "object src ({ src })", item: imgFromObjectSrc, expectedSrcFragment: "/assets/object-image.jpg" },
  ];

  it.each(cases)("resolves the <img> src correctly for $name", ({ item, expectedSrcFragment }) => {
    const { container } = mount([item]);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toContain(expectedSrcFragment);
  });
});

// ---------------------------------------------------------------------------
// Domain: class name prefix convention
// Verifies every class name the package applies inside the container starts
// with `button-carousel-` (req: "Use class names prefixed with
// button-carousel- to avoid conflicts.").
// ---------------------------------------------------------------------------
describe("Domain: class name prefix convention", () => {
  it("only uses button-carousel- prefixed classes for all generated elements", () => {
    const { container } = mount([img1, gif1, video1]);
    const elements = Array.from(container.querySelectorAll("*"));
    expect(elements.length).toBeGreaterThan(0);

    for (const el of elements) {
      for (const cls of Array.from(el.classList)) {
        expect(cls.startsWith("button-carousel-")).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Domain: style injection & dedup
// Verifies CSS is auto-injected on creation, and that a second instance does
// not duplicate the injected style tag (req: "Inject the CSS automatically
// when createButtonCarousel is called." / "Prevent duplicate style
// injection by checking for an existing style tag ID.").
// ---------------------------------------------------------------------------
describe("Domain: style injection & dedup", () => {
  it("injects a style tag on first creation and does not duplicate it on a second instance", () => {
    const before = document.querySelectorAll("style").length;

    mount([img1]);
    const afterFirst = document.querySelectorAll("style").length;
    expect(afterFirst).toBeGreaterThan(before);

    mount([img2]);
    const afterSecond = document.querySelectorAll("style").length;
    expect(afterSecond).toBe(afterFirst);
  });
});

// ---------------------------------------------------------------------------
// Domain: initial active state
// Verifies `initialIndex` determines which button starts active, and that a
// sensible default (index 0) is used when initialIndex is omitted (req:
// "initialIndex: 0" example option; "Clicking a button should make it the
// active selected button" implies a well-defined starting active button).
// ---------------------------------------------------------------------------
describe("Domain: initial active state", () => {
  it("marks the button at initialIndex as visually distinct from the others", () => {
    const { container } = mount([img1, img2, img3, gif1], 2);
    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);

    // The button at the requested initial index should differ from at least
    // one other (inactive) button...
    const others = signatures.filter((_, i) => i !== 2);
    expect(others.every((s) => s === others[0])).toBe(true); // all inactive buttons match each other
    expect(signatures[2]).not.toBe(others[0]); // the active one differs
  });

  it("defaults to the first button being active when initialIndex is omitted", () => {
    const { container } = mount([img1, img2, img3]);
    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);

    const others = signatures.slice(1);
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[0]).not.toBe(others[0]);
  });
});

// ---------------------------------------------------------------------------
// Domain: click-to-activate interaction
// Verifies clicking a button makes it the active button, and that only one
// button is active at a time (req: "Clicking a button should make it the
// active selected button." / "Clicking a different button should animate
// the selected state shifting from the old active button to the new active
// button.").
// ---------------------------------------------------------------------------
describe("Domain: click-to-activate interaction", () => {
  it("moves the active state to the clicked button (click index 2 of 4)", () => {
    const { container } = mount([img1, img2, img3, gif1], 0);
    const buttons = getButtons(container);

    buttons[2].click();

    const signatures = buttons.map(classSignature);
    const inactiveSignatures = signatures.filter((_, i) => i !== 2);

    // All non-clicked buttons (including the previously active index 0)
    // should now share the same "inactive" signature...
    expect(inactiveSignatures.every((s) => s === inactiveSignatures[0])).toBe(true);
    // ...and the clicked button should be visually distinct from them.
    expect(signatures[2]).not.toBe(inactiveSignatures[0]);
  });

  it("only ever has a single active button after repeated clicks (0 -> 3 -> 1)", () => {
    const { container } = mount([img1, img2, img3, video1], 0);
    const buttons = getButtons(container);

    buttons[3].click();
    buttons[1].click();

    const signatures = buttons.map(classSignature);
    // Exactly index 1 should differ from the other three, and the other
    // three should be identical to each other (single active button).
    const others = [signatures[0], signatures[2], signatures[3]];
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[1]).not.toBe(others[0]);
  });
});

// ---------------------------------------------------------------------------
// Domain: goTo(index) navigation
// Verifies calling goTo(index) programmatically activates the requested
// button, mirroring click behavior (req: "goTo(index: number): void").
// ---------------------------------------------------------------------------
describe("Domain: goTo(index) navigation", () => {
  it("activates the button at the given index (goTo(3) on 4 items)", () => {
    const { container, instance } = mount([img1, img2, img3, gif1], 0);
    instance.goTo(3);

    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);
    const others = signatures.slice(0, 3);
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[3]).not.toBe(others[0]);
  });

  it("is idempotent when called with the currently active index (goTo(0) twice)", () => {
    const { container, instance } = mount([img1, img2, img3], 0);
    instance.goTo(0);
    instance.goTo(0);

    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);
    const others = signatures.slice(1);
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[0]).not.toBe(others[0]);
  });
});

// ---------------------------------------------------------------------------
// Domain: next()/previous() navigation
// Verifies single-step forward/backward navigation from within bounds (req:
// "next(): void" / "previous(): void"). Wrap-around behavior at the first/
// last item is NOT specified in prompt.txt and is intentionally left
// untested here — see final report.
// ---------------------------------------------------------------------------
describe("Domain: next()/previous() navigation", () => {
  it("next() moves the active button forward by one (index 0 -> 1 of 3)", () => {
    const { container, instance } = mount([img1, img2, img3], 0);
    instance.next();

    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);
    const others = [signatures[0], signatures[2]];
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[1]).not.toBe(others[0]);
  });

  it("previous() moves the active button backward by one (index 1 -> 0 of 3)", () => {
    const { container, instance } = mount([img1, img2, img3], 1);
    instance.previous();

    const buttons = getButtons(container);
    const signatures = buttons.map(classSignature);
    const others = signatures.slice(1);
    expect(others.every((s) => s === others[0])).toBe(true);
    expect(signatures[0]).not.toBe(others[0]);
  });
});

// ---------------------------------------------------------------------------
// Domain: active vs inactive visual styling
// Verifies the active button's media is dimmed to ~20% opacity with an
// inset shadow, while inactive buttons keep full opacity with a
// non-inset (outer) shadow (req: "the media fill should visually reduce/
// dim to about 20% opacity" / "the shadow should move inward using an
// inset shadow" / "Inactive buttons should have an outer shadow.").
// ---------------------------------------------------------------------------
describe("Domain: active vs inactive visual styling", () => {
  it("dims the active button's media to roughly 20% opacity", () => {
    const { container } = mount([img1, img2, img3], 1);
    const buttons = getButtons(container);

    const activeMedia = buttons[1].querySelector("img, video") as HTMLElement;
    const inactiveMedia = buttons[0].querySelector("img, video") as HTMLElement;

    const activeOpacity = parseFloat(getComputedStyle(activeMedia).opacity);
    const inactiveOpacity = parseFloat(getComputedStyle(inactiveMedia).opacity);

    expect(activeOpacity).toBeGreaterThanOrEqual(0);
    expect(activeOpacity).toBeLessThanOrEqual(0.3); // "about 20%"
    expect(inactiveOpacity).toBeGreaterThan(activeOpacity);
  });

  it("gives the active button an inset shadow and the inactive buttons an outer shadow", () => {
    const { container } = mount([img1, img2, img3], 1);
    const buttons = getButtons(container);

    const activeShadow = getComputedStyle(buttons[1]).boxShadow;
    const inactiveShadow = getComputedStyle(buttons[0]).boxShadow;

    expect(activeShadow.toLowerCase()).toContain("inset");
    expect(inactiveShadow).not.toBe("none");
    expect(inactiveShadow.toLowerCase()).not.toContain("inset");
  });

  it("moves the dimming/inset-shadow treatment when the active button changes", () => {
    const { container, instance } = mount([img1, img2, img3], 0);
    const buttons = getButtons(container);

    instance.goTo(2);

    const newActiveShadow = getComputedStyle(buttons[2]).boxShadow;
    const nowInactiveShadow = getComputedStyle(buttons[0]).boxShadow;

    expect(newActiveShadow.toLowerCase()).toContain("inset");
    expect(nowInactiveShadow.toLowerCase()).not.toContain("inset");
  });
});

// ---------------------------------------------------------------------------
// Domain: destroy() cleanup
// Verifies destroy() safely removes DOM elements/listeners the package
// created, and that calling instance methods post-destroy does not throw
// (req: "Keep cleanup safe in destroy()." / "Remove event listeners and DOM
// elements created by the package when destroyed.").
// ---------------------------------------------------------------------------
describe("Domain: destroy() cleanup", () => {
  it("removes the button-carousel- prefixed DOM content from the container", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const instance = createButtonCarousel({ container, items: [img1, img2, gif1] });

    instance.destroy();

    const leftoverGeneratedElements = Array.from(container.querySelectorAll("*")).filter((el) =>
      Array.from(el.classList).some((cls) => cls.startsWith("button-carousel-"))
    );
    expect(leftoverGeneratedElements).toHaveLength(0);

    container.remove();
  });

  it("does not throw when goTo/next/previous/destroy are called again after destroy()", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const instance = createButtonCarousel({ container, items: [img1, img2, gif1] });

    instance.destroy();

    expect(() => instance.goTo(1)).not.toThrow();
    expect(() => instance.next()).not.toThrow();
    expect(() => instance.previous()).not.toThrow();
    expect(() => instance.destroy()).not.toThrow();

    container.remove();
  });
});

// ---------------------------------------------------------------------------
// Domain: multiple independent instances on one page
// Verifies two carousels mounted at the same time manage their own active
// index independently (req: "Make sure multiple carousels can exist on the
// same page." / "Each carousel instance should manage its own selected
// index." / "Do not hardcode a single global carousel instance.").
// ---------------------------------------------------------------------------
describe("Domain: multiple independent instances", () => {
  it("changing the active index on one carousel does not affect a second carousel", () => {
    const { container: containerA, instance: instanceA } = mount([img1, img2, img3], 0);
    const { container: containerB } = mount([gif1, video1, img3], 0);

    instanceA.goTo(2);

    const buttonsA = getButtons(containerA);
    const buttonsB = getButtons(containerB);

    const signaturesA = buttonsA.map(classSignature);
    const othersA = signaturesA.slice(0, 2);
    expect(othersA.every((s) => s === othersA[0])).toBe(true);
    expect(signaturesA[2]).not.toBe(othersA[0]); // instance A moved to index 2

    const signaturesB = buttonsB.map(classSignature);
    const othersB = signaturesB.slice(1);
    expect(othersB.every((s) => s === othersB[0])).toBe(true);
    expect(signaturesB[0]).not.toBe(othersB[0]); // instance B is untouched, still at index 0
  });
});
