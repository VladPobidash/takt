/**
 * Fits the app to the part of the screen that is really visible.
 *
 * - iOS does not shrink the page when the keyboard opens — only the *visual* viewport gets
 *   smaller, so anything at the bottom of a full-height layout ends up behind the keyboard.
 *   The app root is therefore sized and placed after `window.visualViewport`.
 * - iOS 26 and later blur the top of an installed web app for about 40 pt below the status
 *   bar, and nothing switches that off. The header is moved below that band.
 */

/** Height kept free at the top of an installed app on iOS 26+, in CSS pixels. */
export const TOP_FADE_PX = 32;
/** A visual viewport this much shorter than the layout means a keyboard, not a toolbar. */
const KEYBOARD_MIN_PX = 150;
/** Below this height an iPhone is in landscape, where there is no status bar and no blur. */
const STATUS_BAR_MIN_HEIGHT_PX = 500;

export function topFade(device: {
  appleMobile: boolean;
  standalone: boolean;
  /** The system draws the blurred band: iOS 26 or later. */
  blursTop: boolean;
  viewportHeight: number;
}): number {
  const applies =
    device.appleMobile &&
    device.standalone &&
    device.blursTop &&
    device.viewportHeight >= STATUS_BAR_MIN_HEIGHT_PX;
  return applies ? TOP_FADE_PX : 0;
}

export interface ViewportMetrics {
  /** Height of the visible area the app should fill. */
  height: number;
  /** How far the visible area starts below the top of the layout viewport. */
  top: number;
  /** How much of the layout viewport's bottom is covered by the keyboard. */
  keyboardInset: number;
  keyboardOpen: boolean;
}

export function viewportMetrics(
  layoutHeight: number,
  visual: { height: number; offsetTop: number },
): ViewportMetrics {
  const keyboardOpen = layoutHeight - visual.height > KEYBOARD_MIN_PX;
  if (!keyboardOpen) {
    // iOS 26 can leave a stale offset behind after the keyboard closes: ignore it.
    return { height: visual.height, top: 0, keyboardInset: 0, keyboardOpen: false };
  }
  return {
    height: visual.height,
    top: visual.offsetTop,
    keyboardInset: Math.max(0, layoutHeight - visual.height - visual.offsetTop),
    keyboardOpen: true,
  };
}

/** Keeps the CSS variables `--app-height`, `--app-top`, `--keyboard-inset` and `--top-fade` up to date. */
export function trackViewport(device: { appleMobile: boolean; standalone: boolean }): void {
  const root = document.documentElement;
  const visual = window.visualViewport;
  // CSS anchor positioning arrived in Safari 26, together with the blurred band.
  const blursTop = typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");

  const update = () => {
    root.style.setProperty(
      "--top-fade",
      `${topFade({ ...device, blursTop, viewportHeight: window.innerHeight })}px`,
    );
    if (!visual) return;
    const metrics = viewportMetrics(window.innerHeight, visual);
    root.style.setProperty("--app-height", `${metrics.height}px`);
    root.style.setProperty("--app-top", `${metrics.top}px`);
    root.style.setProperty("--keyboard-inset", `${metrics.keyboardInset}px`);
    root.toggleAttribute("data-keyboard", metrics.keyboardOpen);
    // With the keyboard closed the page must sit at the top again.
    if (!metrics.keyboardOpen && window.scrollY !== 0) window.scrollTo(0, 0);
  };

  visual?.addEventListener("resize", update);
  visual?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  update();
}
