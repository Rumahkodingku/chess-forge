import { stat } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("R1 walking skeleton imports, analyses, forges, exports, and reopens", async ({
  page,
}) => {
  test.setTimeout(300_000);

  await page.goto("/analysis");
  await page.getByRole("button", { name: "Use fixture" }).click();
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "White vs Black" }),
  ).toBeVisible();

  // Replay five plies with the next control, then exercise arrows and
  // first/previous/next/last before analysing.
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole("button", { name: "Next move" }).click();
  }
  await expect(page.getByRole("button", { name: "3. Bb5" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "2. Nf3" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "3. Bb5" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByRole("button", { name: "First move" }).click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "Last move" }).click();
  await expect(page.getByRole("button", { name: "5... Be7" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.getByRole("button", { name: "Previous move" }).click();
  await expect(page.getByRole("button", { name: "5. O-O" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.getByRole("button", { name: "Next move" }).click();
  await expect(page.getByRole("button", { name: "5... Be7" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByRole("button", { name: "3. Bb5" }).click();
  await page.getByRole("button", { name: "Analyse position" }).click();
  await expect(page.getByText("White perspective")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("Best move")).toBeVisible();

  // Selecting a move after analysis must not leave the engine stuck.
  await page.getByRole("button", { name: "2. Nf3" }).click();
  await expect(
    page.getByRole("button", { name: "Analyse position" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Analyse position" }).click();
  await expect(page.getByText("White perspective")).toBeVisible({
    timeout: 90_000,
  });

  await page.getByRole("button", { name: "3. Bb5" }).click();
  await page.getByRole("button", { name: "Create 3-second scene" }).click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Project details")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.locator("[data-scene-text]").filter({ hasText: "3. Bb5" }),
  ).toBeVisible({
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
