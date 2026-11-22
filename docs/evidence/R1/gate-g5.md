# Gate G5 Evidence: Walking Skeleton

- Date: 2026-11-22
- Environment: Linux, Chrome stable, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

The complete R1 path works with real local data:

Import fixture -> persist game -> replay five moves -> analyse position -> create one scene -> preview -> export WebM -> save -> reload -> reopen.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check:all` | PASS, 33 unit tests, production build succeeds |
| `npm run test:e2e` | PASS, 7 browser tests |
| `npm run test:e2e:prod` | PASS, production walking skeleton |
| R0 export proof | PASS after shared composition refactor |

## Export evidence

File: `docs/evidence/R1/export-proof.webm`

```json
{
  "format": {
    "format_name": "matroska,webm",
    "duration": "3.020000",
    "size": "270667"
  },
  "streams": [
    {
      "codec_name": "vp9",
      "codec_type": "video",
      "width": 1080,
      "height": 1920
    },
    {
      "codec_name": "opus",
      "codec_type": "audio",
      "sample_rate": "48000",
      "channels": 2
    }
  ]
}
```

## Screenshots

- `docs/evidence/R1/analysis.png`
- `docs/evidence/R1/studio.png`
- `docs/evidence/R1/studio-list.png`
- `docs/evidence/R1/dashboard.png`

## Verified behaviour

- Fixture import writes a game to IndexedDB.
- Analysis view loads by game ID.
- Move selection updates the SVG board.
- Keyboard left and right navigation works.
- Stockfish returns eval, best move, and MultiPV 3.
- Create scene writes a project with a game snapshot.
- Studio preview renders the scene composition.
- WebM export includes audio.
- Save project writes `updatedAt`.
- Reload and reopen preserve the project.
- Studio list loads the saved project.
- Dashboard shows recent game and recent project.

## Known limitations

- Chessground and interactive board dragging remain R2.
- Only one pasted game is imported in R1.
- Analysis is one-shot and not cached.
- Scene duration and text are fixed in R1.
- No autosave.
- `next start` warns because the production build uses standalone output. The production E2E still passes.

## Production E2E command

```bash
npm run test:e2e:prod
```

The production test builds the app, starts it on port 3100, and runs the R1 flow in Playwright Chromium.
