import { describe, expect, test } from "vitest";
import { detectLanguage, translate } from "./index.ts";

describe("translate", () => {
  test("plain messages and placeholders", () => {
    expect(translate("en", "nav.library")).toBe("Library");
    expect(translate("uk", "nav.library")).toBe("Бібліотека");
  });

  test("English plurals", () => {
    expect(translate("en", "library.sections", { count: 1 })).toBe("1 section");
    expect(translate("en", "library.sections", { count: 7 })).toBe("7 sections");
  });

  test("Ukrainian plurals: one, few, many", () => {
    const sections = (count: number) => translate("uk", "library.sections", { count });
    expect(sections(1)).toBe("1 секція");
    expect(sections(3)).toBe("3 секції");
    expect(sections(5)).toBe("5 секцій");
    expect(sections(11)).toBe("11 секцій");
    expect(sections(21)).toBe("21 секція");
    expect(sections(22)).toBe("22 секції");
  });
});

describe("detectLanguage", () => {
  test("follows the browser's order of preference", () => {
    expect(detectLanguage(["uk-UA", "en-US"])).toBe("uk");
    expect(detectLanguage(["en-GB", "uk"])).toBe("en");
    expect(detectLanguage(["pl", "uk"])).toBe("uk");
    expect(detectLanguage(["de"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });
});
