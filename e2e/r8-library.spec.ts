import { expect, test } from "@playwright/test";

test.describe("R8 Chess Library", () => {
  test.setTimeout(120_000);

  test("opens every Library area", async ({ page }) => {
    await page.goto("/library");
    await expect(
      page.getByRole("heading", { name: "Chess Library", level: 1 }),
    ).toBeVisible();
    for (const label of [
      "Openings",
      "Repertoire",
      "Practice",
      "My Games",
      "Reference",
    ]) {
      await expect(
        page.getByRole("link", { name: new RegExp(`^${label}`) }),
      ).toBeVisible();
    }
  });

  test("searches an opening and shows named continuations", async ({
    page,
  }) => {
    await page.goto("/library/openings");
    await expect(
      page.getByRole("heading", { name: "Opening Explorer", level: 1 }),
    ).toBeVisible();
    await page.getByLabel("Search openings").fill("Ruy Lopez");
    await page
      .getByRole("button", { name: /Ruy Lopez/ })
      .first()
      .click();
    await expect(page.getByLabel("Opening explorer board")).toBeVisible();
    await expect(page.getByText("Named continuations")).toBeVisible();
  });

  test("creates a repertoire line", async ({ page }) => {
    await page.goto("/library/repertoire");
    await page.getByRole("button", { name: "New line" }).click();
    await page.getByLabel("Line name").fill("R8 test line");
    await page.getByLabel("Moves").fill("1. e4 e5 2. Nf3 Nc6");
    await page.getByRole("button", { name: "Save line" }).click();
    await expect(page.getByText("R8 test line")).toBeVisible();
  });

  test("loads a puzzle and a reference article", async ({ page }) => {
    await page.goto("/library/practice");
    await expect(page.getByText("Find the best move")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("link", { name: "Reference", exact: true }).click();
    await page.getByLabel("Search reference articles").fill("Lucena");
    await page.locator('a[href="/library/reference/lucena-position"]').click();
    await expect(
      page.getByRole("heading", { name: "Lucena Position", level: 1 }),
    ).toBeVisible();
  });

  test("global search finds a reference article", async ({ page }) => {
    await page.goto("/library");
    await page.getByLabel("Search Chess Library").fill("Lucena");
    await expect(page.getByText("Loading local index")).toBeHidden({
      timeout: 30_000,
    });
    await expect(
      page.locator('a[href="/library/reference/lucena-position"]'),
    ).toBeVisible();
  });
});
