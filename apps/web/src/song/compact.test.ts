import { describe, expect, test } from "vitest";
import { compactColumns } from "./compact.ts";

const lines = (...lengths: number[]) =>
  lengths.map((length) => ({ bars: Array.from({ length }, () => ({}) as never) }));

describe("compactColumns", () => {
  test("a section gets as many columns as its longest line has bars", () => {
    expect(compactColumns(lines(3, 3, 3, 3))).toBe(3);
    expect(compactColumns(lines(5, 5))).toBe(5);
    expect(compactColumns(lines(4, 5))).toBe(5);
    expect(compactColumns(lines(7, 7))).toBe(7);
    expect(compactColumns(lines(1))).toBe(1);
  });

  test("more than eight bars are split into equal rows", () => {
    expect(compactColumns(lines(8))).toBe(8);
    expect(compactColumns(lines(9))).toBe(5);
    expect(compactColumns(lines(12))).toBe(6);
    expect(compactColumns(lines(16))).toBe(8);
    expect(compactColumns(lines(17))).toBe(6);
  });

  test("a section without bars still has one column", () => {
    expect(compactColumns([])).toBe(1);
    expect(compactColumns(lines(0))).toBe(1);
  });
});
