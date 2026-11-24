# R8 — Gate G12 Evidence

**Date:** 2026-11-24
**Gate:** G12
**Status:** Passed with documented content-depth limitation

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Lint, typecheck, unit tests, production build | `npm run check:all` | Passed |
| Unit and integration tests | `npm test` | 63 files, 306 tests passed |
| Development E2E (R8 only) | `npx playwright test e2e/r8-library.spec.ts` | 10 tests passed |
| Full development E2E | `npx playwright test` | 39 tests passed |
| Production E2E | `npm run test:e2e:prod` | 7 tests passed |
| Opening data validation | `src/features/analysis/openings/lookup.test.ts` | 3,865 entries with legal move sequences |
| Puzzle data validation | `src/features/library/puzzles/load.test.ts` | 5,000 unique puzzles, 600–2400 |
| Reference validation | `src/features/library/reference/index.test.ts` | 30 articles, unique slugs, legal diagram FENs, 700–1,200 words each |
| Database migration | `src/features/storage/db.test.ts` | v1 game/settings survive v2 upgrade |

## Feature evidence

- `/library` loads five areas: Openings, Repertoire, Practice, My Games, Reference.
- Opening Explorer searches names/ECO, supports legal board moves (including promotion), named continuations, Explore/Counters mode, on-demand Stockfish, repertoire save with duplicate choice, notes, and FEN/line deep links from Analysis.
- Repertoire supports line creation, edit, duplicate, delete, filters, sort, due markers, board preview, persistence, unsaved-change warning, and detail view.
- Notes persist for opening, game, move, article, puzzle, and repertoire targets.
- My Games lists local games, filters by side/result/source/analysis, resolves player side from Settings aliases, shows insights, and runs cache-first mistake drills against Stockfish.
- Practice supports filtered puzzle sessions, due-first selection, retry-once, repertoire review, opening recall, and a due review queue with Leitner progress.
- Reference supports category, difficulty, search, reading, diagrams, notes, completion progress, and clickable related links.
- Global Library search groups openings, repertoire, notes, games, and articles.
- Analysis can save an identified opening to repertoire and add per-move notes.
- Library landing and Dashboard show due reviews, completed articles, latest note, and continue reading.
- Settings supports player-name aliases.

## Known limitations

1. Counters & Defenses uses named continuations from the bundled opening dataset plus on-demand engine analysis. It does not claim popularity or win-rate data.
2. The mistake trainer is cache-first, but it still runs Stockfish on demand when no cached position exists.
3. Backup/restore does not include the three new Library stores yet; R7 owns backup implementation and the roadmap now records that requirement.
4. Reference articles meet the word range and structure checks, but a human spot-check of tone and chess accuracy is still recommended.

## Bundle size

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Opening data | 803 KB | 121 KB |
| Puzzle data | 1.6 MB | 385 KB |
| Reference source | 100 KB | not measured |

## Manual review required

- Read at least one article per category and confirm tone and accuracy.
- Check the player-name alias flow with a real imported game.
- Confirm that the 5,000-puzzle bundle feels acceptable on the reference device.
- Verify R7 backup/restore includes `libraryNotes`, `repertoireLines`, and `learningProgress`.

## Review follow-up

- Independent review on commit `a48996c` found one critical issue: promotion moves lost their piece suffix, so promotion puzzles could never be answered correctly. Fixed with a promotion chooser on the interactive board and a unit test.
- Fixed in `5d2a803`: board no longer resets on every parent render, puzzle `lastMove` is UCI, repertoire review samples only the user's turns, unfinished games no longer count as draws, notes can be edited, article note metadata is preserved, duplicate repertoire lines are rejected, My Games has result/source/side/analysis filters, and Library search surfaces load errors.
- Deferred minor items: none from the original critical/high list. Remaining work is external to R8: R7 backup integration and human content spot-check.
