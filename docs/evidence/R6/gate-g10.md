# Gate G10 Evidence: Export

- Date: 2026-11-23
- Environment: Linux, Chromium via Playwright, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

R6 adds the production export flow: project snapshot rendering, aspect/FPS controls, 720p and 1080p output, quality presets, MP4/WebM capability detection, OPFS selection, progress, cancellation, Mediabunny validation, file naming, and duration guards.

R1 through R5 remain green.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check:all` | PASS, 54 test files and 260 unit/integration tests |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 29 browser tests |
| `npm run test:e2e:prod` | PASS, 6 production tests |

E2E coverage:

- Export 720p WebM from the Export card.
- Download and validate with `scripts/validate-video.mjs`.
- Export 720p MP4 where the browser supports H.264/AAC.
- Cancel an export and verify no download.
- Change file name, aspect ratio, and frame rate; undo frame rate.
- Block a project over 15 minutes.
- No horizontal overflow at 390 px.
- R1 export, R2, R3, R4, and R5 remain green.

## Validated WebM

```json
{
  "container": "matroska,webm",
  "duration": 3.02,
  "size": 55861,
  "video": { "codec": "vp9", "width": 720, "height": 1280 },
  "audio": { "codec": "opus", "sampleRate": "48000", "channels": 2 }
}
```

## Validated MP4

```json
{
  "container": "mov,mp4,m4a,3gp,3g2,mj2",
  "duration": 3.008,
  "size": 53677,
  "video": { "codec": "h264", "width": 720, "height": 1280 },
  "audio": { "codec": "aac", "sampleRate": "48000", "channels": 2 }
}
```

## Capability matrix

Playwright Chromium reports:

- MP4 / H.264 / AAC
- WebM / VP9 / Opus
- WebM / VP8 / Opus

The Export card auto-selects MP4 when supported, keeps WebM selectable, and disables unsupported options with readable issues.

## Verified behaviour

- Resolution mapping: 9:16, 16:9, 1:1, and 4:5 at 720p and 1080p.
- Quality maps low/medium/high to renderer bitrate presets.
- Export uses a frozen project snapshot; editing continues.
- Frame-rate changes keep scene frame counts and alter duration in seconds.
- Cancellation aborts the renderer and exposes no download.
- Browser unload warns during rendering.
- Projects over 5 minutes show a warning.
- Projects over 15 minutes are blocked.
- OPFS is selected for projects of 60 seconds or longer when supported.
- Arraybuffer fallback is implemented for unsupported OPFS.
- Mediabunny checks container, dimensions, codec, duration, and audio.
- Output object URLs are released on clear and unmount.
- Export failures do not mutate or save the project.

## Screenshots

- `docs/evidence/R6/export-panel-desktop.png`
- `docs/evidence/R6/export-result-desktop.png`
- `docs/evidence/R6/export-panel-mobile.png`

## Exported files

- `docs/evidence/R6/export-proof-720p.webm`
- `docs/evidence/R6/export-proof-720p.mp4`

## Known limitations

- OPFS target selection and fallback are unit-tested; a full 60-second long export was not rendered in this gate.
- MP4 is browser-dependent and is tested in Chromium; support in other browsers must be checked by capability detection.
- Changing FPS changes project duration rather than resampling frames.
- Export configuration is session-only.
- Export cannot stream directly to a user-selected filesystem path.
- MP4/WebM support in Safari and Firefox is not claimed.
- The pre-existing Mediabunny duplicate-load warning remains.

## Commands

```bash
npm run check:all
npm run test:e2e
npm run test:e2e:prod
node scripts/validate-video.mjs docs/evidence/R6/export-proof-720p.webm
node scripts/validate-video.mjs docs/evidence/R6/export-proof-720p.mp4
```
