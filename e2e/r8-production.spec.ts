import { expect, test } from "@playwright/test";

test.describe("R8 Chess Library production", () => {
  test.setTimeout(120_000);

  test("loads the offline Library and reference article", async ({ page }) => {
    await page.goto("/library");
    await expect(
      page.getByRole("heading", { name: "Chess Library", level: 1 }),
    ).toBeVisible();
    await page.goto("/library/openings");
    await expect(
      page.getByRole("heading", { name: "Opening Explorer", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Opening explorer board")).toBeVisible({
      timeout: 30_000,
    });
    await page.goto("/library/practice");
    await expect(page.getByText("Find the best move")).toBeVisible({
      timeout: 60_000,
    });
    await page.goto("/library/reference/lucena-position");
    await expect(
      page.getByRole("heading", { name: "Lucena Position", level: 1 }),
    ).toBeVisible();
  });
});
