import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import puzzleData from "../src/features/library/puzzles/puzzles.generated.json";

const CRITICAL_PGN = readFileSync(
  "src/features/games/fixtures/r3-critical.pgn",
  "utf8",
);

function firstPuzzle() {
  return [...puzzleData.puzzles]
    .filter((puzzle) => puzzle.rating >= 600 && puzzle.rating <= 2400)
    .sort(
      (left, right) =>
        right.popularity - left.popularity ||
        left.rating - right.rating ||
        left.id.localeCompare(right.id),
    )[0];
}

test.describe("R8 Chess Library", () => {
  test.setTimeout(120_000);

  test("opens every Library area", async ({ page }) => {
    await page.goto("/library");
    await expect(
      page.getByRole("heading", { name: "Chess Library", level: 1 }),
    ).toBeVisible();
    for (const label of [
      "Openings",
      "Repertoire",
      "Practice",
      "My Games",
      "Reference",
    ]) {
      await expect(
        page.getByRole("link", { name: new RegExp(`^${label}`) }),
      ).toBeVisible();
    }
  });

  test("searches an opening and shows named continuations", async ({
    page,
  }) => {
    await page.goto("/library/openings");
    await expect(
      page.getByRole("heading", { name: "Opening Explorer", level: 1 }),
    ).toBeVisible();
    await page.getByLabel("Search openings").fill("Ruy Lopez");
    await page
      .getByRole("button", { name: /Ruy Lopez/ })
      .first()
      .click();
    await expect(page.getByLabel("Opening explorer board")).toBeVisible();
    await expect(page.getByText("Named continuations")).toBeVisible();
  });

  test("moves through an opening with keyboard controls", async ({ page }) => {
    await page.goto("/library/openings");
    await page.getByLabel("Search openings").fill("Ruy Lopez");
    await page
      .getByRole("button", { name: /Ruy Lopez/ })
      .first()
      .click();
    const previous = page.getByRole("button", { name: "Previous move" });
    await expect(previous).toBeEnabled();
    await previous.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "First move" }),
    ).toBeVisible();
  });

  test("solves a puzzle after one wrong answer", async ({ page }) => {
    const puzzle = firstPuzzle();
    expect(puzzle).toBeTruthy();
    if (!puzzle) return;
    const chess = new Chess(puzzle.fen);
    const setup = chess.move({
      from: puzzle.moves[0].slice(0, 2),
      to: puzzle.moves[0].slice(2, 4),
      promotion: puzzle.moves[0].length === 5 ? puzzle.moves[0][4] : undefined,
    });
    expect(setup).toBeTruthy();
    const expected = puzzle.moves[1];
    const wrong = chess
      .moves({ verbose: true })
      .map((move) => `${move.from}${move.to}${move.promotion ?? ""}`)
      .find((move) => move !== expected);
    expect(wrong).toBeTruthy();
    if (!wrong) return;

    await page.goto("/library/practice");
    await expect(page.getByText("Find the best move")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByLabel("Puzzle answer").fill(wrong);
    await page.getByRole("button", { name: "Play move" }).click();
    await expect(page.getByText(/Not this time/)).toBeVisible();
    await page.getByLabel("Puzzle answer").fill(expected);
    await page.getByRole("button", { name: "Play move" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
  });

  test("shows game insights and opens a mistake drill", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(700);
    await page.getByLabel("Add player name").fill("White");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText("Settings saved to this device."),
    ).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Engine" }).click();
    await page.locator("#engine-depth").fill("6");
    await page.getByRole("button", { name: "Save engine settings" }).click();

    await page.goto("/analysis");
    await page.getByLabel("PGN text").fill(CRITICAL_PGN);
    await page.getByRole("button", { name: "Parse PGN" }).click();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Analyse game" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse game" }),
    ).toBeVisible({ timeout: 180_000 });

    await page.goto("/library/games");
    await page.getByRole("link", { name: "Insights" }).first().click();
    await expect(page.getByText("Mistake trainer")).toBeVisible();
    const mistake = page.getByRole("button", { name: /g4/ }).first();
    await expect(mistake).toBeVisible();
    await mistake.click();
    await expect(page.getByLabel("Mistake practice board")).toBeVisible();
  });

  test("creates a repertoire line", async ({ page }) => {
    await page.goto("/library/repertoire");
    await page.getByRole("button", { name: "New line" }).click();
    await page.getByLabel("Line name").fill("R8 test line");
    await page.getByLabel("Moves").fill("1. e4 e5 2. Nf3 Nc6");
    await page.getByRole("button", { name: "Save line" }).click();
    await expect(page.getByText("R8 test line")).toBeVisible();
    await page.reload();
    await expect(page.getByText("R8 test line")).toBeVisible();
  });

  test("loads a puzzle and a reference article", async ({ page }) => {
    await page.goto("/library/practice");
    await expect(page.getByText("Find the best move")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("link", { name: "Reference", exact: true }).click();
    await page.getByLabel("Search reference articles").fill("Lucena");
    await page.locator('a[href="/library/reference/lucena-position"]').click();
    await expect(
      page.getByRole("heading", { name: "Lucena Position", level: 1 }),
    ).toBeVisible();
  });

  test("marks an article complete and saves a note", async ({ page }) => {
    await page.goto("/library/reference/lucena-position");
    await page.getByRole("button", { name: "Mark complete" }).click();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();
    await page
      .getByLabel("Article note")
      .fill("Bridge the king before promoting.");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("Article note saved.")).toBeVisible();
  });

  test("global search finds notes and repertoire lines", async ({ page }) => {
    await page.goto("/library/repertoire");
    await page.getByRole("button", { name: "New line" }).click();
    await page.getByLabel("Line name").fill("Searchable line");
    await page.getByLabel("Moves").fill("1. d4 d5");
    await page.getByRole("button", { name: "Save line" }).click();
    await page.goto("/library/reference/lucena-position");
    await page.getByLabel("Article note").fill("Searchable note");
    await page.getByRole("button", { name: "Save note" }).click();
    await page.goto("/library");
    await page.getByLabel("Search Chess Library").fill("Searchable");
    await expect(page.getByText("Loading local index")).toBeHidden({
      timeout: 30_000,
    });
    await expect(page.getByText("Searchable line")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Lucena Position Searchable note/ }),
    ).toBeVisible();
  });

  test("global search finds a reference article", async ({ page }) => {
    await page.goto("/library");
    await page.getByLabel("Search Chess Library").fill("Lucena");
    await expect(page.getByText("Loading local index")).toBeHidden({
      timeout: 30_000,
    });
    await expect(
      page.locator('a[href="/library/reference/lucena-position"]'),
    ).toBeVisible();
  });
});
