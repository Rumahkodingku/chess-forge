import { expect, type Page, test } from "@playwright/test";
import fixture from "../src/features/studio/fixtures/r5-project.json";

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

test("R5 production project opens, seeks, and changes aspect ratio", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seedProject(page);
  await page.goto(`/studio/${fixture.id}`);

  await expect(
    page.getByRole("heading", { name: "White vs Black" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(page.getByText(/5 scenes ·/)).toBeVisible();

  const sceneButton = page.getByRole("button", { name: /02 move/ });
  await sceneButton.click();
  await expect(sceneButton).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#studio-frame")).toHaveValue(
    String(fixture.scenes[1]?.startFrame ?? 0),
  );

  await page.getByLabel("Aspect ratio").selectOption("1:1");
  await expect(page.getByText("1080 x 1080")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
