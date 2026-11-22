import { parseKey } from "@takt/format";
import { describe, expect, test } from "vitest";
import {
  addSong,
  entryForm,
  entryKeyFor,
  formatSetlist,
  move,
  newSetlistText,
  readEntryKey,
  readSetlist,
  removeAt,
  setEntryForm,
  setMeta,
  transposeFor,
  updateEntry,
} from "./model.ts";

const key = (text: string) => parseKey(text, "B");

describe("setlist text", () => {
  test("a new setlist records the date and the note naming", () => {
    const read = readSetlist(newSetlistText("Service", "2026-11-21", "H"), "B");
    expect(read).toMatchObject({ notation: "H", date: "2026-11-21" });
    expect(read.setlist.title).toBe("Service");
    expect(read.setlist.entries).toEqual([]);
  });

  test("without a notation line the device's naming applies", () => {
    expect(readSetlist("# S\n- a | key: B\n", "H").notation).toBe("H");
    expect(readSetlist("# S\ndate: someday\n", "B")).toMatchObject({ notation: "B", date: null });
  });

  test("editing writes the file back", () => {
    let { setlist } = readSetlist(newSetlistText("Service", "2026-11-21", "H"), "B");
    setlist = addSong(addSong(addSong(setlist, "a"), "b"), "c");
    setlist = move(setlist, 2, 0);
    setlist = updateEntry(setlist, 1, { key: "Hm", note: "no intro" });
    setlist = removeAt(setlist, 2);
    setlist = setMeta(setlist, "date", "2026-12-12");
    expect(formatSetlist(setlist)).toBe(
      "# Service\ndate: 2026-12-12\nnotation: H\n- c\n- a | key: Hm | > no intro\n",
    );
    expect(move(setlist, 0, 5)).toBe(setlist);
    expect(move(setlist, 0, -1)).toBe(setlist);
  });
});

describe("keys per entry", () => {
  test("transposeFor goes the shorter way", () => {
    expect(transposeFor(key("D"), key("E"))).toBe(2);
    expect(transposeFor(key("D"), key("C"))).toBe(-2);
    expect(transposeFor(key("D"), key("A"))).toBe(-5);
    expect(transposeFor(key("D"), key("Ab"))).toBe(6);
    expect(transposeFor(key("D"), key("D"))).toBe(0);
    expect(transposeFor(key("D"), null)).toBe(0);
    expect(transposeFor(key("D"), key("Em"))).toBe(0);
  });

  test("entryKeyFor writes the key in the setlist's naming, or nothing for the original key", () => {
    expect(entryKeyFor(key("A"), 1, "H")).toBe("B");
    expect(entryKeyFor(key("A"), 1, "B")).toBe("Bb");
    expect(entryKeyFor(key("A"), 2, "H")).toBe("H");
    expect(entryKeyFor(key("A"), 0, "H")).toBeNull();
    expect(entryKeyFor(key("A"), 12, "H")).toBeNull();
    expect(entryKeyFor(null, 2, "H")).toBeNull();
  });

  test("a stored key round-trips through the naming it was written in", () => {
    const stored = entryKeyFor(key("A"), 1, "H");
    expect(transposeFor(key("A"), readEntryKey({ key: stored }, "H"))).toBe(1);
  });
});

describe("the version of an entry", () => {
  const { setlist } = readSetlist("# S\n- a | key: D | form: без програшу\n- b\n", "B");

  test("is read from `form:`", () => {
    expect(setlist.entries.map(entryForm)).toEqual(["без програшу", null]);
  });

  test("is written back, and the main version leaves no trace", () => {
    const chosen = setEntryForm(setEntryForm(setlist, 1, "коротка"), 0, null);
    expect(formatSetlist(chosen)).toBe("# S\n- a | key: D\n- b | form: коротка\n");
  });
});
