# Gate G6 Evidence: Game Import and Replay

- Date: 2026-11-22
- Environment: Linux, Chromium via Playwright, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

R2 imports real games from paste, file, Chess.com, and Lichess. Every source validates and previews before writing. The replay board is Chessground, read-only, with orientation, themes, captured pieces, navigation, and ephemeral annotations. The R1 walking skeleton still passes.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check` | PASS, 16 test files and 56 unit/integration tests, typecheck clean |
| `npm run lint` | PASS, 0 errors, 4 pre-existing `!important` warnings |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 14 browser tests |
| `npm run test:e2e:prod` | PASS, 2 production tests |
| Parser benchmark | 200 games parsed in 223 ms, so no worker is needed |

Dev E2E coverage:

- Multi-game paste, second-game selection, preview, confirm.
- File upload and binary-file rejection.
- Chess.com archives, month, games, preview, confirm.
- Lichess username and game-reference import.
- Chessground replay, captured pieces, annotations, move detail.
- Check and last-move highlights.
- R1 import, analysis, scene, export, save, reload, and reopen.

Production E2E coverage:

- R1 walking skeleton in the production bundle.
- R2 import and replay at 390 px with zero horizontal overflow.

## Live smoke

No credentials were requested or used.

| Source | Input | Result |
| --- | --- | --- |
| Chess.com | `erik`, archive `2026-10` | 15 standard games returned, 1 variant warning, game imported in the browser |
| Lichess | `DrNykterstein`, max 1 | 1 game returned, 91 plies, game imported in the browser |

Screenshots:

- `docs/evidence/R2/live-chesscom-desktop.png`
- `docs/evidence/R2/live-chesscom-mobile.png`
- `docs/evidence/R2/live-lichess-desktop.png`
- `docs/evidence/R2/live-lichess-mobile.png`

## Verified behaviour

- Paste keeps each game's original PGN when the input contains multiple games.
- Invalid multi-game entries remain visible and cannot be selected.
- File import strips a UTF-8 BOM and warns on Windows-1252 fallback.
- Empty, oversized, and binary files show clear errors and write nothing.
- Chess.com variants are excluded with a source warning.
- Chess.com game URLs are used as source references.
- Lichess usernames and game references both import through the same preview.
- Import warnings persist on the game record.
- Board position always matches the selected ply.
- Last move, check, and checkmate highlights are visible.
- Captured pieces update with the selected ply, including en passant.
- Arrow and square annotations clear on ply and orientation changes.
- Move detail shows SAN, UCI, comment, NAG labels, variations, and both FENs.
- Dashboard shows five recent games and four source entry points.
- Analysis, replay, and dashboard have zero horizontal overflow at 390 px.

## Known limitations

- Chessground dragging and free-play variations are out of scope for R2.
- Variation lines are read-only text.
- R3 features (full analysis, classifications, game summary) are not included.
- `next start` still warns because the production build uses standalone output. Production E2E passes.
- Mediabunny still warns about duplicate loading during the build. R1 export remains green.

## Commands

```bash
npm run check
npm run build
npm run test:e2e
npm run test:e2e:prod
```
