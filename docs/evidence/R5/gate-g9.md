# Gate G9 Evidence: Video Studio

- Date: 2026-11-23
- Environment: Linux, Chromium via Playwright, Node 26 local, Next.js 16.4.6
- Status: PASS

## Result

R5 adds project creation, seven templates, timeline editing, scene editing, audio upload, autosave, aspect ratios, custom templates, and project v3 persistence. Preview and export still use `ProjectComposition`.

R1, R2, R3, and R4 remain green.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run check:all` | PASS, 49 test files and 231 unit/integration tests |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 26 browser tests |
| `npm run test:e2e:prod` | PASS, 5 production tests |

Dev E2E coverage:

- Create a project from a full game with a template.
- Create a project from a manual move range.
- Create a project from critical moments after full-game analysis.
- Change scene duration, duplicate, delete, and undo.
- Edit text, annotation, camera, and effects.
- Upload a WAV file and verify an audio track.
- Switch aspect ratio to 16:9.
- Save a custom template and apply a template to a project.
- Regenerate scenes from a template and undo it.
- Autosave and reload persistence.
- No horizontal overflow at 390 px.
- R1, R2, R3, and R4 remain green.

Production E2E coverage:

- Seeded project v3 opens in the production build.
- Timeline and scene seek work.
- Project duration is correct.
- Aspect ratio changes to 1:1.
- No horizontal overflow at 390 px.

## Performance

Reference run: production build, five scenes, 584 frames, 1080 x 1920, Chromium headless.

```text
Preview animation frame rate: 60.4 FPS
MOBILE overflow: 0
Console errors: 0
Known warning: Mediabunny loaded twice (pre-existing R0 warning)
```

## Verified behaviour

- Project v3 contains a full template snapshot and source selection.
- R4 v2 and R1 v1 projects normalise to project v3 on read.
- Seven built-in templates generate valid projects.
- Full-game grouping produces blocks of up to four plies plus intro/outro.
- Critical moments merge overlapping blocks and apply lead/trail plies.
- Manual range validation rejects inverted or out-of-game ranges.
- Timeline reorder, duplicate, delete, add, duration, and total duration work.
- Scene overrides are recorded and reset to template defaults.
- Project audio supports MP3/WAV/OGG/M4A/WebM with 50 MB and 10 minute limits.
- Audio assets deduplicate by SHA-256 hash.
- Autosave debounces for 800 ms and exposes saved/error states.
- Undo retains 20 project snapshots.
- Aspect ratio switches among 9:16, 16:9, 1:1, and 4:5.
- Apply style preserves overridden fields.
- Regenerate scenes rebuilds from the stored source selection.
- Custom templates store rules and style only.
- Built-in templates are read-only.

## Screenshots

- `docs/evidence/R5/create-dialog.png`
- `docs/evidence/R5/studio-desktop.png`
- `docs/evidence/R5/studio-mobile.png`
- `docs/evidence/R5/templates-desktop.png`

## Known limitations

- Timeline zoom and draggable clip editing remain TML-011 and are deferred.
- Regeneration from the Templates page is outside the studio undo session; use the studio Apply template action for undoable regeneration.
- Track rows present spans; timing is edited in the inspector.
- Audio upload validates duration with browser metadata, not a server-side decoder.
- Unused uploaded audio blobs are retained because undo can restore a deleted track; media cleanup is deferred.
- Invalid custom templates are skipped with a console warning.
- Mobile uses the same stacked editor; no separate mobile authoring layout.
- `next start` still warns because the production build uses standalone output.
- Mediabunny duplicate-load warning remains.

## Commands

```bash
npm run check:all
npm run test:e2e
npm run test:e2e:prod
```
