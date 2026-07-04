import { buttonCarouselStyles, BUTTON_CAROUSEL_STYLE_ID } from "./style";

/**
 * A single media item rendered inside one carousel button.
 *
 * `image` items additionally accept an "image-like object" for `src`
 * (i.e. `{ src: string }`) so callers can pass through objects returned by
 * bundlers/CMSs without unwrapping them first.
 */
export type ButtonCarouselItem =
  | {
    type: "image";
    src: string | { src: string };
    alt?: string;
  }
  | {
    type: "gif";
    src: string;
    alt?: string;
  }
  | {
    type: "video";
    src: string;
    alt?: string;
    poster?: string;
  };

/**
 * Options for creating a button carousel instance. See README.md for usage details.
 */
export interface ButtonCarouselOptions {
  /** The element the carousel will be mounted into. */
  container: HTMLElement;
  /** The media items to render, one button per item. */
  items: ButtonCarouselItem[];
  /** Which item starts active/selected. Defaults to 0. */
  initialIndex?: number;
}

export interface ButtonCarouselInstance {
  /** Programmatically activate the button at `index` (clamped to bounds). */
  goTo(index: number): void;
  /** Activate the next button, if any. */
  next(): void;
  /** Activate the previous button, if any. */
  previous(): void;
  /** Remove all DOM nodes and event listeners created by this instance. */
  destroy(): void;
}

const CONTAINER_CLASS: string = "button-carousel-container";
const BUTTON_CLASS: string = "button-carousel-button";
const BUTTON_ACTIVE_CLASS: string = "button-carousel-button--active";
const MEDIA_CLASS: string = "button-carousel-media";
const ROOT_CLASS: string = "button-carousel-root";
const PREVIEW_CLASS: string = "button-carousel-preview";
const PREVIEW_MEDIA_CLASS: string = "button-carousel-preview-media";

/**
 * Injects the package's default stylesheet into `<head>` exactly once per
 * document, regardless of how many carousel instances are created.
 */
function injectStyles(): void {
  if (document.getElementById(BUTTON_CAROUSEL_STYLE_ID)) {
    return;
  }
  const styleEl = document.createElement("style");
  styleEl.id = BUTTON_CAROUSEL_STYLE_ID;
  styleEl.textContent = buttonCarouselStyles;
  document.head.appendChild(styleEl);
}

