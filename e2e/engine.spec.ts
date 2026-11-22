import { expect, test } from "@playwright/test";

test("engine proof loads Stockfish and returns MultiPV", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/labs/engine");
  await page.getByRole("button", { name: "Analyse position" }).click();
  await expect(page.getByText("White perspective")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("PV 1")).toBeVisible();
  await expect(page.getByText("PV 3")).toBeVisible();
  await expect(page.getByText("State: completed")).toBeVisible();
});
