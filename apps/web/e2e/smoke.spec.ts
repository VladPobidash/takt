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
