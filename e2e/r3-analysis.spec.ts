import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const ANALYSIS_PGN = readFileSync(
  "src/features/games/fixtures/r3-analysis.pgn",
  "utf8",
);
const CRITICAL_PGN = readFileSync(
  "src/features/games/fixtures/r3-critical.pgn",
  "utf8",
);
const BRILLIANT_PGN = readFileSync(
  "src/features/games/fixtures/r3-brilliant.pgn",
  "utf8",
);

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

async function importPgn(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("R3 full Stockfish analysis", () => {
  test.setTimeout(240_000);

  test("analyses a position, shows search data, and steps a PV", async ({
    page,
  }) => {
    await setEngineDepth(page, 14);
    await importPgn(page, ANALYSIS_PGN);
    await page.getByRole("button", { name: /3\. Bb5/ }).click();
    await page.getByRole("button", { name: "Analyse position" }).click();

    await expect(page.getByText("Best move")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("PV 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/depth 14/).first()).toBeVisible();
    await expect(page.getByText(/nodes/).first()).toBeVisible();

    await page.getByRole("button", { name: "Step PV" }).first().click();
    await expect(page.getByText(/PV 1 · step 1 \//)).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(/PV 1 · step 2 \//)).toBeVisible();
    await page.getByRole("button", { name: "Back to game" }).click();
    await expect(page.getByRole("button", { name: /3\. Bb5/ })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.getByRole("button", { name: "Next move" }).click();
    await page.getByRole("button", { name: /3\. Bb5/ }).click();
    await expect(page.getByText(/Cached/)).toBeVisible({ timeout: 10_000 });
  });

  test("stops a long position search and keeps a partial result", async ({
    page,
  }) => {
    await setEngineDepth(page, 20);
    await importPgn(page, ANALYSIS_PGN);
    await page.getByRole("button", { name: /3\. Bb5/ }).click();
    await page.getByRole("button", { name: "Analyse position" }).click();
    await expect(page.getByText(/Depth \d+ · nodes/)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByText("Partial result")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Best move")).toBeVisible({ timeout: 30_000 });
  });

  test("pauses, resumes, and cancels full-game analysis", async ({ page }) => {
    await setEngineDepth(page, 20);
    await importPgn(page, ANALYSIS_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("button", { name: /Analyse game|Resume analysis/ }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("restores partial assessments from cache after a reload", async ({
    page,
  }) => {
    await setEngineDepth(page, 20);
    await importPgn(page, ANALYSIS_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(page.getByText(/[1-9] \/ 11 positions/)).toBeVisible({
      timeout: 60_000,
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "White vs Black" }),
    ).toBeVisible();
    await expect(page.getByText("Best").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Game summary")).toBeVisible();
  });

  test("runs full-game analysis, builds the summary, and restores it on reload", async ({
    page,
  }) => {
    await setEngineDepth(page, 6);
    await importPgn(page, ANALYSIS_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 180_000 });

    await expect(
      page.getByText("Ruy Lopez", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText("Candidate Brilliant").first()).toBeVisible();
    await expect(page.getByText("Best").first()).toBeVisible();
    await expect(
      page.getByText("Critical moments", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Side to move" }).click();
    await expect(page.getByText("Side to move").first()).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "White vs Black" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("Ruy Lopez", { exact: false }).first(),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await expectNoHorizontalOverflow(page);
  });

  test("jumps to a critical moment from the summary", async ({ page }) => {
    await setEngineDepth(page, 6);
    await importPgn(page, CRITICAL_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 180_000 });

    const moment = page.getByRole("button", { name: /g4.*(centipawns|Mate)/ });
    await expect(moment.first()).toBeVisible();
    await moment.first().click();
    await expect(page.getByRole("button", { name: /2\. g4/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("Blunder").first()).toBeVisible();
  });

  test("accepts and rejects a Candidate Brilliant and persists the decision", async ({
    page,
  }) => {
    await setEngineDepth(page, 14);
    await importPgn(page, BRILLIANT_PGN);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 180_000 });

    await page.getByRole("button", { name: /16\. Qb8/ }).click();
    await expect(page.getByText("Candidate Brilliant").first()).toBeVisible();

    await page.getByRole("button", { name: "Accept brilliant" }).click();
    await expect(page.getByText("Current: accepted")).toBeVisible();
    await expect(
      page.getByText("Brilliant", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByText("Current: rejected")).toBeVisible();

    await page.getByRole("button", { name: "Accept brilliant" }).click();
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Morphy vs Duke of Brunswick and Count Isouard",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /16\. Qb8/ }).click();
    await expect(page.getByText("Current: accepted")).toBeVisible({
      timeout: 30_000,
    });
  });
});
