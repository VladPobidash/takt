import { parse, resolveSong } from "@takt/format";
import { describe, expect, test } from "vitest";
import { buildTimeline, secondsPerBeat, sectionStart, stepAt } from "./playback.ts";

const song = resolveSong(
  parse(`# T
time: 4/4
## Intro x2
| D | A |
## Verse
| D | A** | % | |
| G | (2x)
## Chorus = Intro
`).doc,
);
const timeline = buildTimeline(song);

describe("buildTimeline", () => {
  test("a named version is played in its order, with its repeats, without knowing about forms", () => {
    const short = resolveSong(
      parse("# T\nform short: Chorus x1, Intro\n## Intro x2\n| D |\n## Chorus = Intro\n").doc,
      { form: "short" },
    );
    expect(buildTimeline(short).steps.map((s) => `${s.section}:${s.pass}/${s.passes}`)).toEqual([
      "0:1/1",
      "1:1/2",
      "1:2/2",
    ]);
    expect(short.sections.map((s) => s.index)).toEqual([0, 1]);
  });

  test("unrolls section repeats, line repeats and reused sections", () => {
    expect(
      timeline.steps.map((s) => `${s.section}:${s.pass}/${s.passes}:${s.bar}/${s.bars}`),
    ).toEqual([
      "0:1/2:1/2",
      "0:1/2:2/2",
      "0:2/2:1/2",
      "0:2/2:2/2",
      "1:1/1:1/6",
      "1:1/1:2/6",
      "1:1/1:3/6",
      "1:1/1:4/6",
      "1:1/1:5/6",
      "1:1/1:6/6",
      "2:1/2:1/2",
      "2:1/2:2/2",
      "2:2/2:1/2",
      "2:2/2:2/2",
    ]);
  });

  test("a short bar is short; empty and repeat bars are full bars", () => {
    const verse = timeline.steps.filter((s) => s.section === 1);
    expect(verse.map((s) => s.beats)).toEqual([4, 2, 4, 4, 4, 4]);
    expect(timeline.totalBeats).toBe(16 + 22 + 16);
  });
});

describe("stepAt", () => {
  test("finds the bar for a beat", () => {
    expect(stepAt(timeline, 0)).toMatchObject({ section: 0, pass: 1, bar: 1 });
    expect(stepAt(timeline, 7.9)).toMatchObject({ section: 0, pass: 1, bar: 2 });
    expect(stepAt(timeline, 8)).toMatchObject({ section: 0, pass: 2, bar: 1 });
    expect(stepAt(timeline, 16)).toMatchObject({ section: 1, bar: 1 });
    expect(stepAt(timeline, 20)).toMatchObject({ section: 1, bar: 2, beats: 2 });
    expect(stepAt(timeline, 22)).toMatchObject({ section: 1, bar: 3 });
    expect(stepAt(timeline, timeline.totalBeats - 0.01)).toMatchObject({
      section: 2,
      pass: 2,
      bar: 2,
    });
  });

  test("nothing before the start or after the end", () => {
    expect(stepAt(timeline, -1)).toBeNull();
    expect(stepAt(timeline, timeline.totalBeats)).toBeNull();
    expect(stepAt(buildTimeline({ sections: [], time: song.time }), 0)).toBeNull();
  });

  test("sectionStart", () => {
    expect(sectionStart(timeline, 0)).toBe(0);
    expect(sectionStart(timeline, 1)).toBe(16);
    expect(sectionStart(timeline, 2)).toBe(38);
    expect(sectionStart(timeline, 9)).toBeNull();
  });
});

describe("secondsPerBeat", () => {
  test("simple time: the tempo counts beats", () => {
    expect(secondsPerBeat(120, { beats: 4, unit: 4 })).toBe(0.5);
    expect(secondsPerBeat(60, { beats: 3, unit: 4 })).toBe(1);
  });

  test("compound time: the tempo counts dotted quarters, a beat is an eighth", () => {
    expect(secondsPerBeat(60, { beats: 6, unit: 8 })).toBeCloseTo(1 / 3);
    expect(secondsPerBeat(40, { beats: 12, unit: 8 })).toBeCloseTo(0.5);
  });

  test("other eighth-note meters: the tempo counts quarters", () => {
    expect(secondsPerBeat(120, { beats: 7, unit: 8 })).toBe(0.25);
    expect(secondsPerBeat(120, { beats: 3, unit: 8 })).toBe(0.25);
  });
});
