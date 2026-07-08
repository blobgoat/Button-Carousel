# button-carousel

A lightweight, framework-agnostic button carousel for images, GIFs, and videos. Render a row of rounded, pill-shaped buttons — each filled with a photo, GIF, or looping video — and let people click between them like a segmented media picker.

`button-carousel` has no dependencies, works with plain DOM APIs, and doesn't require React, Vue, or any other framework.

## What it looks like

Clicking a button makes it active — its media dims and its shadow moves inward for a "pressed in" look, while inactive buttons keep a raised outer shadow. In addition when a button activates it scrolls to that button allowing the user to traverse the different images intutively
![A carrousel that is navigatable by clicking buttons is shown](./assets/goingThroughMedia.gif)


Due to using Flex properties it easily and intuitively fits onto a phone screen or a narrower container
![Navigating the carousel using the phone interface](./assets/phoneScreen.gif)

## Installation

```bash
npm install button-carousel
```

## Basic usage

```ts
import { createButtonCarousel } from "button-carousel";

const carousel = createButtonCarousel({
  container: document.querySelector("#carousel")!,
  items: [
    { type: "image", src: "/assets/image-1.jpg", alt: "Example image" },
    { type: "gif", src: "/assets/demo.gif", alt: "Example gif" },
    { type: "video", src: "/assets/demo.mp4", alt: "Example video", start:0, end:5 },
  ],
  initialIndex: 0,
});
```

Calling `createButtonCarousel` automatically injects the package's default CSS the first time it runs on a page (subsequent calls, even for other instances, reuse the same stylesheet — nothing is duplicated).

## Item types

Each entry in `items` is a `ButtonCarouselItem`, discriminated by `type`.

### Image

```ts
{ type: "image", src: "/assets/photo.jpg", alt: "A photo" }
```

`src` also accepts an "image-like object" shaped like `{ src: string }` (handy when passing through objects from a bundler or CMS without unwrapping them yourself):

```ts
{ type: "image", src: someImportedImage, alt: "A photo" }
// where someImportedImage is `{ src: "/assets/photo.jpg" }`
```

### GIF

```ts
{ type: "gif", src: "/assets/demo.gif", alt: "A looping gif" }
```

GIF items render with an `<img>`, same as images.

### Video

```ts
{ type: "video", src: "/assets/demo.mp4", alt: "A looping video", poster: "/assets/poster.jpg", start:0, end:2 }
```

Video items render with a `<video muted loop playsInline autoplay>`, so they behave like an animated GIF replacement.

In addition you can set a custom start and ending frame by inputting the value in seconds, if not inputted it defaults to the whole video.

## Active / pressed visual state

Clicking a button makes it the active, selected button — only one button is ever active at a time. When active:

- the button's media fill dims to roughly 20% opacity
- the button's shadow moves inward (an inset shadow), giving it a "pressed in" look
- inactive buttons keep an outer drop shadow and full opacity

Moving the selection between buttons transitions smoothly rather than snapping instantly.

## Preview panel

Above the row of buttons, `button-carousel` renders a larger 16:9 preview of whichever item is currently active. The preview updates automatically whenever the active button changes (via click, `goTo`, `next`, or `previous`), and video previews are (re)played automatically when they become active.

## Scrolling

- scrolling only works from pushing buttons
- <5 items: the buttons are centered in the container, no scrolling necessary.
- With 5 or more items, at the very beginning and end 4 items are shown with a deformed pill shape hinting that there is more. If it is inbetween the beginning and end, 5 buttons are visible at a time with ovals on either end indicating there are more images in either direction. 
- Selecting an item near either end of the list smoothly scrolls the button row so the active button stays in view. 

## API options

| Option         | Type                    | Required | Description                                          |
| -------------- | ----------------------- | -------- | ----------------------------------------------------- |
| `container`    | `HTMLElement`           | yes      | Element the carousel is mounted into.                 |
| `items`        | `ButtonCarouselItem[]`  | yes      | The media items to render, one button per item.       |
| `initialIndex` | `number`                | no       | Which item starts active/selected. Defaults to `0`.   |

## Returned instance

`createButtonCarousel` returns a `ButtonCarouselInstance`:

```ts
{
  goTo(index: number): void;
  next(): void;
  previous(): void;
  destroy(): void;
}
```

- **`goTo(index)`** — activate the button at `index` (clamped to the valid range).
- **`next()`** — activate the next button, if there is one.
- **`previous()`** — activate the previous button, if there is one.
- **`destroy()`** — remove all DOM elements and event listeners the carousel created. Safe to call more than once. Multiple carousels can exist on the same page simultaneously, and each manages its own selected index independently.

## Framework-agnostic

`button-carousel` is built entirely on native DOM APIs — no React, Vue, Svelte, or any other framework is required, and none are pulled in as dependencies. Use it from any frontend project (or no framework at all) with `npm install button-carousel` and a single function call.

## Example project

The `example/` folder contains a small Vite app demonstrating every mode: images only, a single image, a single video, a single GIF, mixed media, a 10-item mixed carousel that exercises the scrolling window described above, and dedicated 4/5/6-image sections showing the centered vs. windowed layouts side by side. It imports the package directly from `src/` via a Vite alias, so changes to the package source are reflected immediately during development:

```bash
npm run example:dev
```

![A gif showing all the example which are shown on the example website](./assets/scrollingExamples.gif)s
