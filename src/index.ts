import { buttonCarouselStyles, BUTTON_CAROUSEL_STYLE_ID } from "./style";

/**
 * Attribution shown under the media in the full-screen (lightbox) view.
 *
 * Pass a plain string (`"Photo by Jane Doe"`) or an object to add links and
 * a longer description:
 * `{ text: "Photo by Jane Doe", href: "https://...", license: "CC BY 4.0", licenseHref: "https://...", blurb: "..." }`.
 * Clicking the media in the lightbox opens a details panel over it with the
 * full attribution. All text is inserted as text, never as HTML.
 */
export type ButtonCarouselCredit =
  | string
  | {
    /** The attribution text, e.g. "Photo by Jane Doe on Unsplash". */
    text: string;
    /** Optional link for the attribution text (opens in a new tab). */
    href?: string;
    /** Optional license name, e.g. "CC BY 4.0". */
    license?: string;
    /** Optional link for the license (opens in a new tab). */
    licenseHref?: string;
    /**
     * Optional longer attribution details (source, date, modifications made,
     * etc.), shown in the details panel when the media is clicked in the
     * lightbox. Line breaks are preserved.
     */
    blurb?: string;
  };

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
    credit?: ButtonCarouselCredit;
  }
  | {
    type: "gif";
    src: string;
    alt?: string;
    credit?: ButtonCarouselCredit;
  }
  | {
    type: "video";
    src: string;
    alt?: string;
    poster?: string;
    credit?: ButtonCarouselCredit;
    start?: number;
    end?: number;
    pStart?: number;
    pEnd?: number;
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

/**
 * An object returned by `createButtonCarousel` that allows programmatic control of the carousel.
 */
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
const ROOT_SINGLE_CLASS: string = "button-carousel-root--single";
const PREVIEW_CLASS: string = "button-carousel-preview";
const PREVIEW_MEDIA_CLASS: string = "button-carousel-preview-media";
const LIGHTBOX_CLASS: string = "button-carousel-lightbox";
const LIGHTBOX_OPEN_CLASS: string = "button-carousel-lightbox--open";
const LIGHTBOX_MEDIA_CLASS: string = "button-carousel-lightbox-media";
const LIGHTBOX_CLOSE_CLASS: string = "button-carousel-lightbox-close";
const LIGHTBOX_FIGURE_CLASS: string = "button-carousel-lightbox-figure";
const LIGHTBOX_FIGURE_CREDITED_CLASS: string = "button-carousel-lightbox-figure--credited";
const LIGHTBOX_CREDIT_CLASS: string = "button-carousel-lightbox-credit";
const LIGHTBOX_STAGE_CLASS: string = "button-carousel-lightbox-stage";
const LIGHTBOX_STAGE_INTERACTIVE_CLASS: string = "button-carousel-lightbox-stage--interactive";
const LIGHTBOX_DETAILS_OPEN_CLASS: string = "button-carousel-lightbox-stage--details-open";
const LIGHTBOX_DETAILS_CLASS: string = "button-carousel-lightbox-details";
const LIGHTBOX_INFO_BADGE_CLASS: string = "button-carousel-lightbox-info";
const LIGHTBOX_TRANSITION_MS: number = 250;
let lightboxIdCounter: number = 0;

/**
 * Injects the package's default stylesheet into `<head>` exactly once per
 * document, regardless of how many carousel instances are created.
 */
function injectStyles(): void {
  const existingStyle = document.getElementById(
    BUTTON_CAROUSEL_STYLE_ID
  ) as HTMLStyleElement | null;

  if (existingStyle) {
    existingStyle.textContent = buttonCarouselStyles;
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
/**
 * Clamps an index to the valid range [0, length).
 * @param index @type number The index to clamp
 * @param length @type number The length of the array
 * @returns @type number The clamped index
 */
function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

/** Creates a link that opens in a new tab, or a plain span if `href` is missing. */
function createCreditPart(text: string, href?: string): HTMLElement {
  if (href) {
    const link: HTMLAnchorElement = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text;
    return link;
  }
  const span: HTMLSpanElement = document.createElement("span");
  span.textContent = text;
  return span;
}

/**
 * Builds the attribution caption for the lightbox, or returns null if the
 * item has no (non-empty) credit.
 */
function createCreditElement(credit: ButtonCarouselCredit | undefined): HTMLElement | null {
  if (credit === undefined || credit === null) return null;

  const normalized = typeof credit === "string" ? { text: credit } : credit;
  const text = (normalized.text ?? "").trim();
  const license = (("license" in normalized ? normalized.license : undefined) ?? "").trim();
  if (!text && !license) return null;

  const caption: HTMLElement = document.createElement("figcaption");
  caption.className = LIGHTBOX_CREDIT_CLASS;

  if (text) {
    caption.appendChild(createCreditPart(text, "href" in normalized ? normalized.href : undefined));
  }
  if (license) {
    if (text) caption.appendChild(document.createTextNode(" \u00b7 "));
    caption.appendChild(createCreditPart(license, "licenseHref" in normalized ? normalized.licenseHref : undefined));
  }
  return caption;
}

/**
 * Builds the attribution details panel shown over the media in the lightbox,
 * or returns null if the item has no credit.
 */
function createCreditDetailsElement(credit: ButtonCarouselCredit | undefined): HTMLElement | null {
  if (credit === undefined || credit === null) return null;

  const normalized = typeof credit === "string" ? { text: credit } : credit;
  const text = (normalized.text ?? "").trim();
  const href = "href" in normalized ? normalized.href : undefined;
  const license = (("license" in normalized ? normalized.license : undefined) ?? "").trim();
  const licenseHref = "licenseHref" in normalized ? normalized.licenseHref : undefined;
  const blurb = (("blurb" in normalized ? normalized.blurb : undefined) ?? "").trim();
  if (!text && !license && !blurb) return null;

  const panel: HTMLElement = document.createElement("div");
  panel.className = LIGHTBOX_DETAILS_CLASS;

  const heading: HTMLElement = document.createElement("p");
  heading.className = `${LIGHTBOX_DETAILS_CLASS}-heading`;
  heading.textContent = "Attribution";
  panel.appendChild(heading);

  if (text) {
    const title: HTMLElement = document.createElement("p");
    title.className = `${LIGHTBOX_DETAILS_CLASS}-title`;
    title.appendChild(createCreditPart(text, href));
    panel.appendChild(title);
  }

  if (blurb) {
    const body: HTMLElement = document.createElement("p");
    body.className = `${LIGHTBOX_DETAILS_CLASS}-blurb`;
    body.textContent = blurb;
    panel.appendChild(body);
  }

  if (license) {
    const licenseLine: HTMLElement = document.createElement("p");
    licenseLine.className = `${LIGHTBOX_DETAILS_CLASS}-license`;
    licenseLine.appendChild(document.createTextNode("License: "));
    licenseLine.appendChild(createCreditPart(license, licenseHref));
    panel.appendChild(licenseLine);
  }

  if (href) {
    const sourceLine: HTMLElement = document.createElement("p");
    sourceLine.className = `${LIGHTBOX_DETAILS_CLASS}-source`;
    sourceLine.appendChild(createCreditPart("View original source \u2197", href));
    panel.appendChild(sourceLine);
  }

  return panel;
}

function createMediaElement(
  item: ButtonCarouselItem,
  className: string = MEDIA_CLASS, preview: boolean = false
): HTMLImageElement | HTMLVideoElement {
  if (item.type === "video") {
    const video: HTMLVideoElement = document.createElement("video");
    video.className = className;
    video.src = item.src;
    video.muted = true;
    //.loop doesnt work
    video.autoplay = true;
    video.playsInline = true;
    const loopStart: number = preview ? (item.pStart ?? 0) : (item.start ?? 0);
    const loopEnd: number = preview ? (item.pEnd ?? video.duration) : (item.end ?? video.duration);


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

    video.addEventListener("loadedmetadata", () => {
      const safeStart = Math.max(0, loopStart);
      const safeEnd = loopEnd ?? video.duration;

      if (safeStart < safeEnd) {
        video.currentTime = safeStart;
      }
    });

    video.addEventListener("timeupdate", () => {
      const safeStart = Math.max(0, loopStart);
      const safeEnd = loopEnd ?? video.duration;

      if (safeStart >= safeEnd) {
        return;
      }

      if (video.currentTime >= safeEnd) {
        video.currentTime = safeStart;
        video.play().catch(() => {
          // Autoplay/playback may fail in some browsers.
        });
      }
    });

    video.addEventListener("ended", () => {
      const safeStart = Math.max(0, loopStart);
      video.currentTime = safeStart;
      video.play().catch(() => { });
    });

    return video;
  }

  const img: HTMLImageElement = document.createElement("img");
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

  let activeIndex: number = clampIndex(options.initialIndex ?? 0, items.length);

  const abortController: AbortController = new AbortController();

  const root: HTMLElement = document.createElement("div");
  root.className = ROOT_CLASS;

  const preview: HTMLElement = document.createElement("div");
  preview.className = PREVIEW_CLASS;
  // The preview opens the focused (lightbox) view of the active item.
  preview.setAttribute("role", "button");
  preview.setAttribute("tabindex", "0");
  preview.setAttribute("aria-label", "View full size");
  preview.addEventListener("click", () => openLightbox(activeIndex), {
    signal: abortController.signal,
  });
  preview.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(activeIndex);
      }
    },
    { signal: abortController.signal }
  );

  const wrapper: HTMLElement = document.createElement("div");
  wrapper.className = CONTAINER_CLASS;

  root.appendChild(preview);
  root.appendChild(wrapper);

  // With a single item there's nothing to choose between, so hide the
  // button bar (the button stays in the DOM, just not displayed).
  if (items.length <= 1) {
    root.classList.add(ROOT_SINGLE_CLASS);
  }

  const buttons: HTMLButtonElement[] = items.map((item, index) => {
    if (item === undefined || item === null) {
      throw new Error(`Invalid item at index ${index}: ${item}`);
    }
    //console.log(`Creating button for item at index ${index}:`, item);
    const button: HTMLButtonElement = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");

    const media: HTMLImageElement | HTMLVideoElement = createMediaElement(item);
    button.appendChild(media);

    button.addEventListener(
      "click",
      () => {
        // Clicking the already-active button focuses its media; any other
        // button just becomes active.
        if (index === activeIndex) {
          openLightbox(index);
        } else {
          setActive(index);
        }
      },
      { signal: abortController.signal }
    );

    if (index === activeIndex) {
      button.classList.add(BUTTON_ACTIVE_CLASS);
    }

    wrapper.appendChild(button);
    // console.log(`Button created for item at index ${index}:`, button);
    // console.log("root appended:", container.contains(root));
    // console.log("wrapper children:", wrapper.children.length);
    return button;
  });

  if (buttons.length < 5) {
    //need to center the buttons on the screen
    wrapper.style.justifyContent = "center";
  }
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

    const previewMedia: HTMLImageElement | HTMLVideoElement = createMediaElement(item, PREVIEW_MEDIA_CLASS, true);
    preview.appendChild(previewMedia);

    if (previewMedia instanceof HTMLVideoElement) {
      previewMedia.play().catch(() => {
        // Autoplay can fail in some browsers. Muted autoplay usually works.
      });
    }
  }

  // ---- Lightbox: focused, uncropped view with a blurred backdrop ----
  let lightbox: HTMLElement | null = null;
  let lightboxCloseTimer: number | undefined;
  let lightboxReturnFocus: HTMLElement | null = null;
  let previousRootOverflow: string = "";

  // Set while the lightbox shows an item with attribution details.
  let setLightboxDetailsOpen: ((open: boolean) => void) | null = null;
  let lightboxDetailsOpen: boolean = false;

  function onLightboxKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      // First Escape closes the details panel, the next closes the lightbox.
      if (lightboxDetailsOpen && setLightboxDetailsOpen) {
        setLightboxDetailsOpen(false);
      } else {
        closeLightbox();
      }
    }
  }

  /**
   * Opens a full-screen overlay showing the item at `index` uncropped,
   * with the rest of the page blurred behind it.
   */
  function openLightbox(index: number): void {
    const item = items[index];
    if (!item) return;

    if (lightbox) {
      removeLightbox();
    }

    lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const overlay: HTMLElement = document.createElement("div");
    overlay.className = LIGHTBOX_CLASS;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", item.alt || "Media viewer");

    const figure: HTMLElement = document.createElement("figure");
    figure.className = LIGHTBOX_FIGURE_CLASS;

    // The "stage" wraps the media so the details panel can sit over it.
    const stage: HTMLElement = document.createElement("div");
    stage.className = LIGHTBOX_STAGE_CLASS;
    // Clicks on the media itself shouldn't close the overlay.
    stage.addEventListener("click", (event) => event.stopPropagation());

    const media: HTMLImageElement | HTMLVideoElement = createMediaElement(item, LIGHTBOX_MEDIA_CLASS, true);
    stage.appendChild(media);

    lightboxDetailsOpen = false;
    setLightboxDetailsOpen = null;

    const details: HTMLElement | null = createCreditDetailsElement(item.credit);
    if (details) {
      const detailsId = `button-carousel-lightbox-details-${++lightboxIdCounter}`;
      details.id = detailsId;
      details.setAttribute("aria-hidden", "true");

      const badge: HTMLElement = document.createElement("span");
      badge.className = LIGHTBOX_INFO_BADGE_CLASS;
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "i";

      stage.classList.add(LIGHTBOX_STAGE_INTERACTIVE_CLASS);
      stage.setAttribute("role", "button");
      stage.setAttribute("tabindex", "0");
      stage.setAttribute("aria-controls", detailsId);
      stage.setAttribute("aria-expanded", "false");
      stage.setAttribute("aria-label", "Show attribution details");
      stage.appendChild(badge);
      stage.appendChild(details);

      const setOpen = (open: boolean): void => {
        lightboxDetailsOpen = open;
        stage.classList.toggle(LIGHTBOX_DETAILS_OPEN_CLASS, open);
        stage.setAttribute("aria-expanded", open ? "true" : "false");
        stage.setAttribute("aria-label", open ? "Hide attribution details" : "Show attribution details");
        details.setAttribute("aria-hidden", open ? "false" : "true");
        // Links in the panel are only reachable by keyboard while it's open.
        details.querySelectorAll("a").forEach((link) => {
          link.tabIndex = open ? 0 : -1;
        });
      };
      setOpen(false);
      setLightboxDetailsOpen = setOpen;

      stage.addEventListener("click", (event) => {
        // Let links inside the panel work without toggling it.
        if ((event.target as Element | null)?.closest("a")) return;
        setOpen(!lightboxDetailsOpen);
      });
      stage.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.target !== stage) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(!lightboxDetailsOpen);
        }
      });
    }

    figure.appendChild(stage);

    const credit: HTMLElement | null = createCreditElement(item.credit);
    if (credit) {
      // Clicking the credit (e.g. a link) shouldn't close the overlay.
      credit.addEventListener("click", (event) => event.stopPropagation());
      figure.classList.add(LIGHTBOX_FIGURE_CREDITED_CLASS);
      figure.appendChild(credit);
    }

    const closeButton: HTMLButtonElement = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = LIGHTBOX_CLOSE_CLASS;
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\u00d7";

    overlay.appendChild(figure);
    overlay.appendChild(closeButton);
    overlay.addEventListener("click", () => closeLightbox());

    document.body.appendChild(overlay);
    document.addEventListener("keydown", onLightboxKeydown);

    previousRootOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    lightbox = overlay;

    if (media instanceof HTMLVideoElement) {
      media.play().catch(() => { });
    }

    // Next frame so the opacity/blur transition runs.
    requestAnimationFrame(() => {
      overlay.classList.add(LIGHTBOX_OPEN_CLASS);
    });
    closeButton.focus({ preventScroll: true });
  }

  /** Fades the lightbox out, then removes it. */
  function closeLightbox(): void {
    const overlay = lightbox;
    if (!overlay) return;
    overlay.classList.remove(LIGHTBOX_OPEN_CLASS);
    lightboxCloseTimer = window.setTimeout(removeLightbox, LIGHTBOX_TRANSITION_MS);
  }

  /** Immediately removes the lightbox and restores page state. */
  function removeLightbox(): void {
    if (lightboxCloseTimer !== undefined) {
      window.clearTimeout(lightboxCloseTimer);
      lightboxCloseTimer = undefined;
    }
    if (!lightbox) return;
    lightbox.remove();
    lightbox = null;
    lightboxDetailsOpen = false;
    setLightboxDetailsOpen = null;
    document.removeEventListener("keydown", onLightboxKeydown);
    document.documentElement.style.overflow = previousRootOverflow;
    if (lightboxReturnFocus && lightboxReturnFocus.isConnected) {
      lightboxReturnFocus.focus({ preventScroll: true });
    }
    lightboxReturnFocus = null;
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
      //console.log("buttons.length < 5, no need to scroll, buttons =", buttons.length);
      return;
    }
    //console.log("scrollToFiveButtonWindow called with activeIndex =", activeIndex);
    //console.log("buttons.length =", buttons.length);
    //console.log("Buttons:", buttons.map((btn, idx) => `Index ${idx}: ${btn.className}`));

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
      removeLightbox();
      abortController.abort();
      if (root.parentNode) {
        root.parentNode.removeChild(root);
      }
      buttons.length = 0;
    },
  };



}

