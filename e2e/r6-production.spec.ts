import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const fixture = JSON.parse(
  readFileSync("src/features/studio/fixtures/r6-export-project.json", "utf8"),
);

async function seedProject(page: Page) {
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
  }, fixture);
}

test.use({ viewport: { width: 1440, height: 1000 } });

test("R6 production export produces a validated 720p WebM", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await seedProject(page);
  await page.goto(`/studio/${fixture.id}`);
  await expect(
    page.getByRole("heading", { name: "White vs Black" }),
  ).toBeVisible();

  await page.getByLabel("Resolution").selectOption("720p");
  await page.getByRole("radio", { name: /WebM \/ VP9 \/ Opus/ }).check();
  await page.getByRole("button", { name: "Export video" }).click();
  const downloadPromise = page.waitForEvent("download");
  const link = page.getByRole("link", { name: "Download WebM" });
  await expect(link).toBeVisible({ timeout: 180_000 });
  await link.click();
  const download = await downloadPromise;
  const filePath = testInfo.outputPath("r6-production.webm");
  await download.saveAs(filePath);
  const output = execFileSync(
    "node",
    ["scripts/validate-video.mjs", filePath],
    {
      encoding: "utf8",
    },
  );
  const metadata = JSON.parse(
    output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1),
  ) as {
    duration: number;
    video: { codec: string; width: number; height: number };
    audio: { codec: string } | null;
  };
  expect(metadata.video).toMatchObject({
    codec: "vp9",
    width: 720,
    height: 1280,
  });
  expect(metadata.audio?.codec).toBe("opus");
  expect(metadata.duration).toBeGreaterThan(2.5);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
