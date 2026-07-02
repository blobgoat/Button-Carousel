/**
 * Default styling for the button-carousel package.
 *
 * All class names are prefixed with `button-carousel-` to avoid clashing
 * with consumer styles. The stylesheet is injected once per page via
 * `createButtonCarousel` (see src/index.ts), guarded by `BUTTON_CAROUSEL_STYLE_ID`.
 */

export const BUTTON_CAROUSEL_STYLE_ID = "button-carousel-styles";

export const buttonCarouselStyles = `
.button-carousel-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.button-carousel-preview {
  width: min(720px, 100%);
  aspect-ratio: 16 / 9;
  border-radius: 28px;
  overflow: hidden;
  background: #111;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-carousel-preview-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.button-carousel-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 8px 4px;
  margin: 0;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scroll-behavior: smooth;
  list-style: none;
}

.button-carousel-container::-webkit-scrollbar {
  height: 6px;
}

.button-carousel-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 999px;
}

.button-carousel-button {
  position: relative;
  flex: 0 0 auto;
  width: 220px;
  height: 110px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  background-color: transparent;
  box-shadow: 0 15px 4px rgba(0, 0, 0, 0.25);
  transform: translateY(0) scale(1);
  transition: box-shadow 320ms ease, transform 320ms ease;
  -webkit-tap-highlight-color: transparent;
}

.button-carousel-button:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.6);
  outline-offset: 3px;
}

.button-carousel-button--active {
  box-shadow: inset 0 15px 4px rgba(0, 0, 0, 0.25);
  transform: translateY(1px) scale(0.97);
}

.button-carousel-media {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1;
  transition: opacity 320ms ease;
  pointer-events: none;
}

.button-carousel-button--active .button-carousel-media {
  opacity: 0.25;
}

@media (max-width: 640px) {
  .button-carousel-container {
    gap: 10px;
    padding: 6px 2px;
  }

  .button-carousel-button {
    width: 140px;
    height: 74px;
  }
}
`;
