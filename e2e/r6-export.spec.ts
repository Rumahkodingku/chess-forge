import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const fixture = JSON.parse(
  readFileSync("src/features/studio/fixtures/r6-export-project.json", "utf8"),
);

interface Probe {
  container: string;
  duration: number;
  video: { codec: string; width: number; height: number };
  audio: { codec: string } | null;
}

function probe(filePath: string): Probe {
  const output = execFileSync(
    "node",
    ["scripts/validate-video.mjs", filePath],
    {
      encoding: "utf8",
    },
  );
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  return JSON.parse(output.slice(start, end + 1)) as Probe;
}

async function seedProject(page: Page, project: object) {
  await page.goto("/studio");
  await page.waitForTimeout(1000);
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

async function openExport(page: Page) {
  await page.getByRole("heading", { name: "White vs Black" }).waitFor();
  await expect(
    page.getByText(
      "Render the project snapshot to a validated MP4 or WebM file.",
    ),
  ).toBeVisible();
}

test.use({ viewport: { width: 1440, height: 1000 } });

test.describe("R6 export", () => {
  test.setTimeout(300_000);

  test("exports a validated 720p WebM and supports cancellation and settings", async ({
    page,
  }, testInfo) => {
    await seedProject(page, fixture);
    await page.goto(`/studio/${fixture.id}`);
    await openExport(page);

    await page.getByLabel("Resolution").selectOption("720p");
    await page.getByRole("radio", { name: /WebM \/ VP9 \/ Opus/ }).check();
    await page.getByLabel("Quality").selectOption("high");
    await page.getByLabel("File name").fill("r6-export");
    await expect(page.getByLabel("File name")).toHaveValue("r6-export");

    await page.getByRole("button", { name: "Export video" }).click();
    const downloadPromise = page.waitForEvent("download");
    const link = page.getByRole("link", { name: "Download WebM" });
    await expect(link).toBeVisible({ timeout: 180_000 });
    await link.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("r6-export.webm");
    const filePath = testInfo.outputPath("r6-export.webm");
    await download.saveAs(filePath);
    const metadata = probe(filePath);
    expect(metadata.video.codec).toBe("vp9");
    expect(metadata.video.width).toBe(720);
    expect(metadata.video.height).toBe(1280);
    expect(metadata.audio?.codec).toBe("opus");
    expect(metadata.duration).toBeGreaterThan(2.5);
    expect(metadata.duration).toBeLessThan(3.5);

    await page.getByRole("button", { name: "Export video" }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByText("Export cancelled. No file was kept."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Download/ })).toHaveCount(0);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Frame rate").selectOption("60");
    await expect(page.getByText("1.5s · ok")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("3.0s · ok")).toBeVisible();

    await page.getByLabel("Export aspect ratio").selectOption("16:9");
    await expect(page.getByText("1920 x 1080")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("blocks a project over fifteen minutes", async ({ page }) => {
    const scene = fixture.scenes[0];
    if (!scene) throw new Error("Missing fixture scene");
    const longProject = {
      ...fixture,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      scenes: [{ ...scene, durationInFrames: 27_030 }],
    };
    await seedProject(page, longProject);
    await page.goto(`/studio/${longProject.id}`);
    await openExport(page);
    await expect(
      page.getByText(/longer than the 15-minute export cap/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export video" }),
    ).toBeDisabled();
  });
  test("exports a validated MP4 when the browser supports it", async ({
    page,
  }, testInfo) => {
    await seedProject(page, fixture);
    await page.goto(`/studio/${fixture.id}`);
    await openExport(page);
    await expect(page.getByText("Ready to render.")).toBeVisible({
      timeout: 60_000,
    });
    const mp4 = page.getByRole("radio", { name: /MP4 \/ H\.264 \/ AAC/ });
    test.skip(!(await mp4.isEnabled()), "MP4 encoding is unavailable.");
    await page.getByLabel("Resolution").selectOption("720p");
    await mp4.check();
    await page.getByRole("button", { name: "Export video" }).click();
    const downloadPromise = page.waitForEvent("download");
    const link = page.getByRole("link", { name: "Download MP4" });
    await expect(link).toBeVisible({ timeout: 180_000 });
    await link.click();
    const download = await downloadPromise;
    const filePath = testInfo.outputPath("r6-export.mp4");
    await download.saveAs(filePath);
    const metadata = probe(filePath);
    expect(metadata.video.codec).toBe("h264");
    expect(metadata.video.width).toBe(720);
    expect(metadata.video.height).toBe(1280);
    expect(metadata.audio?.codec).toBe("aac");
  });
});
