import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { projectSlug } from "../src/features/studio/file-name";

const R1_PGN = readFileSync(
  "src/features/games/fixtures/r1-walking-skeleton.pgn",
  "utf8",
);
const PROJECT_FIXTURE = JSON.parse(
  readFileSync("src/features/studio/fixtures/r5-project.json", "utf8"),
) as { id: string; name: string };

interface VideoProbe {
  container: string;
  duration: number;
  video: { codec: string; width: number; height: number };
  audio: { codec: string } | null;
}

function probe(filePath: string): VideoProbe {
  const output = execFileSync(
    "node",
    ["scripts/validate-video.mjs", filePath],
    {
      encoding: "utf8",
    },
  );
  return JSON.parse(
    output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1),
  ) as VideoProbe;
}

function zipFile(entries: Record<string, Uint8Array>): Buffer {
  return Buffer.from(zipSync(entries));
}

function backupWithVersion(version: number): Buffer {
  return zipFile({
    "manifest.json": strToU8(
      JSON.stringify({
        format: "chessforge-backup",
        version,
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        counts: {},
      }),
    ),
    "data.json": strToU8("{}"),
  });
}

function projectBackupWithVersion(version: number): Buffer {
  return zipFile({
    "manifest.json": strToU8(
      JSON.stringify({
        format: "chessforge-project",
        version,
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        projectId: PROJECT_FIXTURE.id,
        projectName: PROJECT_FIXTURE.name,
      }),
    ),
    "project.json": strToU8("{}"),
  });
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

async function importGame(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
}

async function seedProject(page: Page, project: object) {
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: "Studio", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("No projects yet")).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chessforge");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("projects", "readwrite");
      transaction.objectStore("projects").put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, project);
}

async function clearWorkspace(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chessforge");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = Array.from(db.objectStoreNames);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(stores, "readwrite");
      for (const store of stores) transaction.objectStore(store).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
}

async function exportVideo(page: Page, filePath: string): Promise<VideoProbe> {
  await page.getByLabel("Resolution").selectOption("720p");
  await page.getByRole("radio", { name: /WebM \/ VP9 \/ Opus/ }).check();
  await page.getByRole("button", { name: "Export video" }).click();
  const link = page.getByRole("link", { name: "Download WebM" });
  await expect(link).toBeVisible({ timeout: 180_000 });
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  const download = await downloadPromise;
  await download.saveAs(filePath);
  return probe(filePath);
}

const SCENE_TWO = /02 move/;

async function editSceneTwoText(page: Page, value: string) {
  await page.getByRole("button", { name: SCENE_TWO }).click();
  await page.getByLabel("Text move-label").first().fill(value);
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByText("Autosaved to IndexedDB.")).toBeVisible();
}

async function expectSceneTwoText(page: Page, value: string) {
  await expect(page.getByText("Project details")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: SCENE_TWO }).click();
  await expect(page.getByLabel("Text move-label").first()).toHaveValue(value);
}

async function openProjectLinks(page: Page): Promise<string[]> {
  return page
    .getByRole("link", { name: "Open" })
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );
}

