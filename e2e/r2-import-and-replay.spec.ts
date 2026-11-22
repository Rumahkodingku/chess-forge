import { expect, type Page, test } from "@playwright/test";
import lichessGame from "./fixtures/r2-lichess-game.json";

const MULTI_GAME_PGN = `[Event "First"]
[Site "local"]
[Date "2024.01.01"]
[White "First White"]
[Black "First Black"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Second"]
[Site "local"]
[Date "2023.01.01"]
[White "A"]
[Black "B"]
[Result "0-1"]

1. d4 d5 0-1`;

const REPLAY_PGN = `[Event "Replay"]
[Site "local"]
[Date "2024.02.01"]
[White "Replay White"]
[Black "Replay Black"]
[Result "*"]

1. e4 d5 2. exd5 $1 {test comment} Qxd5 3. Nc3 *`;

const MATE_PGN = `[Event "Mate"]
[White "Mate White"]
[Black "Mate Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`;

async function importPastedGame(page: Page, pgn: string) {
  await page.goto("/analysis");
  await page.getByLabel("PGN text").fill(pgn);
  await page.getByRole("button", { name: "Parse PGN" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
}

test.describe("R2 import and replay", () => {
  test.setTimeout(120_000);

  test("pastes multiple games, selects the second, previews, and confirms", async ({
    page,
  }) => {
    await page.goto("/analysis");
    await page.getByLabel("PGN text").fill(MULTI_GAME_PGN);
    await page.getByRole("button", { name: "Parse PGN" }).click();

    await expect(page.getByText(/2 games found/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /First White/ }),
    ).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: /A vs B/ }).click();
    await expect(page.getByRole("button", { name: /A vs B/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("0-1 · 2 ply · Second")).toBeVisible();

    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "A vs B" })).toBeVisible();
  });

  test("uploads a PGN file", async ({ page }) => {
    await page.goto("/analysis?source=file");
    await expect(
      page.getByText("Upload PGN file", { exact: true }),
    ).toBeVisible();

    await page.locator("#pgn-file").setInputFiles({
      name: "multi.pgn",
      mimeType: "text/plain",
      buffer: Buffer.from(MULTI_GAME_PGN),
    });
    await expect(page.getByText(/multi\.pgn/)).toBeVisible();
    await page.getByRole("button", { name: "Parse file" }).click();
    await expect(page.getByText(/2 games found/)).toBeVisible();
  });

  test("rejects a binary file", async ({ page }) => {
    await page.goto("/analysis?source=file");
    await expect(
      page.getByText("Upload PGN file", { exact: true }),
    ).toBeVisible();

    await page.locator("#pgn-file").setInputFiles({
      name: "binary.pgn",
      mimeType: "text/plain",
      buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
    });
    await expect(page.getByText(/binary\.pgn/)).toBeVisible();
    await page.getByRole("button", { name: "Parse file" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /binary data/i }),
    ).toBeVisible();
  });

  test("imports a mocked Chess.com game through archives and preview", async ({
    page,
  }) => {
    await page.route("**/api/chesscom/archives**", (route) =>
      route.fulfill({
        json: {
          archives: ["https://api.chess.com/pub/player/testuser/games/2024/01"],
        },
      }),
    );
    await page.route("**/api/chesscom/games**", (route) =>
      route.fulfill({
        json: {
          games: [
            {
              url: "https://www.chess.com/game/live/r2-fixture",
              uuid: "r2-fixture",
              rules: "chess",
              pgn: `[Event "Chess.com R2"]
[Site "Chess.com"]
[Date "2024.03.01"]
[White "ChessCom White"]
[Black "ChessCom Black"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`,
              white: { username: "ChessCom White", result: "win" },
              black: { username: "ChessCom Black", result: "resigned" },
              timeClass: "blitz",
              endTime: 1709251200,
            },
          ],
          total: 1,
          warnings: [],
        },
      }),
    );

    await page.goto("/analysis?source=chesscom");
    await page.getByLabel("Chess.com username").fill("testuser");
    await page.getByRole("button", { name: "Load archives" }).click();
    await expect(page.getByLabel("Month")).toBeVisible();
    await page.getByRole("button", { name: "Load games" }).click();

    await expect(
      page.getByText("ChessCom White vs ChessCom Black", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm import" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "ChessCom White vs ChessCom Black" }),
    ).toBeVisible();
  });

  test("imports a mocked Lichess game by username and by reference", async ({
    page,
  }) => {
    await page.route("**/api/lichess/games**", (route) =>
      route.fulfill({ json: { games: [lichessGame], total: 1 } }),
    );
    await page.route("**/api/lichess/game/**", (route) =>
      route.fulfill({ json: { game: lichessGame } }),
    );

    await page.goto("/analysis?source=lichess");
    await page.getByLabel("Lichess username").fill("testuser");
    await page.getByRole("button", { name: "Load games" }).click();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Lichess White vs Lichess Black" }),
    ).toBeVisible();

    await page.goto("/analysis?source=lichess");
    await page.getByRole("button", { name: "Game reference" }).click();
    await page
      .getByLabel("Game ID or URL")
      .fill("https://lichess.org/abcd1234");
    await page.getByRole("button", { name: "Load games" }).click();
    await page.getByRole("button", { name: "Confirm import" }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Lichess White vs Lichess Black" }),
    ).toBeVisible();
  });

  test("replays with Chessground, captured pieces, annotations, and move detail", async ({
    page,
  }) => {
    await importPastedGame(page, REPLAY_PGN);

    const board = page.locator(".cg-wrap");
    await expect(board).toHaveClass(/cg-theme-forge/);
    await expect(page.locator("cg-board piece")).toHaveCount(32);

    await page.keyboard.press("End");
    await expect(page.getByRole("button", { name: /3\. Nc3/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(
      page.getByRole("img", { name: "Replay White captured pawn" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Replay Black captured pawn" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /2\. exd5/ }).click();
    await expect(
      page.locator("dd").filter({ hasText: "test comment" }),
    ).toBeVisible();
    await expect(page.getByText("Move detail")).toBeVisible();

    await page.keyboard.press("Home");
    await expect(page.getByRole("button", { name: "Start" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    const boardBox = await page.locator("cg-board").boundingBox();
    expect(boardBox).not.toBeNull();
    if (!boardBox) return;

    await page.mouse.move(
      boardBox.x + boardBox.width * 0.2,
      boardBox.y + boardBox.height * 0.8,
    );
    await page.mouse.down({ button: "right" });
    await page.mouse.move(
      boardBox.x + boardBox.width * 0.6,
      boardBox.y + boardBox.height * 0.4,
      { steps: 8 },
    );
    await page.waitForTimeout(150);
    await page.mouse.up({ button: "right" });
    await expect(page.locator(".cg-shapes line").first()).toBeVisible();

    await page.getByRole("button", { name: "Flip board" }).click();
    await expect(board).toHaveClass(/orientation-black/);
    await expect(page.locator(".cg-shapes line")).toHaveCount(0);
    await page.waitForTimeout(200);

    const flippedBox = await page.locator("cg-board").boundingBox();
    expect(flippedBox).not.toBeNull();
    if (!flippedBox) return;

    await page.mouse.move(
      flippedBox.x + flippedBox.width * 0.5,
      flippedBox.y + flippedBox.height * 0.5,
    );
    await page.mouse.down({ button: "right" });
    await page.waitForTimeout(250);
    await page.mouse.up({ button: "right" });
    await expect(page.locator(".cg-shapes circle").first()).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".cg-shapes circle")).toHaveCount(0);
  });

  test("shows check and last-move highlights on the selected ply", async ({
    page,
  }) => {
    await importPastedGame(page, MATE_PGN);

    await expect(
      page.getByRole("heading", { name: "Mate White vs Mate Black" }),
    ).toBeVisible();
    await expect(page.locator("cg-board piece")).toHaveCount(32);
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: /2\.\.\. Qh4#/ }),
    ).toHaveAttribute("aria-current", "true");
    await expect(page.locator("cg-board square.check")).toHaveCount(1);
    await expect(page.locator("cg-board square.last-move")).toHaveCount(2);
  });
});
