import { stat } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("export proof renders a WebM file with the browser renderer", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/labs/export");
  await expect(page.getByText("Capability check complete.")).toBeVisible({
    timeout: 60_000,
  });

  await page.locator("#export-codec").click();
  await page.getByRole("option", { name: /WebM \/ VP9 \/ Opus/ }).click();
  await expect(page.getByText("This combination is supported.")).toBeVisible();

  await page.getByRole("button", { name: "Render 5 second video" }).click();
  await expect(page.getByText("Download file")).toBeVisible({
    timeout: 180_000,
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download file" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.webm$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const fileStat = await stat(filePath as string);
  expect(fileStat.size).toBeGreaterThan(10_000);
});
