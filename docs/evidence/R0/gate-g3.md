# Gate G3 Evidence: PGN Feasibility

- Date: 2026-11-22
- Environment: Vitest, jsdom, Node 26.9
- Status: PASS

## Result

PGN fixtures parse into the internal game model, and invalid input fails with a useful error.

| Fixture | Result |
| --- | --- |
| Standard game | PASS |
| Headers, comments, NAGs, variations | PASS |
| Non-standard starting FEN | PASS |
| Multiple games | PASS |
| Illegal SAN | PASS with ply and SAN detail |
| Empty input | PASS with clear error |
| Unsupported variant | PASS with clear error |
| 200 ply long game | PASS |

## Automated tests

`npm run test` reports 17 passing tests across 5 files. PGN and adapter coverage includes:

- `src/features/games/pgn.test.ts`
- `src/features/games/adapters/chesscom.test.ts`
- `src/features/games/adapters/lichess.test.ts`
- `src/features/games/fixtures/long-game.pgn`

## Live smoke

- Chess.com monthly archive: 81 games returned and converted to the internal model.
- Lichess user games: 1 game returned and converted to the internal model.
- Invalid username: HTTP 400 with a validation error.
- Rate limit: request 31 returned HTTP 429 after 30 accepted requests.

## Evidence

- Playwright smoke test parses the standard fixture and sees the parsed result.
- The lab is available at `/labs/pgn`.
