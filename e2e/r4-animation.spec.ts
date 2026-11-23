import { expect, type Page, test } from "@playwright/test";
import fixture from "../src/features/studio/fixtures/r4-project.json";

const WARNING_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function warningProject() {
  return {
    ...fixture,
    id: WARNING_PROJECT_ID,
    name: "R4 warning fixture",
    scenes: fixture.scenes.map((scene, index) =>
      index === 0
        ? {
            ...scene,
            textOverlays: scene.textOverlays.map((overlay) => ({
              ...overlay,
              position: "top",
              y: 100,
            })),
          }
        : scene,
    ),
    audioTracks: [
      ...fixture.audioTracks,
      {
        id: "missing-audio",
        kind: "music",
        source: {
          type: "asset",
          assetId: "00000000-0000-4000-8000-000000000000",
        },
        startFrame: 0,
        durationInFrames: 30,
        volume: 1,
        muted: false,
        loop: false,
      },
    ],
  };
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

test.describe("R4 animation core", () => {
  test.setTimeout(120_000);

  test("plays the sequence, seeks scenes, and animates moves", async ({
    page,
  }) => {
    await seedProject(page, fixture);
    await page.goto(`/studio/${fixture.id}`);

    await expect(
      page.getByRole("heading", { name: "R4 animation fixture" }),
    ).toBeVisible();
    await expect(page.getByText("The Ruy Lopez")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Audio tracks")).toBeVisible();
    await expect(page.getByText("4 scenes", { exact: true })).toBeVisible();

    const sceneButton = page.getByRole("button", { name: /03 move/ });
    await sceneButton.click();
    await expect(sceneButton).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#studio-frame")).toHaveValue("165");
    await expect(page.locator("[data-scene-camera]")).toHaveAttribute(
      "style",
      /scale\(1\.5\)/,
    );

    await page.locator("#studio-frame").fill("189");
    await expect(page.locator("[data-moving-piece]").first()).toBeVisible();

    await page.getByRole("button", { name: "Play from start" }).click();
    await expect
      .poll(async () => {
        const value = await page.locator("#studio-frame").inputValue();
        return Number(value);
      })
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Pause", exact: true }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("shows audio and text safe-area warnings without blocking preview", async ({
    page,
  }) => {
    const project = warningProject();
    await seedProject(page, project);
    await page.goto(`/studio/${project.id}`);

    await expect(
      page.getByText("Preview warnings", { exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Audio asset .* missing/)).toBeVisible();
    await expect(page.getByText(/safe area/).first()).toBeVisible();
    await expect(page.getByText("The Ruy Lopez")).toBeVisible();
  });
});
