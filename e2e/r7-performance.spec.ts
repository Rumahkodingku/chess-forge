import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const SHELL_BUDGET_MS = 2000;
const PROJECT_OPEN_BUDGET_MS = 2000;
const MOVE_NAV_BUDGET_MS = 100;
const LONG_TASK_BUDGET_MS = 200;
const CI_MULTIPLIER = process.env.CI ? 2 : 1;

// The spec runs in the production project; CI keeps the documented 2x tolerance.
function budgetFor(target: number): number {
  return target * CI_MULTIPLIER;
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

function expectLongTasks(records: LongTaskRecord[], flow: string) {
  const max = records.length
    ? Math.max(...records.map((record) => record.duration))
    : 0;
  const limit = budgetFor(LONG_TASK_BUDGET_MS);
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
  // The app must create the versioned stores before the raw seed opens the DB.
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

    const session = await context.newCDPSession(page);
    await session.send("Network.clearBrowserCache");

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
    // performance.now() is relative to this document's navigation start.
    const raw = await page.evaluate(() => performance.now());
    expect(raw).toBeGreaterThan(0);

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
      `[perf] shell usable: ${raw.toFixed(1)} ms (budget ${budgetFor(SHELL_BUDGET_MS)} ms)`,
    );
    expect(
      raw,
      `shell took ${raw.toFixed(1)} ms (budget ${budgetFor(SHELL_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(SHELL_BUDGET_MS));

    // __longTasks is recreated for this document by addInitScript.
    const durations = await readLongTasks(page);
    expectLongTasks(durations, "shell");
    await testInfo.attach("shell-performance.json", {
      body: JSON.stringify(
        {
          rawMs: raw,
          budgetMs: budgetFor(SHELL_BUDGET_MS),
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
      sessionStorage.setItem("perf:project-open-start", String(Date.now()));
    });
    await openLink.click();
    await expect(
      page.getByRole("heading", { name: PROJECT_FIXTURE.name, level: 1 }),
    ).toBeVisible();
    const raw = await page.evaluate(() => {
      const start = Number(
        sessionStorage.getItem("perf:project-open-start") ?? "0",
      );
      return Date.now() - start;
    });
    expect(raw).toBeGreaterThan(0);
    console.log(
      `[perf] project open: ${raw.toFixed(1)} ms (budget ${budgetFor(PROJECT_OPEN_BUDGET_MS)} ms)`,
    );
    expect(
      raw,
      `project open took ${raw.toFixed(1)} ms (budget ${budgetFor(PROJECT_OPEN_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(PROJECT_OPEN_BUDGET_MS));

    const durations = (await readLongTasks(page)).slice(longTasksBeforeOpen);
    expectLongTasks(durations, "project open");
    await testInfo.attach("project-open-performance.json", {
      body: JSON.stringify(
        {
          rawMs: raw,
          budgetMs: budgetFor(PROJECT_OPEN_BUDGET_MS),
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
    const board = page.getByRole("img", { name: /^Position:/ });
    await expect(board).toBeVisible();
    const initialLabel = await board.getAttribute("aria-label");
    expect(initialLabel).toBe("Position: Starting position");
    await expect(page.getByRole("button", { name: "Next move" })).toBeEnabled();

    const longTasksBeforeMove = (await readLongTasks(page)).length;

    const measurement = await page.evaluate(async (steps) => {
      // Headless Chromium only paints when the page changes. A compositor-only
      // animation keeps frames flowing so the baseline and the steps share the
      // same frame clock.
      const pump = document.createElement("div");
      pump.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none";
      document.body.append(pump);
      const animation = pump.animate([{ opacity: 1 }, { opacity: 0.99 }], {
        duration: 500,
        iterations: Number.POSITIVE_INFINITY,
      });

      // One paint plus setTimeout(0) lands after the frame is presented.
      function paint(): Promise<number> {
        const start = performance.now();
        return new Promise<number>((resolve) =>
          requestAnimationFrame(() =>
            setTimeout(() => resolve(performance.now() - start), 0),
          ),
        );
      }

      const baseline: number[] = [];
      for (let index = 0; index < 3; index += 1) {
        baseline.push(await paint());
      }

      const samples: number[] = [];
      for (let step = 0; step < steps; step += 1) {
        const start = performance.now();
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => setTimeout(() => resolve(), 0)),
        );
        samples.push(performance.now() - start);
      }

      animation.cancel();
      pump.remove();
      return { baseline, samples };
    }, MOVE_STEPS);

    const sortedBaseline = [...measurement.baseline].sort(
      (left, right) => left - right,
    );
    const baselineMs =
      sortedBaseline[Math.floor(sortedBaseline.length / 2)] ?? 0;
    const adjusted = measurement.samples.map((sample) =>
      Math.max(0, sample - baselineMs),
    );
    const max = Math.max(...adjusted);

    await expect
      .poll(() => board.getAttribute("aria-label"))
      .not.toBe(initialLabel);
    await expect(
      page.getByRole("button", { name: "Previous move" }),
    ).toBeEnabled();
    const finalLabel = await board.getAttribute("aria-label");
    console.log(
      `[perf] move navigation: max ${max.toFixed(1)} ms over ${MOVE_STEPS} steps after ${baselineMs.toFixed(1)} ms baseline (budget ${budgetFor(MOVE_NAV_BUDGET_MS)} ms)`,
      adjusted.map((sample) => sample.toFixed(1)),
      finalLabel,
    );

    const durations = (await readLongTasks(page)).slice(longTasksBeforeMove);
    expectLongTasks(durations, "move navigation");
    expect(
      max,
      `move navigation peaked at ${max.toFixed(1)} ms after subtracting the ${baselineMs.toFixed(1)} ms paint baseline (budget ${budgetFor(MOVE_NAV_BUDGET_MS)} ms)`,
    ).toBeLessThanOrEqual(budgetFor(MOVE_NAV_BUDGET_MS));
    await testInfo.attach("move-navigation-performance.json", {
      body: JSON.stringify(
        {
          baselineSamples: measurement.baseline,
          baselineMs,
          samples: measurement.samples,
          adjusted,
          initialLabel,
          finalLabel,
          maxMs: max,
          budgetMs: budgetFor(MOVE_NAV_BUDGET_MS),
          longTasks: durations,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
});
