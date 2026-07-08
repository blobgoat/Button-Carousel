/**
 * Default styling for the button-carousel package.
 *
 * All class names are prefixed with `button-carousel-` to avoid clashing
 * with consumer styles. The stylesheet is injected once per page via
 * `createButtonCarousel` (see src/index.ts), guarded by `BUTTON_CAROUSEL_STYLE_ID`.
 *
 * `./generated-style` is produced from src/style.css by
 * scripts/generate-css.mjs (run before build/dev/example:dev — see
 * package.json) rather than imported directly, so the CSS text works
 * identically under tsup (production build) and Vite (the example app,
 * which loads this file straight from source). See generate-css.mjs for why
 * a direct `.css` import isn't portable across those two bundlers.
 */
import { cssText } from "./generated-style";
export const BUTTON_CAROUSEL_STYLE_ID = "button-carousel-styles";

export const buttonCarouselStyles: string = cssText;