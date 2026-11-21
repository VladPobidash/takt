import { expect, type Page, test } from "@playwright/test";

/** Fails the test on any uncaught error or console error. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test.describe("English UI", () => {
  test.use({ locale: "en-US", colorScheme: "dark" });

  test("the library lists the example songs and opens one", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole("link", { name: /Silent Night/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Вдячність/ })).toContainText("F#");
    await page.getByRole("link", { name: /Достойний Ти Один/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Достойний Ти Один");
    await expect(page.getByRole("region", { name: "Verse 1" })).toContainText("Asus4");
    await page.screenshot({ path: test.info().outputPath("song-dark-en.png") });
    expect(errors).toEqual([]);
  });

  test("search filters the list", async ({ page }) => {
    await page.goto("/library");
    await page.getByRole("searchbox").fill("silent");
    await expect(page.getByRole("link", { name: /Silent Night/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Достойний/ })).toHaveCount(0);
  });

  test("transposing changes the key and the chords", async ({ page }) => {
    await page.goto("/songs/dostoinyi-ty-odyn");
    const intro = page.getByRole("region", { name: "Intro" });
    await expect(intro).toContainText("Bm");
    await page.getByRole("button", { name: "Transpose up" }).click();
    await expect(intro).toContainText("Cm");
    await expect(page.getByRole("contentinfo")).toContainText("Eb");
  });
});

test.describe("view options", () => {
  test.use({ locale: "en-US", colorScheme: "light" });

  test("an option set for one song overrides the default and can be reset", async ({ page }) => {
    await page.goto("/songs/dostoinyi-ty-odyn");
    const dots = page.locator("[data-beat-dots]");
    await expect(dots.first()).toBeVisible();

    await page.getByRole("button", { name: "View options" }).click();
    const sheet = page.getByRole("dialog", { name: "View options" });
    await expect(sheet.getByText("Default everywhere").first()).toBeVisible();
    await sheet.getByRole("switch", { name: /Beat dots under chords/ }).uncheck();
    await expect(sheet.getByText("Set for this song")).toBeVisible();
    await expect(dots).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("view-options.png") });
    await sheet.getByRole("button", { name: "Close" }).click();

    // Another song still has its dots.
    await page.getByRole("link", { name: "Back" }).click();
    await page.getByRole("link", { name: /Silent Night/ }).click();
    await expect(dots.first()).toBeVisible();

    // Reset brings the inherited value back.
    await page.getByRole("link", { name: "Back" }).click();
    await page.getByRole("link", { name: /Достойний Ти Один/ }).click();
    await expect(dots).toHaveCount(0);
    await page.getByRole("button", { name: "View options" }).click();
    await sheet.getByRole("button", { name: "Reset" }).click();
    await expect(dots.first()).toBeVisible();

    // The everywhere level changes every song without an override.
    await sheet.getByRole("tab", { name: "Everywhere" }).click();
    await sheet.getByRole("switch", { name: /Band notes/ }).uncheck();
    await expect(page.getByRole("region", { name: "Verse 1" })).not.toContainText("keys only");
  });
});

test.describe("personal notes", () => {
  test.use({ locale: "en-US", colorScheme: "light" });

  test("a note on a bar stays on that bar after a restart and after the song is edited elsewhere", async ({
    page,
  }) => {
    await page.goto("/songs/dostoinyi-ty-odyn");
    const bridge = page.getByRole("region", { name: "Bridge" });
    await bridge.getByRole("button", { name: "Personal note, bar 4" }).click();
    const dialog = page.getByRole("dialog", { name: "Bar 4 · Bridge" });
    await dialog.getByRole("textbox", { name: "Personal note" }).fill("watch the drummer");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(bridge.getByRole("button", { name: "watch the drummer" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("personal-note.png") });

    await page.reload();
    await expect(bridge.getByRole("button", { name: "watch the drummer" })).toBeVisible();

    // A new section before the bridge does not move the note.
    await page.getByRole("button", { name: "View options" }).click();
    await page.getByRole("link", { name: "Edit the song" }).click();
    const text = page.getByRole("textbox", { name: "Song text" });
    await text.fill(
      (await text.inputValue()).replace("## Bridge", "## Tag\n| D | A |\n\n## Bridge"),
    );
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("region", { name: "Tag" })).toBeVisible();
    await expect(bridge.getByRole("button", { name: "watch the drummer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "watch the drummer" })).toHaveCount(1);

    // The view option hides personal notes; deleting removes the note.
    await page.getByRole("button", { name: "View options" }).click();
    const sheet = page.getByRole("dialog", { name: "View options" });
    await sheet.getByRole("switch", { name: /My personal notes/ }).uncheck();
    await expect(page.getByRole("button", { name: "watch the drummer" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Reset" }).click();
    await sheet.getByRole("button", { name: "Close" }).click();
    await bridge.getByRole("button", { name: "watch the drummer" }).click();
    await page
      .getByRole("dialog", { name: "Bar 4 · Bridge" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByRole("button", { name: "watch the drummer" })).toHaveCount(0);
  });
});

test.describe("auto-scroll", () => {
  test.use({ locale: "en-US", colorScheme: "light" });

  test("follows the song section by section and stops on request", async ({ page }) => {
    const errors = watchErrors(page);
    await page.clock.install();
    await page.goto("/songs/dostoinyi-ty-odyn");
    const status = page.getByRole("contentinfo").getByRole("status");
    await expect(status).toContainText("135 BPM");

    await page.getByRole("button", { name: "Start auto-scroll" }).click();
    await expect(status).toContainText("Count-in");
    // 135 BPM in 4/4: a bar lasts 1.78 s. One bar of count-in, then the intro.
    await page.clock.runFor(2500);
    await expect(status).toContainText("Intro");
    await expect(status).toContainText("bar 1 of 2 · pass 1 of 2");
    await expect(page.getByRole("region", { name: "Intro" })).toHaveAttribute(
      "aria-current",
      "step",
    );

    // The intro is 2 bars × 2; ten seconds later the first verse is playing.
    await page.clock.runFor(8000);
    await expect(status).toContainText("Verse 1");
    await expect(page.getByRole("region", { name: "Verse 1" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByRole("region", { name: "Intro" })).not.toHaveAttribute(
      "aria-current",
      "step",
    );

    // Tapping the timeline while playing continues from that section.
    await page
      .getByRole("navigation", { name: "Song form" })
      .getByRole("button", { name: "Bridge" })
      .click();
    await page.clock.runFor(300);
    await expect(status).toContainText("Bridge");
    await expect(status).toContainText("pass 1 of 4");
    await page.screenshot({ path: test.info().outputPath("auto-scroll.png") });

    await page.getByRole("button", { name: "Stop auto-scroll" }).click();
    await expect(status).toContainText("Auto-scroll");
    await expect(page.locator('section[aria-current="step"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("settings", () => {
  test.use({ locale: "en-US" });

  test("language and instrument are chosen from searchable lists", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/settings");
    await page.getByRole("combobox", { name: "Interface language" }).click();
    await page.getByRole("combobox", { name: "Search languages" }).fill("ukr");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.getByRole("option", { name: /Українська/ }).click();
    await expect(page.getByRole("button", { name: "Розділи" })).toContainText("Налаштування");

    await page.getByRole("combobox", { name: "Мій інструмент" }).click();
    await page.getByRole("combobox", { name: "Пошук інструмента" }).fill("гіт");
    await page.getByRole("option", { name: /Гітара/ }).click();
    await expect(page.getByRole("combobox", { name: "Мій інструмент" })).toContainText("Гітара");
    await page.screenshot({ path: test.info().outputPath("settings.png") });

    await page.getByRole("button", { name: "Розділи" }).click();
    await page.getByRole("menuitem", { name: "Бібліотека" }).click();
    await page.getByRole("link", { name: /Silent Night/ }).click();
    await expect(page.getByRole("tab", { name: "Гітара" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(errors).toEqual([]);
  });
});

test.describe("a song from the band's chart", () => {
  test.use({ locale: "uk-UA", colorScheme: "dark" });

  test("«Вдячність»: sections named the band's way, and D shapes with a capo on the fourth fret", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto("/songs/vdiachnist");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Вдячність");
    const form = page.getByRole("navigation", { name: "Форма пісні" });
    await expect(form.getByRole("button")).toHaveText([
      "I",
      "V1,2",
      "C",
      "I",
      "V3",
      "C2",
      "I",
      "B1",
      "B2",
      "B3",
      "Inst",
      "C3",
    ]);
    await expect(page.getByRole("region", { name: "3 Verse" })).toHaveAttribute(
      "data-section",
      "verse",
    );
    await expect(page.getByRole("region", { name: "1 Bridge" })).toHaveAttribute(
      "data-section",
      "bridge",
    );

    await page.getByRole("tab", { name: "Гітара" }).click();
    await expect(page.getByRole("button", { name: "4→D" })).toHaveAttribute("aria-pressed", "true");
    const verse = page.getByRole("region", { name: "1, 2 Verse" });
    await expect(verse).toContainText("Hm");
    await expect(verse).toContainText("D#m");
    await page.screenshot({ path: test.info().outputPath("vdiachnist-guitar.png") });
    expect(errors).toEqual([]);
  });
});

test.describe("a second song from the band's chart", () => {
  test.use({ locale: "uk-UA", colorScheme: "light" });

  test("«Боже, я вдячний Тобі»: empty sections borrow their bars; the chorus has Dmaj on the fourth beat", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto("/songs/bozhe-ia-vdiachnyi-tobi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Боже, я вдячний Тобі");
    const form = page.getByRole("navigation", { name: "Форма пісні" });
    await expect(form.getByRole("button")).toHaveText([
      "I",
      "V1",
      "C",
      "I",
      "V2",
      "C2",
      "Inst",
      "B",
      "C3",
    ]);

    // "Verse 2" and "Chorus 2" are written without bars in the chart.
    await expect(page.getByRole("region", { name: "Verse 2" })).toContainText("D/F#");
    const chorus2 = page.getByRole("region", { name: "Chorus 2" });
    await expect(chorus2).toContainText("×2");
    await expect(chorus2).toContainText("Dmaj");
    await expect(page.getByRole("region", { name: "Interludio" })).toContainText("пауза на такт");
    await page.getByRole("button", { name: "Компактний режим" }).click();
    await page.screenshot({ path: test.info().outputPath("bozhe-compact.png") });
    expect(errors).toEqual([]);
  });
});

test.describe("compact mode", () => {
  test.use({ locale: "en-US", colorScheme: "dark" });

  test("fits the whole song on one phone screen", async ({ page }) => {
    await page.goto("/songs/dostoinyi-ty-odyn");
    const bridge = page.getByRole("region", { name: "Bridge" });
    await expect(bridge).not.toBeInViewport();
    await page.getByRole("button", { name: "Compact mode" }).click();
    await expect(page.getByRole("button", { name: "Compact mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(bridge).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("region", { name: "Intro" })).toBeInViewport({ ratio: 1 });
    await expect(bridge).toContainText("яма");
    await page.screenshot({ path: test.info().outputPath("compact.png") });
  });
});

test.describe("compact mode on an installed iPhone app", () => {
  // The web view of a 393 x 852 pt iPhone below its status bar, with the home-indicator inset.
  test.use({ locale: "en-US", colorScheme: "dark", viewport: { width: 393, height: 797 } });

  for (const [song, first, last] of [
    ["bozhe-ia-vdiachnyi-tobi", "Intro", "Chorus 3"],
    ["vdiachnist", "Intro", "Chorus 3"],
  ] as const) {
    test(`${song}: the whole song is on one screen, across the full width`, async ({ page }) => {
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: 34 } });
      await page.goto(`/songs/${song}`);
      await page.getByRole("button", { name: "Compact mode" }).click();
      await expect(page.getByRole("region", { name: first }).first()).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("region", { name: last })).toBeInViewport({ ratio: 1 });
      const main = page.getByRole("main");
      expect(await main.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      expect(await main.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: test.info().outputPath(`compact-${song}.png`) });
    });
  }

  /** Left edges of the bars of every section, measured from the section's tile. */
  const barLines = (page: Page) =>
    page.getByRole("main").evaluate((main) => {
      const sections: Record<string, number[]> = {};
      for (const tile of main.querySelectorAll("section")) {
        const origin = tile.getBoundingClientRect().left;
        const lefts = [...tile.querySelectorAll("[data-bar]")].map(
          (bar) => Math.round((bar.getBoundingClientRect().left - origin) * 2) / 2,
        );
        sections[tile.getAttribute("aria-label") ?? ""] = [...new Set(lefts)].sort((a, b) => a - b);
      }
      return sections;
    });

  /** Bars wider or narrower than the first bar of the song (there must be none). */
  const unevenBars = (page: Page) =>
    page
      .getByRole("main")
      .locator("[data-bar]")
      .evaluateAll((bars) => {
        const widths = bars.map((bar) => bar.getBoundingClientRect().width);
        return widths.filter((width) => Math.abs(width - (widths[0] ?? 0)) > 0.5).length;
      });

  test("every bar has the same width and bar lines of all sections meet: four columns", async ({
    page,
  }) => {
    await page.goto("/songs/vdiachnist");
    await page.getByRole("button", { name: "Compact mode" }).click();
    const lines = await barLines(page);
    const grid = lines.Chorus ?? [];
    expect(grid).toHaveLength(4);
    // The last chorus has a line of five bars: it uses the same four columns; the fifth bar wraps.
    expect(lines["Chorus 3"]).toEqual(grid);
    expect(lines.Instrumental).toEqual(grid);
    expect(lines["3 Verse"]).toEqual(grid);
    // Two bars of the intro are as wide as any other bar.
    expect(lines.Intro).toEqual(grid.slice(0, 2));
    expect(await unevenBars(page)).toBe(0);
  });

  test("a verse bar is as wide as a chorus bar in a song of three-, five- and seven-bar lines", async ({
    page,
  }) => {
    await page.goto("/songs/bozhe-ia-vdiachnyi-tobi");
    await page.getByRole("button", { name: "Compact mode" }).click();
    const lines = await barLines(page);
    const grid = lines.Chorus ?? [];
    expect(grid).toHaveLength(5);
    expect(lines["1 Verse"]).toEqual(grid.slice(0, 3));
    expect(lines["Chorus 3"]).toEqual(grid);
    // Six and seven bars: five in a row, the rest wraps to the first columns.
    expect(lines.Instrumental).toEqual(grid);
    expect(lines.Bridge).toEqual(grid);
    expect(await unevenBars(page)).toBe(0);
    // No chord is wider than its bar.
    expect(
      await page
        .getByRole("main")
        .locator("[data-bar]")
        .evaluateAll((bars) => bars.filter((bar) => bar.scrollWidth > bar.clientWidth + 1).length),
    ).toBe(0);
  });

  test("a row too dense for the screen falls back to fewer columns instead of overflowing", async ({
    page,
  }) => {
    await page.goto("/library");
    await page.getByRole("button", { name: "New song" }).click();
    const dense = "| D/F#** Gsus4** | Asus4** Hm7** ".repeat(4);
    await page
      .getByRole("textbox", { name: "Song text" })
      .fill(`# Dense\nkey: D\nnotation: H\n\n## Verse\n${dense}|\n`);
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Compact mode" }).click();
    const verse = page.getByRole("region", { name: "Verse" });
    await expect
      .poll(() =>
        verse
          .locator("[data-bar]")
          .evaluateAll(
            (bars) => bars.filter((bar) => bar.scrollWidth > bar.clientWidth + 1).length,
          ),
      )
      .toBe(0);
    // Eight bars do not stay in one row of eight.
    expect(
      await verse
        .locator("[data-bar]")
        .evaluateAll(
          (bars) => new Set(bars.map((bar) => Math.round(bar.getBoundingClientRect().top))).size,
        ),
    ).toBeGreaterThan(1);
    expect(
      await page.getByRole("main").evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(0);
  });
});

