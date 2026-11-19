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

    await page.getByRole("link", { name: "Edit" }).click();
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
    await expect(second.getByRole("status")).toContainText("1 song imported · 1 was already here");
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
