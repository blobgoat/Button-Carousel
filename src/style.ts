/**
 * Default styling for the button-carousel package.
 *
 * All class names are prefixed with `button-carousel-` to avoid clashing
 * with consumer styles. The stylesheet is injected once per page via
 * `createButtonCarousel` (see src/index.ts), guarded by `BUTTON_CAROUSEL_STYLE_ID`.
 */
import style from "./style.css?raw";
export const BUTTON_CAROUSEL_STYLE_ID = "button-carousel-styles";

export const buttonCarouselStyles: string = style;