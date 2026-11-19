import { expect, test } from "vitest";
import { FORMAT_VERSION } from "../src/index.ts";

test("reads format v0", () => {
  expect(FORMAT_VERSION).toBe(0);
});
