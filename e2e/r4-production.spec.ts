import { expect, type Page, test } from "@playwright/test";
import fixture from "../src/features/studio/fixtures/r4-project.json";

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

test("R4 production preview and scene seek work at 390 px", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await seedProject(page);
  await page.goto(`/studio/${fixture.id}`);
  await expect(
    page.getByRole("heading", { name: "R4 animation fixture" }),
  ).toBeVisible();

  const sceneButton = page.getByRole("button", { name: /03 move/ });
  await sceneButton.click();
  await expect(sceneButton).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#studio-frame")).toHaveValue("165");

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
