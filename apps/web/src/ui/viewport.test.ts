import { describe, expect, test } from "vitest";
import { TOP_FADE_PX, topFade, viewportMetrics } from "./viewport.ts";

describe("viewportMetrics", () => {
  test("without a keyboard the app fills the visible area from the top", () => {
    expect(viewportMetrics(844, { height: 844, offsetTop: 0 })).toEqual({
      height: 844,
      top: 0,
      keyboardInset: 0,
      keyboardOpen: false,
    });
  });

  test("a browser toolbar that hides part of the page is not a keyboard", () => {
    expect(viewportMetrics(844, { height: 760, offsetTop: 0 }).keyboardOpen).toBe(false);
  });

  test("with the keyboard open the app ends where the keyboard begins", () => {
    expect(viewportMetrics(844, { height: 470, offsetTop: 0 })).toEqual({
      height: 470,
      top: 0,
      keyboardInset: 374,
      keyboardOpen: true,
    });
  });

  test("when iOS scrolls the page to show the field, the app follows the visible area", () => {
    expect(viewportMetrics(844, { height: 470, offsetTop: 120 })).toEqual({
      height: 470,
      top: 120,
      keyboardInset: 254,
      keyboardOpen: true,
    });
  });

  test("a stale offset left after the keyboard closed is ignored", () => {
    expect(viewportMetrics(844, { height: 844, offsetTop: 96 })).toMatchObject({
      top: 0,
      keyboardInset: 0,
    });
  });
});

describe("topFade", () => {
  const installed = { appleMobile: true, standalone: true, blursTop: true, viewportHeight: 812 };

  test("an installed app on iOS 26 keeps the blurred band free", () => {
    expect(topFade(installed)).toBe(TOP_FADE_PX);
  });

  test("nowhere else", () => {
    expect(topFade({ ...installed, standalone: false })).toBe(0);
    expect(topFade({ ...installed, appleMobile: false })).toBe(0);
    expect(topFade({ ...installed, blursTop: false })).toBe(0);
    // An iPhone in landscape has no status bar.
    expect(topFade({ ...installed, viewportHeight: 390 })).toBe(0);
  });
});
