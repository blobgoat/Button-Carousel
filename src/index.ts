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
    return button;
  });

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

