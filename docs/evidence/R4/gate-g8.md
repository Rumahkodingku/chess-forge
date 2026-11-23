# Gate G8 Evidence: Animation Core

- Date: 2026-11-23
- Environment: Linux, Chromium via Playwright, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

R4 renders a deterministic scene sequence from a persisted project. The studio preview plays the full sequence, seeks scenes, and shows legal move animation, camera focus, text, effects, and audio. R1 projects are normalised to scene v2 on read.

R1, R2, and R3 remain green.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check:all` | PASS, 39 test files and 183 unit/integration tests |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 23 browser tests |
| `npm run test:e2e:prod` | PASS, 4 production tests |

Dev E2E coverage:

- Full-sequence Player preview.
- Scene selection and seek.
- Play from start and pause.
- Camera transform at a scene start.
- Moving-piece animation at a key frame.
- Text overlays and safe-area warnings.
- Missing audio asset warning.
- Zero horizontal overflow at 390 px.
- R1 walking skeleton, R2 import/replay, and R3 analysis remain green.

## Performance

Reference run: production build, 4 scenes, 330 frames, 1080 x 1920, Chromium headless.

```text
Preview animation frame rate: 60.9 FPS
MOBILE overflow: 0
Console errors: 0
Known warning: Mediabunny loaded twice (pre-existing R0 warning)
```

## Verified behaviour

- Scene v2 supports multi-move ranges and deterministic frame timing.
- R1 projects normalise to v2 without an IndexedDB version bump.
- Board state derives from the game snapshot and selected move range.
- Normal move, capture, castling, en passant, and promotion are covered.
- Last move, check, checkmate, capture emphasis, focus, and glow are configurable.
- Camera keyframes interpolate and clamp to the board.
- Active move squares stay inside the visible camera region.
- Text uses curated Geist tokens and safe-area validation.
- Project audio tracks use built-in or asset sources.
- Scene SFX use semantic move, capture, check, and checkmate events.
- Preview and export use `ProjectComposition`.
- R1 export still produces a valid WebM file.
- Missing audio assets warn and do not block preview.

## Screenshots

- `docs/evidence/R4/preview-desktop.png`
- `docs/evidence/R4/preview-mobile.png`
- `docs/evidence/R4/warnings-desktop.png`

## Known limitations

- Timeline editing, templates, scene duration editing, and audio upload remain R5.
- Audio asset upload is not part of R4.
- Camera is keyframed; free-form camera paths are deferred.
- Safe-area validation is an estimate, not a browser text measurement.
- `next start` still warns because the production build uses standalone output.
- Mediabunny duplicate-load warning remains. R1 export remains green.

## Commands

```bash
npm run check:all
npm run test:e2e
npm run test:e2e:prod
```
