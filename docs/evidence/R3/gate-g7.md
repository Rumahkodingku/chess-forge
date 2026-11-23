# Gate G7 Evidence: Full Stockfish Analysis

- Date: 2026-11-23
- Environment: Linux, Chromium via Playwright, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

R3 turns a persisted game into a reviewed game: worker analysis with progress, cached positions, full-game queue, CPL, classifications, opening and phase labels, threats, critical moments, deterministic summary, and Candidate Brilliant decisions.

R1 and R2 remain green.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check:all` | PASS, 30 test files and 133 unit/integration tests |
| `npm run lint` | PASS, 0 errors, 4 pre-existing `!important` warnings |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 21 browser tests |
| `npm run test:e2e:prod` | PASS, 3 production tests |

Dev E2E coverage:

- Position analysis, eval, best move, PV, depth, nodes, NPS.
- Stop a long search and keep a partial result.
- Full-game analysis, classification badges, summary.
- Pause, resume, and cancel full-game analysis.
- Reload restores cached assessments and summary.
- Mid-run reload derives assessments from cached positions.
- Critical moment navigation.
- Evaluation perspective toggle.
- Candidate Brilliant accept, reject, and persisted decision.
- R1 walking skeleton and R2 import/replay remain green.
- Zero horizontal overflow at 390 px.

## Performance

Reference run: 40-ply fixture, depth 12, MultiPV 1, production build.

```text
PERF 40 ply depth 12: 2720 ms
MOBILE overflow 0
CONSOLE errors: 0
```

The queue stayed responsive. The run used the deterministic performance fixture and completed 41 positions.

## Verified behaviour

- Stockfish runs in a worker and progress is visible.
- Stop returns the latest valid result with a partial label.
- Full-game analysis persists completed positions and can resume.
- Cache hits skip engine work.
- Reload restores assessments and summary without engine work.
- Classification thresholds are centralised and documented.
- Mate transitions are separate from centipawn loss.
- Candidate Brilliant is conservative and requires accept or reject.
- Opening lookup uses the vendored CC0 dataset and EPD matching.
- Phase labels are heuristic and navigable.
- Threats distinguish forced engine lines from heuristic warnings.
- Summary text is deterministic and contains no player-intent claims.
- Eval numbers and the eval bar follow White or side-to-move perspective.
- Candidate decisions survive reload.

## Screenshots

- `docs/evidence/R3/analysis-desktop.png`
- `docs/evidence/R3/summary-desktop.png`
- `docs/evidence/R3/summary-mobile.png`
- `docs/evidence/R3/brilliant-desktop.png`

## Known limitations

- Multi-thread Stockfish remains deferred. R3 uses the single-thread build.
- Candidate Brilliant is a heuristic candidate, not an official classification.
- Opening lookup returns `Unknown opening` when no EPD matches.
- Threats are limited to one PV reply plus legal-move heuristics.
- Cache eviction is deferred.
- `next start` still warns because the production build uses standalone output. Production E2E passes.
- Mediabunny still warns about duplicate loading during the build. R1 export remains green.

## Commands

```bash
npm run check:all
npm run test:e2e
npm run test:e2e:prod
```