test.describe("R7 release scenarios", () => {
  test.setTimeout(600_000);
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("runs the seven PRD scenarios from import to project restore", async ({
    page,
  }, testInfo) => {
    await setEngineDepth(page, 6);

    await test.step("1. import and replay", async () => {
      await importGame(page, R1_PGN);
      await expect(
        page.getByRole("heading", { name: "White vs Black" }),
      ).toBeVisible();
      await expect(page.locator("cg-board piece")).toHaveCount(32);

      await page.keyboard.press("End");
      await expect(
        page.getByRole("button", { name: /5\.\.\. Be7/ }),
      ).toHaveAttribute("aria-current", "true");
      await page.keyboard.press("Home");
      await expect(
        page.getByRole("button", { name: "Start", exact: true }),
      ).toHaveAttribute("aria-current", "true");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("button", { name: /1\.\.\. e5/ }),
      ).toHaveAttribute("aria-current", "true");
    });

    await test.step("2. analyse the game and inspect a selected move", async () => {
      await page.getByRole("button", { name: "Analyse game" }).click();
      await expect(
        page.getByRole("button", { name: "Re-analyse game" }),
      ).toBeVisible({ timeout: 180_000 });
      await expect(page.getByText("Game summary")).toBeVisible();

      await page.getByRole("button", { name: "3. Bb5" }).click();
      await expect(
        page.getByRole("button", { name: "3. Bb5" }),
      ).toHaveAttribute("aria-current", "true");
      await expect(page.getByText("Evaluation before")).toBeVisible();
      await expect(page.getByText("Evaluation after")).toBeVisible();
      await expect(page.getByText("Confidence")).toBeVisible();
    });

    await test.step("3. create a video from the selected moment", async () => {
      await page.getByRole("button", { name: "Create 3-second scene" }).click();
      await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
      await expect(page.getByText("Project details")).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.locator("[data-scene-text]").filter({ hasText: "3. Bb5" }),
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step("4. apply and customise a template", async () => {
      await page.getByRole("button", { name: "Apply template" }).click();
      const applyDialog = page.getByRole("dialog", { name: "Apply template" });
      await expect(applyDialog).toBeVisible();
      await applyDialog.locator("select").selectOption("tactical-breakdown");
      await applyDialog
        .getByRole("button", { name: "Apply", exact: true })
        .click();
      await expect(applyDialog).toBeHidden();
      await expect(
        page.getByText("Template: Tactical Breakdown", { exact: true }),
      ).toBeVisible();

      await page.getByLabel("Text move-label").first().fill("Release move");
      await page.getByRole("button", { name: "Add annotation" }).click();
      await expect(page.getByText("Delete annotation")).toBeVisible();

      await page.getByRole("button", { name: "Save as template" }).click();
      const saveDialog = page.getByRole("dialog", { name: "Save as template" });
      await expect(saveDialog).toBeVisible();
      await saveDialog
        .getByLabel("Name", { exact: true })
        .fill("Release template");
      await saveDialog.getByRole("button", { name: "Save template" }).click();
      await expect(saveDialog).toBeHidden();
      await page.getByRole("button", { name: "Save project" }).click();
      await expect(page.getByText("Autosaved to IndexedDB.")).toBeVisible();

      const projectUrl = page.url();
      await page.goto("/templates");
      await expect(page.getByText("Release template").first()).toBeVisible();
      await page.goto(projectUrl);
      await expect(page.getByText("Project details")).toBeVisible();
    });

    await test.step("5. save, reload, and reopen the project", async () => {
      await page.getByRole("button", { name: "Save project" }).click();
      await expect(page.getByText("Autosaved to IndexedDB.")).toBeVisible();

      await page.reload();
      await expect(page.getByText("Project details")).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByLabel("Text move-label").first()).toHaveValue(
        "Release move",
      );

      await page.goto("/studio");
      await expect(
        page.getByRole("heading", { name: "Studio", level: 1 }),
      ).toBeVisible();
      await expect(page.getByText("White vs Black").first()).toBeVisible();
      await page.getByRole("link", { name: "Open" }).first().click();
      await expect(page.getByText("Project details")).toBeVisible();
      await expect(page.getByLabel("Text move-label").first()).toHaveValue(
        "Release move",
      );
    });

    await test.step("6. export a short video", async () => {
      const video = await exportVideo(
        page,
        testInfo.outputPath("r7-release.webm"),
      );
      expect(video.container).toContain("webm");
      expect(video.video.codec).toBe("vp9");
      expect(video.video.width).toBe(720);
      expect(video.video.height).toBe(1280);
      expect(video.duration).toBeGreaterThan(2.5);
      expect(video.duration).toBeLessThan(3.5);
    });

    await test.step("7. restore the project from its backup", async () => {
      const originalPath = new URL(page.url()).pathname;
      const backupPath = testInfo.outputPath("release-project.chessforge");
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export project backup" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.chessforge$/);
      await download.saveAs(backupPath);

      await page.goto("/studio");
      await page.getByRole("button", { name: "Import project backup" }).click();
      const restoreDialog = page.getByRole("dialog", {
        name: "Import project backup",
      });
      await restoreDialog
        .getByLabel("Choose a project backup file")
        .setInputFiles(backupPath);
      await expect(
        restoreDialog.getByText(/already exists in this browser/),
      ).toBeVisible();
      await restoreDialog
        .getByRole("button", { name: "Restore as copy" })
        .click();
      await expect(page.getByText("Project restored as a copy.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Open" })).toHaveCount(2, {
        timeout: 30_000,
      });
      const hrefs = await openProjectLinks(page);
      expect(new Set(hrefs).size).toBe(2);
      const copyPath = hrefs.find((href) => href !== originalPath);
      expect(copyPath).toBeTruthy();
      if (!copyPath) throw new Error("The restored copy was not listed.");
      await page.goto(copyPath);
      await expect(page.getByLabel("Text move-label").first()).toHaveValue(
        "Release move",
      );
    });
  });

  test("restores a full application backup from Settings", async ({
    page,
  }, testInfo) => {
    await importGame(page, R1_PGN);
    await page.getByRole("button", { name: "3. Bb5" }).click();
    await page.getByRole("button", { name: "Create 3-second scene" }).click();
    await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Project details")).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Storage" }).click();
    const backupPath = testInfo.outputPath("r7-full-backup.chessforge.zip");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export backup" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.chessforge\.zip$/);
    await download.saveAs(backupPath);

    await clearWorkspace(page);
    await page.goto("/dashboard");
    await expect(page.getByText("No games imported yet")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("No video projects yet")).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Storage" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    const reloadPromise = page.waitForEvent("load");
    await page.getByLabel("Import ChessForge backup").setInputFiles(backupPath);
    await reloadPromise;

    await page.goto("/dashboard");
    await expect(page.getByText("White vs Black").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("link", { name: /White vs Black/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open project" }),
    ).toBeVisible();
  });

  test("rejects unsupported full and project backup versions", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Storage" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Import ChessForge backup").setInputFiles({
      name: "unsupported-full.chessforge.zip",
      mimeType: "application/zip",
      buffer: backupWithVersion(99),
    });
    await expect(page.getByText(/unsupported version/i)).toBeVisible();

    await page.goto("/studio");
    await page.getByRole("button", { name: "Import project backup" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Import project backup",
    });
    await dialog.getByLabel("Choose a project backup file").setInputFiles({
      name: "unsupported-project.chessforge",
      mimeType: "application/zip",
      buffer: projectBackupWithVersion(99),
    });
    await expect(dialog.getByRole("alert")).toContainText(
      /unsupported version/i,
    );
  });

  test("restores a project into a clean workspace", async ({
    page,
  }, testInfo) => {
    await seedProject(page, PROJECT_FIXTURE);
    await page.goto(`/studio/${PROJECT_FIXTURE.id}`);
    await editSceneTwoText(page, "Restore scene text");

    const backupPath = testInfo.outputPath("r7-clean-restore.chessforge");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export project backup" }).click();
    const download = await downloadPromise;
    await download.saveAs(backupPath);

    await page.goto("/studio");
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: `Delete ${PROJECT_FIXTURE.name}` })
      .click();
    await expect(page.getByText("No projects yet")).toBeVisible();

    await page.getByRole("button", { name: "Import project backup" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Import project backup",
    });
    await dialog
      .getByLabel("Choose a project backup file")
      .setInputFiles(backupPath);
    await expect(dialog.getByText(/not in this browser yet/)).toBeVisible();
    await dialog.getByRole("button", { name: "Restore project" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("link", { name: "Open" })).toHaveCount(1, {
      timeout: 30_000,
    });

    await page.goto(`/studio/${PROJECT_FIXTURE.id}`);
    await expectSceneTwoText(page, "Restore scene text");
  });

  test("restores a project as a copy and overwrites only after confirmation", async ({
    page,
  }, testInfo) => {
    await seedProject(page, PROJECT_FIXTURE);
    await page.goto(`/studio/${PROJECT_FIXTURE.id}`);
    await editSceneTwoText(page, "Backup scene text");

    const originalPath = `/studio/${PROJECT_FIXTURE.id}`;
    const backupPath = testInfo.outputPath("r7-project.chessforge");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export project backup" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      `${projectSlug(PROJECT_FIXTURE.name)}.chessforge`,
    );
    await download.saveAs(backupPath);

    await page.goto("/studio");
    await page.getByRole("button", { name: "Import project backup" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Import project backup",
    });
    const input = dialog.getByLabel("Choose a project backup file");

    await input.setInputFiles(backupPath);
    await expect(
      dialog.getByText(/already exists in this browser/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Restore as copy" }).click();
    await expect(page.getByText("Project restored as a copy.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open" })).toHaveCount(2, {
      timeout: 30_000,
    });
    const hrefs = await openProjectLinks(page);
    expect(new Set(hrefs).size).toBe(2);
    const copyPath = hrefs.find((href) => href !== originalPath);
    expect(copyPath).toBeTruthy();
    if (!copyPath) throw new Error("The restored copy was not listed.");
    await page.goto(copyPath);
    await expectSceneTwoText(page, "Backup scene text");

    await page.goto(originalPath);
    await editSceneTwoText(page, "Local scene text");

    await page.goto("/studio");
    await page.getByRole("button", { name: "Import project backup" }).click();
    await input.setInputFiles(backupPath);
    await expect(
      dialog.getByText(/already exists in this browser/),
    ).toBeVisible();
    page.once("dialog", (confirm) => confirm.dismiss());
    await dialog.getByRole("button", { name: "Overwrite" }).click();
    await expect(dialog).toBeVisible();
    await expect(
      page.getByText("Project restored and overwritten."),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await page.goto(originalPath);
    await expectSceneTwoText(page, "Local scene text");

    await page.goto("/studio");
    await page.getByRole("button", { name: "Import project backup" }).click();
    await input.setInputFiles(backupPath);
    await expect(
      dialog.getByText(/already exists in this browser/),
    ).toBeVisible();
    page.once("dialog", (confirm) => confirm.accept());
    await dialog.getByRole("button", { name: "Overwrite" }).click();
    await expect(
      page.getByText("Project restored and overwritten."),
    ).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("link", { name: "Open" })).toHaveCount(2);
    await page.goto(originalPath);
    await expectSceneTwoText(page, "Backup scene text");
  });
});
