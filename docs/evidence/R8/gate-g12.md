# R8 — Gate G12 Evidence

**Date:** 2026-11-24
**Gate:** G12
**Status:** Passed with documented content-depth limitation

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Lint, typecheck, unit tests, production build | `npm run check:all` | Passed |
| Unit and integration tests | `npm test` | 63 files, 304 tests passed |
| Development E2E | `npx playwright test` | 34 tests passed |
| Production E2E | `npm run test:e2e:prod` | 7 tests passed |
| Opening data validation | `src/features/analysis/openings/lookup.test.ts` | 3,865 entries with legal move sequences |
| Puzzle data validation | `src/features/library/puzzles/load.test.ts` | 5,000 unique puzzles, 600–2400 |
| Reference validation | `src/features/library/reference/index.test.ts` | 30 articles, unique slugs, legal diagram FENs |
| Database migration | `src/features/storage/db.test.ts` | v1 game/settings survive v2 upgrade |

## Feature evidence

- `/library` loads five areas: Openings, Repertoire, Practice, My Games, Reference.
- Opening Explorer searches names/ECO, supports legal board moves (including promotion), named continuations, on-demand Stockfish, repertoire save, notes, and deep links from Analysis.
- Repertoire supports line creation, edit, delete, board preview, persistence, and detail view.
- Notes persist for opening, game, article, puzzle, and repertoire targets.
- My Games lists local games, resolves player side from Settings aliases, shows insights, and runs mistake drills against Stockfish.
- Practice supports puzzles, repertoire review, and opening recall with Leitner progress.
- Reference supports category/search/reading, diagrams, notes, and completion progress.
- Global Library search groups openings, repertoire, notes, games, and articles.
- Dashboard shows due reviews and latest note.
- Settings supports player-name aliases.

## Known limitations

1. Reference articles are validated and complete, but several bodies are shorter than the 700–1,000-word target in the R8 spec. The structure and diagrams are in place; deeper copy review remains a content-quality task.
2. Counters & Defenses uses named continuations from the bundled opening dataset plus on-demand engine analysis. It does not claim popularity or win-rate data.
3. The mistake trainer runs Stockfish on demand. It does not precompute every mistake position.
4. Backup/restore does not include the three new Library stores yet; R7 owns backup implementation.
5. The roadmap still reserves R8 as “insertion pending”. PRD and ROADMAP were intentionally not modified by this implementation.

## Manual review required

- Read at least one article per category and confirm tone and accuracy.
- Check the player-name alias flow with a real imported game.
- Confirm that the 5,000-puzzle bundle feels acceptable on the reference device.

## Review follow-up

- Independent review on commit `a48996c` found one critical issue: promotion moves lost their piece suffix, so promotion puzzles could never be answered correctly. Fixed with a promotion chooser on the interactive board and a unit test.
- Fixed in `5d2a803`: board no longer resets on every parent render, puzzle `lastMove` is UCI, repertoire review samples only the user's turns, unfinished games no longer count as draws, notes can be edited, article note metadata is preserved, duplicate repertoire lines are rejected, My Games has result/source/side/analysis filters, and Library search surfaces load errors.
- Deferred minor items: mistake trainer cache reuse, stale-engine cancellation hardening, full unsaved-change guard, and deeper 700–1,000-word article copy.