test.describe("Ukrainian UI", () => {
  test.use({ locale: "uk-UA", colorScheme: "light" });

  test("keys and guitar see the same song differently", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/songs/silent-night");
    const verse = page.getByRole("region", { name: "Verse 1" });

    await page.getByRole("tab", { name: "Клавішні" }).click();
    await expect(verse).toContainText("Bsus4");
    await expect(verse).toContainText("/D");

    await page.getByRole("tab", { name: "Гітара" }).click();
    await expect(page.getByRole("button", { name: "3→G" })).toHaveAttribute("aria-pressed", "true");
    await expect(verse).not.toContainText("Bsus4");
    await expect(verse).toContainText("D7");
    await page.screenshot({ path: test.info().outputPath("song-guitar-light-uk.png") });
    expect(errors).toEqual([]);
  });

  test("settings switch the note naming everywhere", async ({ page }) => {
    await page.goto("/songs/dostoinyi-ty-odyn");
    const intro = page.getByRole("region", { name: "Intro" });
    await expect(intro).toContainText("Hm");
    // Move around inside the app, as a musician would: no page reloads.
    await page.getByRole("link", { name: "Назад" }).click();
    await page.getByRole("button", { name: "Розділи" }).click();
    await page.getByRole("menuitem", { name: "Налаштування" }).click();
    await page.getByRole("radio", { name: /англійська/ }).check();
    await page.getByRole("button", { name: "Розділи" }).click();
    await page.getByRole("menuitem", { name: "Бібліотека" }).click();
    await page.getByRole("link", { name: /Достойний Ти Один/ }).click();
    await expect(intro).toContainText("Bm");
    // The choice is stored on the device and survives a restart.
    await expect.poll(() => page.reload().then(() => intro.textContent())).toContain("Bm");
  });

  test("after one visit the app opens a song without a network", async ({ page, context }) => {
    await page.goto("/library");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.goto("/songs/silent-night");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Silent Night");
    await expect(page.getByRole("tab", { name: "Гармонія" })).toBeVisible();
  });
});

