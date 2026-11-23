import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const R1_PGN = readFileSync(
  "src/features/games/fixtures/r1-walking-skeleton.pgn",
  "utf8",
);
const CRITICAL_PGN = readFileSync(
  "src/features/games/fixtures/r3-critical.pgn",
  "utf8",
);

async function importPgn(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
}

async function setEngineDepth(page: Page, depth: number) {
  await page.goto("/settings");
  await page.waitForTimeout(800);
  await page.getByRole("tab", { name: "Engine" }).click();
  await page.waitForTimeout(200);
  await page.locator("#engine-depth").fill(String(depth));
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Save engine settings" }).click();
  await expect(page.getByText("Settings saved to this device.")).toBeVisible();
}

function wavBuffer(seconds = 0.5): Buffer {
  const sampleRate = 8000;
  const samples = Math.floor(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

async function createFullProject(page: Page) {
  await page.getByRole("button", { name: "Create video" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("R5 video studio", () => {
  test.setTimeout(240_000);

  test("creates a full project, edits timeline and scene, uploads audio, and reopens", async ({
    page,
  }) => {
    await importPgn(page, R1_PGN);
    await createFullProject(page);

    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    await expect(page.getByText(/5 scenes ·/)).toBeVisible();
    await expect(page.getByText("Audio tracks")).toBeVisible();

    await page.getByRole("button", { name: /02 move/ }).click();
    await expect(
      page.locator("[data-scene-text]").filter({ hasText: "1. e4" }),
    ).toBeVisible();
    await page.getByLabel("Scene 2 duration frames").fill("200");
    await expect(page.getByLabel("Scene 2 duration frames")).toHaveValue("200");

    await page.getByLabel("Text move-label").first().fill("Edited move");
    await page.getByRole("button", { name: "Add annotation" }).click();
    await expect(page.getByText("Delete annotation")).toBeVisible();
    await page.getByLabel("Glow").check();
    await page.getByRole("button", { name: "Add at current frame" }).click();
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByText(/6 scenes ·/)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText(/5 scenes ·/)).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText(/6 scenes ·/)).toBeVisible();

    await page.getByLabel("Upload audio file").setInputFiles({
      name: "tone.wav",
      mimeType: "audio/wav",
      buffer: wavBuffer(),
    });
    await expect(page.getByLabel("Delete audio track")).toHaveCount(1, {
      timeout: 15_000,
    });

    await page.getByLabel("Aspect ratio").selectOption("16:9");
    await expect(page.getByText("1920 x 1080")).toBeVisible();
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Save as template" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Name").fill("My R5 template");
    await page.getByRole("button", { name: "Save template" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.reload();
    await page.getByRole("button", { name: /02 move/ }).click();
    await expect(page.getByLabel("Text move-label").first()).toHaveValue(
      "Edited move",
    );
    await expect(page.getByText("1920 x 1080")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/templates");
    await expect(page.getByText("My R5 template")).toBeVisible();
    await page
      .getByRole("button", { name: "Apply to project" })
      .first()
      .click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText("Template style applied.")).toBeVisible();
  });

  test("creates projects from a manual range and critical moments", async ({
    page,
  }) => {
    await importPgn(page, R1_PGN);
    await page.getByRole("button", { name: "Create video" }).click();
    await page.getByRole("button", { name: "Manual range" }).click();
    await page.getByLabel("From ply").fill("1");
    await page.getByLabel("To ply").fill("4");
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
    await expect(page.getByText(/3 scenes ·/)).toBeVisible();

    await setEngineDepth(page, 8);
    await importPgn(page, CRITICAL_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(page.getByText("Game summary")).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      page.getByRole("button", { name: "Create video" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create video" }).click();
    await page.getByRole("button", { name: "Critical moments" }).click();
    await page.getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("button", { name: /analysis/ })).toBeVisible();
  });
  test("regenerates scenes from a template and undoes it", async ({ page }) => {
    await importPgn(page, R1_PGN);
    await createFullProject(page);
    await expect(page.getByText(/5 scenes ·/)).toBeVisible();

    await page.getByRole("button", { name: "Apply template" }).click();
    const applyDialog = page.getByRole("dialog", { name: "Apply template" });
    await applyDialog.locator("select").selectOption("tactical-breakdown");
    await applyDialog.getByLabel("Regenerate scenes").check();
    page.once("dialog", (dialog) => dialog.accept());
    await applyDialog
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    await expect(page.getByText(/7 scenes ·/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText(/5 scenes ·/)).toBeVisible();
  });
});
