import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

const R1_PGN = readFileSync(
  "src/features/games/fixtures/r1-walking-skeleton.pgn",
  "utf8",
);

const PROJECT_FIXTURE = JSON.parse(
  readFileSync("src/features/studio/fixtures/r5-project.json", "utf8"),
) as { id: string; name: string };

async function importPgn(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
}

async function seedProject(page: Page) {
  await page.goto("/studio");
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
  }, PROJECT_FIXTURE);
}

async function expectVisibleFocus(locator: Locator, page: Page) {
  await locator.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(locator).toBeFocused();
  const styles = await locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outlineStyle: computed.outlineStyle,
      outlineWidth: Number.parseFloat(computed.outlineWidth),
      boxShadow: computed.boxShadow,
    };
  });
  expect(styles.focusVisible, "focused control must match :focus-visible").toBe(
    true,
  );
  const hasOutline = styles.outlineStyle !== "none" && styles.outlineWidth > 0;
  const hasRing = styles.boxShadow !== "none";
  expect(
    hasOutline || hasRing,
    `focused control needs a visible outline or ring (${JSON.stringify(styles)})`,
  ).toBe(true);
}

test.describe("R7 accessibility", () => {
  test.setTimeout(120_000);

  test("analysis replay is keyboard operable and announces the position", async ({
    page,
  }) => {
    await importPgn(page, R1_PGN);
    const board = page.getByRole("img", { name: /^Position:/ });
    await expect(board).toHaveAttribute(
      "aria-label",
      "Position: Starting position",
    );

    for (const name of [
      "First move",
      "Previous move",
      "Next move",
      "Last move",
    ]) {
      const control = page.getByRole("button", { name });
      await expect(control).toBeVisible();
      await expect(control).toHaveAccessibleName(name);
    }

    await page.keyboard.press("ArrowRight");
    await expect(board).toHaveAttribute("aria-label", "Position: Before 1. e4");
    await expect(page.getByRole("status")).toContainText(
      "Position: Before 1. e4",
    );
    await expect(
      page.getByRole("button", { name: /1\. e4/ }).first(),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      page.getByRole("button", { name: "Previous move" }),
    ).toBeEnabled();

    await page.keyboard.press("End");
    await expect(board).toHaveAttribute("aria-label", /^Position: Before /);
    await page.keyboard.press("Home");
    await expect(board).toHaveAttribute(
      "aria-label",
      "Position: Starting position",
    );

    const next = page.getByRole("button", { name: "Next move" });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(board).toHaveAttribute("aria-label", "Position: Before 1. e4");
    await expectVisibleFocus(next, page);
    await expectVisibleFocus(
      page.getByRole("button", { name: /1\. e4/ }).first(),
      page,
    );

    const moveButton = page.getByRole("button", { name: /1\. e4/ }).first();
    await expect(moveButton).toHaveAttribute("aria-current", "true");
  });

  test("the create-video dialog traps and restores keyboard focus", async ({
    page,
  }) => {
    await importPgn(page, R1_PGN);
    const trigger = page.getByRole("button", { name: "Create video" });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Create video" });
    await expect(dialog).toBeVisible();
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
    await expect(dialog).toContainText("Choose a source");

    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      );
      expect(inside, "Tab must stay inside the modal dialog").toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("studio timeline and export controls are keyboard operable", async ({
    page,
  }) => {
    await seedProject(page);
    await page.goto(`/studio/${PROJECT_FIXTURE.id}`);
    await expect(
      page.getByRole("heading", { name: PROJECT_FIXTURE.name, level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    for (const name of [
      "Play from start",
      "Pause",
      "Seek video",
      "Timeline frame",
      "Export video",
      "Cancel",
    ]) {
      await expect(
        page
          .getByRole("button", { name })
          .or(page.getByRole("slider", { name })),
      ).toHaveCount(1);
    }
    await expect(page.getByRole("img", { name: /^Text track:/ })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /^Annotations track:/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /^Audio track:/ }),
    ).toBeVisible();

    const play = page.getByRole("button", { name: "Play from start" });
    await play.focus();
    await page.keyboard.press("Enter");
    const frame = page.locator("#studio-frame");
    await expect
      .poll(async () => Number(await frame.inputValue()))
      .toBeGreaterThan(0);
    const pause = page.getByRole("button", { name: "Pause" });
    await pause.focus();
    await page.keyboard.press("Enter");
    const pausedFrame = Number(await frame.inputValue());
    await page.waitForTimeout(400);
    expect(Number(await frame.inputValue())).toBeLessThanOrEqual(
      pausedFrame + 2,
    );

    const sceneTwo = page.getByRole("button", { name: "02 move" });
    await sceneTwo.focus();
    await page.keyboard.press("Enter");
    await expect(sceneTwo).toHaveAttribute("aria-current", "true");
    const duration = page.getByLabel("Scene 2 duration frames");
    await expect(duration).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(duration).toBeFocused();
    for (let step = 0; step < 34; step += 1) {
      await duration.press("ArrowUp");
    }
    await page.keyboard.press("Tab");
    await expect(duration).toHaveValue("200");

    const moveDown = page.getByRole("button", { name: "Move scene 2 down" });
    await moveDown.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Move scene 3 down" }),
    ).toBeFocused();

    const seek = page.getByRole("slider", { name: "Timeline frame" });
    await seek.focus();
    await page.keyboard.press("Home");
    await expect(page.getByText(/scenes · .* frame 0$/)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/scenes · .* frame 1$/)).toBeVisible();

    await expectVisibleFocus(
      page.getByRole("button", { name: "Export video" }),
      page,
    );

    const applyTemplate = page.getByRole("button", { name: "Apply template" });
    await applyTemplate.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Apply template" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(applyTemplate).toBeFocused();

    await expect(page.getByLabel("File name")).toBeVisible();
    await expect(page.getByLabel("Resolution")).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /WebM/ }).first(),
    ).toBeVisible();
  });

  test("reduced motion keeps the workspace usable and still", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedProject(page);
    await page.goto(`/studio/${PROJECT_FIXTURE.id}`);
    await expect(
      page.getByRole("heading", { name: PROJECT_FIXTURE.name, level: 1 }),
    ).toBeVisible({ timeout: 30_000 });

    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduced).toBe(true);

    const transition = await page
      .getByRole("button", { name: "Undo" })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    for (const value of transition.split(",")) {
      expect(Number.parseFloat(value)).toBeLessThanOrEqual(0.02);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  });
});