test.describe("editor", () => {
  test.use({ locale: "en-US", colorScheme: "light" });

  test("a new song is written, checked, saved and deleted", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/library");
    await page.getByRole("button", { name: "New song" }).click();
    await expect(page).toHaveURL(/\/songs\/new-song\/edit$/);

    const text = page.getByRole("textbox", { name: "Song text" });
    await text.fill("# Morning\nkey: G\nnotation: B\n\n## Verse\n| G | D** C*** |\n");
    await expect(page.getByRole("status")).toContainText(
      "Line 6: This bar has 5 beats, the time signature has 4.",
    );
    await page.getByRole("button", { name: "Show" }).click();
    expect(
      await text.evaluate((el: HTMLTextAreaElement) =>
        el.value.slice(el.selectionStart, el.selectionEnd),
      ),
    ).toBe(" D** C*** ");

    await text.fill("# Morning\nkey: G\nnotation: B\n\n## Verse\n| G | D** C** |\n");
    await expect(page.getByText("No problems found")).toBeVisible();
    await text.press("Control+End");
    await page.getByRole("button", { name: "Insert ##" }).click();
    await text.pressSequentially("Chorus\n| C | G |");

    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByRole("region", { name: "Chorus" })).toContainText("C");
    await page.screenshot({ path: test.info().outputPath("editor-preview.png") });

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Morning");
    await page.reload();
    await expect(page.getByRole("region", { name: "Chorus" })).toBeVisible();

    await page.getByRole("button", { name: "View options" }).click();
    await page.getByRole("link", { name: "Edit the song" }).click();
    await page.getByRole("tab", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Delete this song" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole("link", { name: /Morning/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("service map", () => {
  test.use({ locale: "en-US", colorScheme: "dark" });

  test("a setlist is built, played through with the keyboard and keeps the key chosen for the night", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto("/library");
    await page.getByRole("tab", { name: /Setlists/ }).click();
    await page.getByRole("button", { name: "New setlist" }).click();
    await expect(page).toHaveURL(/\/setlists\/service-\d{4}-\d{2}-\d{2}$/);

    for (const title of ["Достойний Ти Один", "Silent Night"]) {
      await page.getByRole("button", { name: "Add a song" }).click();
      await page.getByRole("dialog").getByRole("searchbox").fill(title.slice(0, 5));
      await page.getByRole("dialog").getByRole("button", { name: title }).click();
    }
    const rows = page.getByRole("listitem");
    await expect(rows).toHaveCount(2);

    // Order and a note for the night.
    await page.getByRole("button", { name: "Edit the setlist" }).click();
    await page.getByRole("button", { name: "Move “Silent Night” up" }).click();
    await page.getByRole("textbox", { name: "Note for the night: Silent Night" }).fill("no intro");
    await page.getByRole("button", { name: "Finish editing" }).click();
    await expect(rows.first()).toContainText("Silent Night");
    await expect(rows.first()).toContainText("no intro");

    // Play through: the first song, then the next one with the right arrow (or a pedal).
    await page.getByRole("link", { name: "Start" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Silent Night");
    await expect(page.getByRole("contentinfo")).toContainText("1 of 2");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Достойний Ти Один");
    await expect(page.getByRole("link", { name: "Next song" })).toHaveCount(0);

    // A key for tonight is stored in the setlist, not in the song.
    await page.getByRole("button", { name: "Transpose up" }).click();
    await page.getByRole("button", { name: "Transpose up" }).click();
    await expect(page.getByRole("contentinfo")).toContainText("E");
    await page.keyboard.press("PageUp");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Silent Night");
    await page.getByRole("link", { name: "Back" }).click();
    await expect(rows.nth(1)).toContainText("E");
    await page.screenshot({ path: test.info().outputPath("service-map.png") });

    await page.reload();
    await expect(rows.nth(1)).toContainText("E");
    await page.goto("/songs/dostoinyi-ty-odyn");
    await expect(page.getByRole("contentinfo")).toContainText("original");

    // The app comes back to the setlist that was open last.
    await page.goto("/");
    await expect(page).toHaveURL(/\/setlists\/service-/);
    expect(errors).toEqual([]);
  });
});

test.describe("laptop layout", () => {
  test.use({
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 1280, height: 800 },
    isMobile: false,
  });

  test("the setlist stays next to the song and marks the current one", async ({ page }) => {
    await page.goto("/library?tab=setlists");
    await page.getByRole("button", { name: "New setlist" }).click();
    for (const title of ["Silent Night", "Достойний Ти Один"]) {
      await page.getByRole("button", { name: "Add a song" }).click();
      await page.getByRole("dialog").getByRole("button", { name: title }).click();
    }
    await page.getByRole("link", { name: "Start" }).click();

    const sidebar = page.getByRole("navigation", { name: "Songs of the setlist" });
    await expect(sidebar.getByRole("link", { name: /Silent Night/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await sidebar.getByRole("link", { name: /Достойний Ти Один/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Достойний Ти Один");
    await expect(sidebar.getByRole("link", { name: /Достойний Ти Один/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Eight bars per row: the five-bar line of the first verse stays on one row.
    const bars = page
      .getByRole("region", { name: "Verse 1" })
      .locator(".grid")
      .nth(1)
      .locator("> div");
    const tops = await bars.evaluateAll((cells) =>
      cells.map((cell) => Math.round(cell.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
    await page.screenshot({ path: test.info().outputPath("laptop.png") });
  });
});

test.describe("install and screen hints", () => {
  test.use({ locale: "en-US" });

  test("the library explains how to install until the hint is dismissed", async ({ page }) => {
    await page.goto("/library");
    const hint = page.getByRole("complementary", { name: "Install Takt" });
    await expect(hint).toContainText("without a network");
    await hint.getByRole("button", { name: "Not now" }).click();
    await expect(hint).toHaveCount(0);
    // Use the app for a moment, as a person would, then restart: the hint stays away.
    await page.getByRole("link", { name: /Silent Night/ }).click();
    await page.getByRole("link", { name: "Back" }).click();
    await page.reload();
    await expect(page.getByRole("link", { name: /Silent Night/ })).toBeVisible();
    await expect(hint).toHaveCount(0);
  });

  test("when the browser refuses to keep the screen awake, the view options say so", async ({
    page,
  }) => {
    // Headless Chromium refuses the wake lock, like a phone in power-saving mode.
    await page.goto("/songs/silent-night");
    await page.getByRole("button", { name: "View options" }).click();
    await expect(page.getByRole("note")).toContainText("The screen may turn off");
  });
});

test.describe("phone screen edges and keyboard", () => {
  test.use({ locale: "en-US", colorScheme: "dark" });

  test("the player toolbar keeps its controls whole above the home indicator", async ({ page }) => {
    // An installed app on an iPhone: 34 px at the bottom belong to the home indicator.
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: 34 } });
    await page.goto("/songs/silent-night");
    const footer = page.getByRole("contentinfo");
    const play = page.getByRole("button", { name: "Start auto-scroll" });
    await expect(play).toBeVisible();
    const bar = await footer.boundingBox();
    const button = await play.boundingBox();
    if (!bar || !button) throw new Error("no layout");
    expect(bar.height).toBe(56 + 34 + 1);
    // The 44 px button sits inside the 56 px row, not across the top border.
    expect(button.y).toBeGreaterThanOrEqual(bar.y + 1);
    expect(button.y + button.height).toBeLessThanOrEqual(bar.y + 1 + 56);
    await page.screenshot({ path: test.info().outputPath("footer-safe-area.png") });
  });

  test("the quick-symbol bar stays above the keyboard while typing", async ({ page }) => {
    // iOS keeps the page height and shrinks only the visual viewport when the keyboard opens.
    await page.addInitScript(() => {
      // The page height is read when asked for: at this point the viewport meta is not applied yet.
      const state = { keyboard: 0, offsetTop: 0 };
      const fake = new EventTarget();
      Object.defineProperties(fake, {
        height: { get: () => window.innerHeight - state.keyboard },
        width: { get: () => window.innerWidth },
        offsetTop: { get: () => state.offsetTop },
        offsetLeft: { get: () => 0 },
        scale: { get: () => 1 },
      });
      Object.defineProperty(window, "visualViewport", { get: () => fake });
      Object.assign(window, {
        openKeyboard: (height: number, offsetTop = 0) => {
          state.keyboard = height;
          state.offsetTop = offsetTop;
          fake.dispatchEvent(new Event("resize"));
        },
      });
    });
    await page.goto("/songs/silent-night/edit");
    const bar = page.getByRole("toolbar", { name: "Quick symbols" });
    const bottom = async () => {
      const box = await bar.boundingBox();
      return box ? Math.round(box.y + box.height) : -1;
    };
    expect(await bottom()).toBe(844);

    await page.evaluate(() =>
      (window as unknown as { openKeyboard: (h: number) => void }).openKeyboard(340),
    );
    await expect(page.locator("html")).toHaveAttribute("data-keyboard", "");
    expect(await bottom()).toBe(844 - 340);
    await expect(page.getByRole("textbox", { name: "Song text" })).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath("editor-keyboard.png") });

    // iOS scrolled the page by 100 px to show the caret: the app follows the visible area.
    await page.evaluate(() =>
      (window as unknown as { openKeyboard: (h: number, top: number) => void }).openKeyboard(
        340,
        100,
      ),
    );
    expect(await bottom()).toBe(100 + 844 - 340);

    await page.evaluate(() =>
      (window as unknown as { openKeyboard: (h: number) => void }).openKeyboard(0),
    );
    await expect(page.locator("html")).not.toHaveAttribute("data-keyboard", "");
    expect(await bottom()).toBe(844);
  });
});

test.describe("backup", () => {
  test.use({ locale: "en-US" });

  test("everything is exported as one file and restored on an empty device", async ({
    page,
    browser,
  }) => {
    await page.goto("/settings");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export everything" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^takt-backup-\d{4}-\d{2}-\d{2}\.taktbundle$/);
    const path = await file.path();
    await expect(page.getByText(/Last backup:/)).toBeVisible();

    // A second device: its own storage, where the example songs were deleted.
    const other = await browser.newContext({ locale: "en-US" });
    const second = await other.newPage();
    await second.goto("/songs/silent-night/edit");
    await second.getByRole("tab", { name: "Preview" }).click();
    await second.getByRole("button", { name: "Delete this song" }).click();
    await second.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(second.getByRole("link", { name: /Silent Night/ })).toHaveCount(0);

    await second.locator('input[type="file"]').setInputFiles(path);
    await expect(second.getByRole("status")).toContainText("1 song imported · 3 were already here");
    await expect(second.getByRole("link", { name: /Silent Night/ })).toBeVisible();
    await other.close();
  });
});

test.describe("the production server", () => {
  test("answers app routes with the app, caches hashed assets forever and nothing else", async ({
    request,
  }) => {
    const route = await request.get("/songs/anything");
    expect(route.status()).toBe(200);
    expect(route.headers()["content-type"]).toContain("text/html");
    expect(route.headers()["cache-control"]).toBe("no-cache");

    const script = /src="(\/assets\/[^"]+\.js)"/.exec(await route.text())?.[1] ?? "";
    const asset = await request.get(script);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["cache-control"]).toContain("immutable");

    expect((await request.get("/sw.js")).headers()["cache-control"]).toBe("no-cache");
    expect((await request.get("/assets/missing.js")).status()).toBe(404);
    expect((await request.get("/..%2f..%2fpackage.json")).status()).not.toBe(200);
  });
});
