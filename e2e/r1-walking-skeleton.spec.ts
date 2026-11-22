import { stat } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("R1 walking skeleton imports, analyses, forges, exports, and reopens", async ({
  page,
}) => {
  test.setTimeout(300_000);

  await page.goto("/analysis");
  await page.getByRole("button", { name: "Use fixture" }).click();
  await page.getByRole("button", { name: "Import game" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
  await expect(page.getByText("White vs Black")).toBeVisible();

  // Replay at least five moves, then analyse the position before move five.
  await page.getByRole("button", { name: "3. Bb5" }).click();
  await page.getByRole("button", { name: "Analyse position" }).click();
  await expect(page.getByText("White perspective")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("Best move")).toBeVisible();

  await page.getByRole("button", { name: "Create 3-second scene" }).click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Project details")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("ChessForge scene")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Export video" }).click();
  await expect(page.getByRole("link", { name: "Download WebM" })).toBeVisible({
    timeout: 180_000,
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download WebM" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.webm$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const fileStat = await stat(filePath as string);
  expect(fileStat.size).toBeGreaterThan(10_000);

  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByText("Saved to IndexedDB.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Project details")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "White vs Black" }),
  ).toBeVisible();
  await expect(page.getByText("1 scene")).toBeVisible();

  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: "Studio", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("White vs Black", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open" }).click();
  await expect(page.getByText("Project details")).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/dashboard");
  await expect(page.getByText("Recent game")).toBeVisible();
  await expect(page.getByText("Recent project")).toBeVisible();
  await expect(page.getByText("White vs Black").first()).toBeVisible();
});