function updateEdgeButtons(activeIndex: number, buttons: HTMLButtonElement[]): void {
  console.log("updateEdgeButtons called with activeIndex =", activeIndex);
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
  console.log("buttons.length >= 5, calculating edge buttons");

  const maxStartIndex = buttons.length - 5;
  const startIndex = Math.max(0, Math.min(activeIndex - 2, maxStartIndex));
  const endIndex = startIndex + 4;

  const startButton = buttons[startIndex];
  const endButton = buttons[endIndex];

  if (startIndex != 0) {
    console.log("Adding edge classes to start button at index", startIndex);
    startButton.classList.add(
      "button-carousel-button--edge",
      "button-carousel-button--edge-start"
    );
  }

  if (endIndex != buttons.length - 1) {
    console.log("Adding edge classes to end button at index", endIndex);
    endButton.classList.add(
      "button-carousel-button--edge",
      "button-carousel-button--edge-end"
    );
  }
  //if the active index is less than or equal to 2 it guarentees that the end button is not visible
  //we also simultaneously know that the start button is visible
  //Scrolling behavior prioritizes the start button according to implementation (scroll checks beginning first) unable to change it to make it obvious
  if (startIndex === 0 && activeIndex <= 2) {
    console.log("Adding edge classes to end button at index", endIndex - 1);
    buttons[endIndex - 1].classList.add("button-carousel-button--edge-end-end");
    buttons[endIndex - 1].classList.add("button-carousel-button--edge-end");
  }
  //if the active index is greater than 2 it guarentees that the start button is not visible Meaning we can't transform the start button
  //if the active index is less than buttons.length - 3 it guarentees that the end button is visible
  if (endIndex === buttons.length - 1 && activeIndex >= buttons.length - 3 && activeIndex > 2) {
    console.log("Adding edge classes to start button at index", startIndex + 1);
    buttons[startIndex + 1].classList.add("button-carousel-button--edge-start-start");
    buttons[startIndex + 1].classList.add("button-carousel-button--edge-start");
  }
}



