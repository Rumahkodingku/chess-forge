import { readFileSync } from "node:fs";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

const SHELL_BUDGET_MS = 2000;
const PROJECT_OPEN_BUDGET_MS = 2000;
const MOVE_NAV_BUDGET_MS = 100;
const LONG_TASK_BUDGET_MS = 200;
const CI_MULTIPLIER = process.env.CI ? 2 : 1;

// Dev-mode React, unminified CSS, and on-demand compilation are not the
// release measurement, so the dev project always uses the CI tolerance.
function budgetFor(testInfo: TestInfo, target: number): number {
  const multiplier = testInfo.project.name.includes("production")
    ? CI_MULTIPLIER
    : Math.max(CI_MULTIPLIER, 2);
  return target * multiplier;
}

const LONG_GAME_PGN = readFileSync(
  "src/features/games/fixtures/long-game.pgn",
  "utf8",
);

const PROJECT_FIXTURE = JSON.parse(
  readFileSync("src/features/studio/fixtures/r5-project.json", "utf8"),
) as { id: string; name: string };

const MOVE_STEPS = 12;

interface LongTaskRecord {
  startTime: number;
  duration: number;
  containerType?: string;
  containerName?: string;
}

interface LongTaskWindow extends Window {
  __longTasks?: LongTaskRecord[];
}

async function trackLongTasks(page: Page) {
  await page.addInitScript(() => {
    const target = window as LongTaskWindow;
    target.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const attribution = (
          entry as PerformanceEntry & {
            attribution?: Array<{
              containerType?: string;
              containerName?: string;
            }>;
          }
        ).attribution?.[0];
        target.__longTasks?.push({
          startTime: entry.startTime,
          duration: entry.duration,
          containerType: attribution?.containerType,
          containerName: attribution?.containerName,
        });
      }
    }).observe({ entryTypes: ["longtask"] });
  });
}

async function readLongTasks(page: Page): Promise<LongTaskRecord[]> {
  return page.evaluate(() => (window as LongTaskWindow).__longTasks ?? []);
}

function expectLongTasks(
  records: LongTaskRecord[],
  flow: string,
  testInfo: TestInfo,
) {
  const max = records.length
    ? Math.max(...records.map((record) => record.duration))
    : 0;
  const limit = budgetFor(testInfo, LONG_TASK_BUDGET_MS);
  console.log(
    `[perf] ${flow}: ${records.length} long task(s), max ${max.toFixed(1)} ms (limit ${limit} ms)`,
    records,
  );
  expect(
    max,
    `${flow} produced a ${max.toFixed(1)} ms long task (budget ${limit} ms)`,
  ).toBeLessThanOrEqual(limit);
}

async function seedProject(page: Page) {
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: "Studio", level: 1 }),
  ).toBeVisible();
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

async function importGame(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "Long vs Fixture", level: 1 }),
  ).toBeVisible();
}

