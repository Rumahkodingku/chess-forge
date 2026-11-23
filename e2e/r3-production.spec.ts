import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const PGN = readFileSync("src/features/games/fixtures/r3-analysis.pgn", "utf8");

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.use({ viewport: { width: 1440, height: 1000 } });

test("R3 production analysis and summary work at 390 px", async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto("/settings");
  await page.waitForTimeout(800);
  await page.getByRole("tab", { name: "Engine" }).click();
  await page.locator("#engine-depth").fill("6");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Save engine settings" }).click();
  await expect(page.getByText("Settings saved to this device.")).toBeVisible();

  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(PGN);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Analyse game" }).click();
  await expect(
    page.getByRole("button", { name: "Re-analyse game" }),
  ).toBeVisible({ timeout: 180_000 });
  await expect(
    page.getByText("Ruy Lopez", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.getByText("Best").first()).toBeVisible();
  await expect(page.getByText("Game summary")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await expectNoHorizontalOverflow(page);
});
