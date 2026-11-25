import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const R1_PGN = readFileSync(
  "src/features/games/fixtures/r1-walking-skeleton.pgn",
  "utf8",
);

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

async function setEngineDepth(page: Page, depth: number) {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Engine" }).click();
  await page.locator("#engine-depth").fill(String(depth));
  await page.getByRole("button", { name: "Save engine settings" }).click();
  await expect(page.getByText("Settings saved to this device.")).toBeVisible();
}

test.describe("R7 release production", () => {
  test.setTimeout(600_000);
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("runs the seven scenarios and project restore with external hosts blocked", async ({
    page,
    context,
  }, testInfo) => {
    await context.route(
      (url) =>
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.hostname !== "localhost" &&
        url.hostname !== "127.0.0.1",
      (route) => route.abort(),
    );
    const externalRequests: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!/^https?:/.test(url)) return;
      const parsed = new URL(url);
      if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        externalRequests.push(url);
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await setEngineDepth(page, 6);

    await page.goto("/analysis");
    await page.getByLabel("PGN text").fill(R1_PGN);
    await page.getByRole("button", { name: "Parse PGN" }).click();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "White vs Black" }),
    ).toBeVisible();
    await expect(page.locator("cg-board piece")).toHaveCount(32);
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: /5\.\.\. Be7/ }),
    ).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 180_000 });
    await page.getByRole("button", { name: "3. Bb5" }).click();
    await expect(page.getByText("Evaluation before")).toBeVisible();
    await expect(page.getByText("Evaluation after")).toBeVisible();

    await page.getByRole("button", { name: "Create 3-second scene" }).click();
    await page.waitForURL(/\/studio\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Project details")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator("[data-scene-text]").filter({ hasText: "3. Bb5" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Apply template" }).click();
    const applyDialog = page.getByRole("dialog", { name: "Apply template" });
    await applyDialog.locator("select").selectOption("tactical-breakdown");
    await applyDialog
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    await expect(applyDialog).toBeHidden();
    await page.getByLabel("Text move-label").first().fill("Production move");
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page.getByText("Autosaved to IndexedDB.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Project details")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel("Text move-label").first()).toHaveValue(
      "Production move",
    );
    await page.goto("/studio");
    await page.getByRole("link", { name: "Open" }).first().click();
    await expect(page.getByText("Project details")).toBeVisible();

    await page.getByLabel("Resolution").selectOption("720p");
    await page.getByRole("radio", { name: /WebM \/ VP9 \/ Opus/ }).check();
    await page.getByRole("button", { name: "Export video" }).click();
    const link = page.getByRole("link", { name: "Download WebM" });
    await expect(link).toBeVisible({ timeout: 180_000 });
    const videoDownloadPromise = page.waitForEvent("download");
    await link.click();
    const videoDownload = await videoDownloadPromise;
    const videoPath = testInfo.outputPath("r7-production.webm");
    await videoDownload.saveAs(videoPath);
    const video = probe(videoPath);
    expect(video.container).toContain("webm");
    expect(video.video.codec).toBe("vp9");
    expect(video.video.width).toBe(720);
    expect(video.video.height).toBe(1280);
    expect(video.duration).toBeGreaterThan(2.5);
    expect(video.duration).toBeLessThan(3.5);

    const backupPath = testInfo.outputPath("r7-production.chessforge");
    const backupDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export project backup" }).click();
    const backupDownload = await backupDownloadPromise;
    await backupDownload.saveAs(backupPath);
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

    expect(
      externalRequests.every((url) =>
        url.startsWith("https://www.remotion.pro/api/track/"),
      ),
      "only optional Remotion renderer telemetry may attempt an external request",
    ).toBe(true);
    expect(pageErrors, "no uncaught page errors").toEqual([]);
    const knownNoise = [
      /Mediabunny was loaded twice/,
      /Failed to load resource: net::ERR_FAILED/,
      /Failed to send usage event/,
    ];
    expect(
      consoleErrors.filter(
        (message) => !knownNoise.some((pattern) => pattern.test(message)),
      ),
      "no critical console errors",
    ).toEqual([]);
  });
});