test.describe("R7 performance budgets", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("initial shell is usable without Stockfish inside the budget", async ({
    page,
    context,
  }, testInfo) => {
    await trackLongTasks(page);
    // Warm the dev route so the measurement reflects the shipped app instead
    // of the first on-demand compilation.
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
    const longTasksBeforeNavigation = (await readLongTasks(page)).length;

    const session = await context.newCDPSession(page);
    await session.send("Network.clearBrowserCache");

    const start = Date.now();
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
    const elapsed = Date.now() - start;
    const navigationMs = await page.evaluate(() => performance.now());
    const raw = Math.max(elapsed, navigationMs);

    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    const stockfishResources = resources.filter((name) =>
      /stockfish/i.test(name),
    );
    expect(
      stockfishResources,
      "the shell must render without downloading Stockfish",
    ).toEqual([]);

    console.log(
      `[perf] shell usable: ${raw.toFixed(1)} ms (budget ${budgetFor(testInfo, SHELL_BUDGET_MS)} ms)`,
    );
    expect(
      raw,
      `shell took ${raw.toFixed(1)} ms (budget ${budgetFor(testInfo, SHELL_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(testInfo, SHELL_BUDGET_MS));

    const durations = (await readLongTasks(page)).slice(
      longTasksBeforeNavigation,
    );
    expectLongTasks(durations, "shell", testInfo);
    await testInfo.attach("shell-performance.json", {
      body: JSON.stringify(
        {
          rawMs: raw,
          budgetMs: budgetFor(testInfo, SHELL_BUDGET_MS),
          longTasks: durations,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("opens a typical local project inside the budget", async ({
    page,
  }, testInfo) => {
    await trackLongTasks(page);
    await seedProject(page);
    await page.reload();
    const openLink = page.getByRole("link", { name: "Open" }).first();
    await expect(openLink).toBeVisible({ timeout: 30_000 });

    // Warm the project route so the measurement excludes dev-only compilation.
    await openLink.click();
    await expect(
      page.getByRole("heading", { name: PROJECT_FIXTURE.name, level: 1 }),
    ).toBeVisible();
    await page.goto("/studio");
    await expect(openLink).toBeVisible({ timeout: 30_000 });
    const longTasksBeforeOpen = (await readLongTasks(page)).length;

    await page.evaluate(() => {
      sessionStorage.setItem(
        "perf:project-open-start",
        String(performance.now()),
      );
    });
    await openLink.click();
    await expect(
      page.getByRole("heading", { name: PROJECT_FIXTURE.name, level: 1 }),
    ).toBeVisible();
    const raw = await page.evaluate(() => {
      const start = Number(
        sessionStorage.getItem("perf:project-open-start") ?? "0",
      );
      return performance.now() - start;
    });

    console.log(
      `[perf] project open: ${raw.toFixed(1)} ms (budget ${budgetFor(testInfo, PROJECT_OPEN_BUDGET_MS)} ms)`,
    );
    expect(
      raw,
      `project open took ${raw.toFixed(1)} ms (budget ${budgetFor(testInfo, PROJECT_OPEN_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(testInfo, PROJECT_OPEN_BUDGET_MS));

    const durations = (await readLongTasks(page)).slice(longTasksBeforeOpen);
    expectLongTasks(durations, "project open", testInfo);
    await testInfo.attach("project-open-performance.json", {
      body: JSON.stringify(
        {
          rawMs: raw,
          budgetMs: budgetFor(testInfo, PROJECT_OPEN_BUDGET_MS),
          longTasks: durations,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("move navigation stays inside the budget", async ({
    page,
  }, testInfo) => {
    await trackLongTasks(page);
    await importGame(page, LONG_GAME_PGN);
    await expect(page.getByRole("img", { name: /^Position:/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next move" })).toBeEnabled();

    const longTasksBeforeMove = (await readLongTasks(page)).length;

    const samples = await page.evaluate(async (steps) => {
      const durations: number[] = [];
      for (let step = 0; step < steps; step += 1) {
        const start = performance.now();
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        durations.push(performance.now() - start);
      }
      return durations;
    }, MOVE_STEPS);

    const max = Math.max(...samples);
    const durations = (await readLongTasks(page)).slice(longTasksBeforeMove);
    console.log(
      `[perf] move navigation: max ${max.toFixed(1)} ms over ${MOVE_STEPS} steps (budget ${budgetFor(testInfo, MOVE_NAV_BUDGET_MS)} ms)`,
      samples.map((sample) => sample.toFixed(1)),
    );
    expectLongTasks(durations, "move navigation", testInfo);
    expect(
      max,
      `move navigation peaked at ${max.toFixed(1)} ms (budget ${budgetFor(testInfo, MOVE_NAV_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(testInfo, MOVE_NAV_BUDGET_MS));
    await testInfo.attach("move-navigation-performance.json", {
      body: JSON.stringify(
        {
          samples,
          maxMs: max,
          budgetMs: budgetFor(testInfo, MOVE_NAV_BUDGET_MS),
          longTasks: durations,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
});