/** Resolves an `image` item's `src`, unwrapping `{ src: string }` objects. */
function resolveImageSrc(src: string | { src: string }): string {
  if (typeof src === "object" && src !== null && "src" in src) {
    return src.src;
  } else {
    if (typeof src !== "string") {
      throw new Error(`Invalid image src: ${JSON.stringify(src)}`);
    }
    return src;
  }
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

function createMediaElement(
  item: ButtonCarouselItem,
  className: string = MEDIA_CLASS
): HTMLImageElement | HTMLVideoElement {
  if (item.type === "video") {
    const video = document.createElement("video");
    video.className = className;
    video.src = item.src;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;

    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");

    if (item.poster) {
      video.poster = item.poster;
    }

    if (item.alt) {
      video.setAttribute("aria-label", item.alt);
    }

    return video;
  }

  const img = document.createElement("img");
  img.className = className;
  img.src = item.type === "image" ? resolveImageSrc(item.src) : item.src;
  img.alt = item.alt ?? "";
  img.draggable = false;

  return img;
}

/**
 * Mounts an interactive, framework-agnostic button carousel into
 * `options.container`. See README.md for full usage details.
 * @param options configuration for the carousel instance
 * @returns an object with methods to control the carousel programmatically
 */
export function createButtonCarousel(options: ButtonCarouselOptions): ButtonCarouselInstance {
  const { container, items } = options;
  //injects the default styles if necessary
  injectStyles();

  let activeIndex = clampIndex(options.initialIndex ?? 0, items.length);

  const abortController = new AbortController();

  const root = document.createElement("div");
  root.className = ROOT_CLASS;

  const preview = document.createElement("div");
  preview.className = PREVIEW_CLASS;

  const wrapper = document.createElement("div");
  wrapper.className = CONTAINER_CLASS;

  root.appendChild(preview);
  root.appendChild(wrapper);

  const buttons: HTMLButtonElement[] = items.map((item, index) => {
    if (item === undefined || item === null) {
      throw new Error(`Invalid item at index ${index}: ${item}`);
    }
    console.log(`Creating button for item at index ${index}:`, item);
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");

    const media = createMediaElement(item);
    button.appendChild(media);

    button.addEventListener(
      "click",
      () => {
        setActive(index);
      },
      { signal: abortController.signal }
    );

    if (index === activeIndex) {
      button.classList.add(BUTTON_ACTIVE_CLASS);
    }

    wrapper.appendChild(button);
    console.log(`Button created for item at index ${index}:`, button);
    console.log("root appended:", container.contains(root));
    console.log("wrapper children:", wrapper.children.length);
    return button;
  });
  console.log(buttons)
  setActive(activeIndex);
  updateEdgeButtons(activeIndex, buttons);

  renderPreview(activeIndex);
  container.appendChild(root);

  /**
   * Renders the preview media for the currently active button.
   * @param index current value to render the preview
   * @returns nothing
   */
  function renderPreview(index: number): void {
    preview.innerHTML = "";

    const item = items[index];

    if (!item) {
      return;
    }

    const previewMedia = createMediaElement(item, PREVIEW_MEDIA_CLASS);
    preview.appendChild(previewMedia);

    if (previewMedia instanceof HTMLVideoElement) {
      previewMedia.play().catch(() => {
        // Autoplay can fail in some browsers. Muted autoplay usually works.
      });
    }
  }

  const VISIBLE_BUTTON_COUNT = 5;

  function getVisibleWindowStart(activeIndex: number, buttonCount: number): number {
    if (buttonCount <= VISIBLE_BUTTON_COUNT) {
      return 0;
    }

    const maxStartIndex = buttonCount - VISIBLE_BUTTON_COUNT;

    return Math.max(0, Math.min(activeIndex - 2, maxStartIndex));
  }

  function scrollToFiveButtonWindow(activeIndex: number, behavior: ScrollBehavior = "smooth"): void {
    if (buttons.length < 5) {
      console.log("buttons.length < 5, no need to scroll, buttons =", buttons.length);
      return;
    }
    console.log("scrollToFiveButtonWindow called with activeIndex =", activeIndex);
    console.log("buttons.length =", buttons.length);
    console.log("Buttons:", buttons.map((btn, idx) => `Index ${idx}: ${btn.className}`));

    const startIndex = getVisibleWindowStart(activeIndex, buttons.length);
    const endIndex = startIndex + 4;

    const startButton = buttons[startIndex];
    const endButton = buttons[endIndex];

    if (!startButton || !endButton) {
      return;
    }
    //if the start or end buttons are shown need to scroll to them uniquely
    if (startIndex === 0 && activeIndex <= 2) {
      requestAnimationFrame(() => {
        const wrapperRect = wrapper.getBoundingClientRect();
        const buttonRect = startButton.getBoundingClientRect();
        const wrapperStyles = window.getComputedStyle(wrapper);
        const paddingLeft = parseFloat(wrapperStyles.paddingLeft) || 0;

        const targetScrollLeft =
          wrapper.scrollLeft +
          buttonRect.left -
          wrapperRect.left -
          paddingLeft;

        wrapper.scrollTo({
          left: targetScrollLeft,
          behavior,
        });
      });
    } else {
      if (endIndex === buttons.length - 1 && activeIndex >= buttons.length - 3) {
        requestAnimationFrame(() => {
          const wrapperRect = wrapper.getBoundingClientRect();
          const buttonRect = endButton.getBoundingClientRect();
          const wrapperStyles = window.getComputedStyle(wrapper);
          const paddingRight = parseFloat(wrapperStyles.paddingRight) || 0;

          const targetScrollRight =
            wrapper.scrollLeft +
            buttonRect.right -
            wrapperRect.right +
            paddingRight;

          wrapper.scrollTo({
            left: targetScrollRight,
            behavior,
          });
        });
      } else {

        requestAnimationFrame(() => {
          const wrapperRect = wrapper.getBoundingClientRect();
          const startRect = startButton.getBoundingClientRect();
          const endRect = endButton.getBoundingClientRect();

          const windowCenter = (startRect.left + endRect.right) / 2;
          const wrapperCenter = (wrapperRect.left + wrapperRect.right) / 2;

          const targetScrollLeft =
            wrapper.scrollLeft + windowCenter - wrapperCenter;

          wrapper.scrollTo({
            left: targetScrollLeft,
            behavior,
          });
        });
      }
    }
  }

  /**
   * activates the button at `index`, updating the preview and button states.
   * @param index the slide that should be active
   * @returns nothing
   */
  function setActive(index: number): void {
    const nextIndex = clampIndex(index, items.length);
    if (nextIndex === activeIndex && buttons[nextIndex]?.classList.contains(BUTTON_ACTIVE_CLASS)) {
      return;
    }
    const previousButton = buttons[activeIndex];
    if (previousButton) {
      previousButton.classList.remove(BUTTON_ACTIVE_CLASS);
      previousButton.setAttribute("aria-pressed", "false");
    }
    activeIndex = nextIndex;
    const nextButton = buttons[activeIndex];
    if (nextButton) {
      nextButton.classList.add(BUTTON_ACTIVE_CLASS);
      nextButton.setAttribute("aria-pressed", "true");
    }
    renderPreview(activeIndex);
    //centers button to enable scrolling


    updateEdgeButtons(activeIndex, buttons);
    scrollToFiveButtonWindow(activeIndex);
  }

  let destroyed = false;

  return {
    goTo(index: number) {
      if (destroyed) return;
      setActive(index);
    },
    next() {
      if (destroyed) return;
      setActive(activeIndex + 1);
    },
    previous() {
      if (destroyed) return;
      setActive(activeIndex - 1);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abortController.abort();
      if (root.parentNode) {
        root.parentNode.removeChild(root);
      }
      buttons.length = 0;
    },
  };



}

function updateEdgeButtons(activeIndex: number, buttons: HTMLButtonElement[]): void {
  buttons.forEach((button) => {
    button.classList.remove(
      "button-carousel-button--edge",
      "button-carousel-button--edge-start",
      "button-carousel-button--edge-end",
      "button-carousel-button--edge-start-start",
      "button-carousel-button--edge-end-end"
    );
  });

  if (buttons.length < 5) {
    return;
  }

  const maxStartIndex = buttons.length - 5;
  const startIndex = Math.max(0, Math.min(activeIndex - 2, maxStartIndex));
  const endIndex = startIndex + 4;

  const startButton = buttons[startIndex];
  const endButton = buttons[endIndex];

  if (startIndex != 0) {
    startButton.classList.add(
      "button-carousel-button--edge",
      "button-carousel-button--edge-start"
    );
  }

  if (endIndex != buttons.length - 1) {
    endButton.classList.add(
      "button-carousel-button--edge",
      "button-carousel-button--edge-end"
    );
  }
  //if the active index is less than or equal to 2 it guarentees that the end button is not visible
  //we also simultaneously know that the start button is visible
  //Scrolling behavior prioritizes the start button according to implementation (scroll checks beginning first) unable to change it to make it obvious
  if (startIndex === 0 && activeIndex <= 2) {

    buttons[endIndex - 1].classList.add("button-carousel-button--edge-end-end");
    buttons[endIndex - 1].classList.add("button-carousel-button--edge-end");
  }
  //if the active index is greater than 2 it guarentees that the start button is not visible Meaning we can't transform the start button
  //if the active index is less than buttons.length - 3 it guarentees that the end button is visible
  if (endIndex === buttons.length - 1 && activeIndex >= buttons.length - 3 && activeIndex > 2) {
    buttons[startIndex + 1].classList.add("button-carousel-button--edge-start-start");
    buttons[startIndex + 1].classList.add("button-carousel-button--edge-start");
  }
}



