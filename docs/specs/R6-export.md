# R6 — Export

**Spec version:** 1.0
**Status:** Ready for implementation
**Phase:** R6
**PRD mapping:** PH-5; §6.8; AC-07
**Exit gate:** G10
**Depends on:** Gate G9
**Handoff to:** R7
**Last updated:** 2026-11-23

---

## 1. Purpose

R6 turns the existing export proof into the production export flow. It adds export configuration, browser capability detection, progress, cancellation, large-output handling, MP4/WebM encoding, output validation, cleanup, and Gate G10 evidence.

R6 must not create a second renderer. Preview and export continue to use `ProjectComposition` and the same project timeline.

---

## 2. Scope

### 2.1 In scope

- Export configuration: aspect ratio, frame rate, resolution, quality, format, audio, file name.
- Capability detection for MP4 H.264/AAC, WebM VP9/Opus, and WebM VP8/Opus.
- Auto-selection of the best supported format.
- Project-snapshot export while the editor stays usable.
- Progress reporting with percentage, frames, and estimate.
- Cancellation without corrupting the project.
- OPFS output for projects of 60 seconds or longer, with arraybuffer fallback.
- MP4 and WebM output with codec fallback.
- In-browser output validation with Mediabunny.
- Download result, cleanup, duration guard, and page-close warning.
- R6 unit, integration, dev E2E, production E2E, and Gate G10 evidence.

### 2.2 Out of scope

- Server-side rendering.
- Cloud rendering.
- MP4/WebM combinations not reported by the active browser.
- Streaming to a user-selected filesystem path through `showSaveFilePicker`.
- Per-project persisted export settings.
- Export presets beyond 720p and 1080p.
- Timeline zoom or editor changes outside export configuration.
- New composition components or a second board renderer.

### 2.3 Approved decisions

| Topic | Decision |
|---|---|
| Aspect ratio | Project-level. Export displays it and may change the project canvas through the undoable canvas operation |
| Frame rate | Project-level. Export may change it with a warning; scene frame counts stay unchanged |
| Resolution | 720p and 1080p only |
| Quality | low, medium, high mapped to Remotion bitrate presets |
| Format | MP4, WebM VP9, WebM VP8; auto-select the best supported |
| Capability check | Per format at the active resolution and output target |
| Large output | OPFS `web-fs` at 60 seconds or longer, arraybuffer fallback |
| Config persistence | Session-only, initialized from application settings |
| Validation | Mediabunny in the browser; ffprobe on the downloaded file in E2E |
| Editor during export | Render a frozen project snapshot; editing continues |
| Leaving page | Browser unload warns; studio unmount aborts and releases results |

---

## 3. User flow

```text
Studio project
  -> Export panel
  -> Review project aspect ratio and frame rate
  -> Choose resolution, quality, format, audio, file name
  -> Browser checks capabilities
  -> Start export
  -> Project snapshot is rendered
  -> Progress is visible
  -> Cancel or complete
  -> Mediabunny validates the output
  -> Download MP4 or WebM
  -> Project remains unchanged
```

```text
Project longer than 5 minutes
  -> Warning visible

Project longer than 15 minutes
  -> Export disabled with a clear recovery action

Project 60 seconds or longer
  -> OPFS target when supported
  -> Arraybuffer fallback with a memory warning
```

---

## 4. Export configuration

### 4.1 Model

```ts
interface ExportConfig {
  container: "mp4" | "webm";
  videoCodec: "h264" | "vp9" | "vp8";
  audioCodec: "aac" | "opus" | null;
  resolution: "720p" | "1080p";
  quality: "low" | "medium" | "high";
  includeAudio: boolean;
  fileName: string;
}
```

### 4.2 Defaults

- Resolution: `ApplicationSettings.defaultResolution`.
- Quality: `medium`.
- Format: the first supported option in MP4, WebM VP9, WebM VP8 order.
- Audio: enabled when the project has at least one audio source.
- File name: `<project-slug>-<resolution>.<extension>`.
- Aspect ratio: current project canvas.
- Frame rate: current project frame rate.

### 4.3 Resolution map

| Aspect | 720p | 1080p |
|---|---|---|
| 9:16 | 720 x 1280 | 1080 x 1920 |
| 16:9 | 1280 x 720 | 1920 x 1080 |
| 1:1 | 720 x 720 | 1080 x 1080 |
| 4:5 | 720 x 900 | 1080 x 1350 |

Rules:

- Resolution changes renderer dimensions only.
- Project canvas does not change when resolution changes.
- Dimensions are even integers.
- Frame rate is project-level and is not resampled.

### 4.4 Quality

Quality maps to Remotion `WebRendererQuality`:

| Quality | Video bitrate | Audio bitrate |
|---|---|---|
| low | `low` | `low` |
| medium | `medium` | `medium` |
| high | `high` | `high` |

No numeric bitrate input is exposed in R6.

### 4.5 Aspect and frame rate

- Aspect ratio uses the existing project canvas operation.
- Changing aspect ratio updates the project, preview, and export target.
- Frame rate uses a project-level `setFrameRate` operation.
- Changing frame rate keeps every scene's frame counts unchanged.
- Changing frame rate changes project duration in seconds.
- Frame rate changes require a visible warning and are undoable.
- Export uses the project frame rate at snapshot time.

### 4.6 Duration policy

```text
durationSeconds = projectDurationInFrames / project.frameRate
```

- `durationSeconds >= 300`: visible warning.
- `durationSeconds > 900`: export disabled.
- The 15-minute cap is a hard limit, not a warning.
- A blocked project remains editable and saveable.

### 4.7 File name

- Default name uses the sanitized project name and resolution.
- User can edit the base name.
- Characters outside `[a-zA-Z0-9-_]` collapse to `-`.
- Empty names fall back to `chessforge-project`.
- Extension is appended from the selected container.
- No path separators or control characters.

---

## 5. Capability detection

### 5.1 Check

For each format option and the active resolution:

```ts
canRenderMediaOnWeb({
  container,
  videoCodec,
  audioCodec,
  width,
  height,
  outputTarget,
});
```

- `outputTarget` is `web-fs` when duration is 60 seconds or longer and OPFS is available.
- Otherwise `outputTarget` is `arraybuffer`.
- If `includeAudio` is false, `audioCodec` is `null`.
- Capability results include `canRender` and readable issues.

### 5.2 Options

| Order | Container | Video | Audio |
|---|---|---|---|
| 1 | MP4 | H.264 | AAC |
| 2 | WebM | VP9 | Opus |
| 3 | WebM | VP8 | Opus |

### 5.3 Selection rules

- Auto-select the first supported option.
- If the selected option becomes unsupported after resolution, audio, or FPS changes, select the next supported option.
- If no option is supported, disable export and show recovery.
- Unsupported reasons must be visible, not hidden in a tooltip only.
- Capability checking has `checking`, `ready`, and `error` states.

### 5.4 Output target fallback

- For 60 seconds or longer, try `web-fs`.
- If `web-fs` is not supported, fall back to `arraybuffer`.
- Show a memory warning when arraybuffer is used for a long project.
- Short projects use `arraybuffer`.

---

## 6. Render pipeline

### 6.1 Snapshot

- At export start, freeze a project snapshot.
- The snapshot includes canvas, frame rate, scenes, audio tracks, assets, and template data.
- The editor may continue changing the live project.
- Autosave continues independently.
- The export never mutates the project.
- The result is associated with the snapshot, not later edits.

### 6.2 Assets

- Resolve audio asset IDs to object URLs before render.
- Pass the resolved map to `ProjectComposition`.
- Missing audio assets warn and do not crash export.
- Do not read IndexedDB from the composition.
- Release object URLs after the export result is cleared or the page unmounts.

### 6.3 Renderer

- Use `renderMediaOnWeb` from `@remotion/web-renderer`.
- Use `ProjectComposition` as the composition component.
- Composition dimensions use export resolution, not project canvas dimensions.
- Composition FPS uses project frame rate.
- Composition duration uses `projectDurationInFrames`.
- Pass `videoBitrate` and `audioBitrate` from quality.
- Pass `muted: true` when audio is excluded.
- Use `licenseKey: "free-license"`.

### 6.4 Progress

- Report percentage, rendered frames, encoded frames, and estimated time when available.
- Progress starts immediately after capability succeeds.
- Progress updates are throttled by the renderer.
- The editor stays interactive.

### 6.5 Cancellation

- Create one `AbortController` per export.
- Cancel calls `abort()`.
- Abort transitions to `cancelled`, not `error`.
- No download link is created.
- Temporary output and object URLs are released.
- The project and save state are untouched.

### 6.6 Page and navigation

- `beforeunload` warns while an export is running.
- Studio unmount aborts the export.
- In-app navigation aborts the export.
- The warning is removed when export completes, fails, or is cancelled.

### 6.7 Large output

- `web-fs` result is converted to a `File` or `Blob`.
- A download URL is created only after validation passes.
- Temporary output is released on new export, result clear, or unmount.
- Remotion's stale OPFS cleanup remains the renderer's fallback.
- Failed validation never exposes a download.

---

## 7. Output validation

### 7.1 Browser validation

Use Mediabunny `Input`, `BlobSource`, and `ALL_FORMATS` on the produced file.

Validate:

- Container matches the selected container.
- One video stream exists.
- Video codec matches the selected codec.
- Width and height equal the export resolution.
- Duration is within tolerance.
- Audio stream exists when audio is included and the project has audio.
- Audio codec matches the selected audio codec when audio is required.

Duration tolerance:

```text
max(0.25 seconds, 2 / project.frameRate)
```

### 7.2 Failure

- Validation failure is an `ExportError` with stage `validation`.
- The file is not offered as a download.
- The message explains the expected and actual metadata.
- Recovery suggests retrying, choosing WebM, or lowering resolution.

### 7.3 E2E validation

- Playwright downloads the WebM file.
- The test runs `node scripts/validate-video.mjs <file>`.
- Assert container, duration, dimensions, video codec, and audio stream.
- MP4 is validated manually in installed Chrome stable when supported.

---

## 8. Error handling

| Case | Required behaviour |
|---|---|
| No supported format | Disable export, list reasons, suggest WebM or Chrome/Edge |
| Capability check fails | Visible error with retry |
| Export start with no scenes | Validation error, project untouched |
| Render failure | `ExportError` stage `render`, project untouched |
| OPFS failure | Fall back to arraybuffer when safe, warning |
| Arraybuffer memory failure | `ExportError` stage `storage`, suggest 720p or shorter project |
| Validation failure | `ExportError` stage `validation`, no download |
| Cancel | `cancelled` state, no error |
| Page close during render | Browser warning |
| Studio unmount during render | Abort and cleanup |
| Project over 15 minutes | Disable export with duration message |
| Missing audio asset | Warning, render continues without that asset |
| Unsupported audio codec | Capability issue, choose supported format |

---

## 9. UI

### 9.1 Placement

- Export stays in the existing studio Export card.
- No new route is required.
- The card may be taller than R5; mobile stacks normally.

### 9.2 Controls

- Aspect ratio select: updates the project canvas.
- Frame rate select: 30 or 60 FPS, with warning.
- Resolution select: 720p or 1080p.
- Quality select: low, medium, high.
- Format cards or select with capability badges.
- Audio include checkbox; disabled when the project has no audio.
- File name input.
- Duration status: warning at 5 minutes, blocked at 15 minutes.
- Export button and Cancel button.
- Progress bar and frame/estimate text.
- Result card with file size, render time, and Download link.

### 9.3 States

- `checking`: capability check running.
- `ready`: export allowed.
- `rendering`: progress visible, cancel enabled.
- `done`: validated result and download.
- `cancelled`: no result.
- `error`: readable error and retry.
- `blocked`: duration over cap or no supported format.

### 9.4 R1 compatibility

The R1 walking skeleton must continue to export without editing the project first. Keep the accessible labels **Export video**, **Cancel**, and **Download WebM** working.

---

## 10. Errors and cleanup

- Add `ExportError` to `src/lib/errors.ts` with a `stage` field.
- Preserve `UnsupportedCapabilityError` for unsupported combinations.
- Do not replace project validation or storage errors with export errors.
- Revoke result object URLs.
- Clear timers and abort controllers on unmount.
- Keep the editable project intact on every failure path.
- Do not save export settings into the project.

---

## 11. Testing

### 11.1 Unit tests

- Resolution map for all four ratios.
- Quality mapping.
- Duration policy: under 5 minutes, 5 to 15 minutes, over 15 minutes.
- File-name sanitization and extension.
- Format auto-selection and unsupported fallback.
- Output-target selection at 60 seconds.
- Capability issue rendering.
- Snapshot construction.
- Validation pass and failure for container, dimensions, duration, and audio.
- FPS change keeps scene frame counts and changes project duration.
- Aspect change updates canvas.

### 11.2 Integration tests

- Export runner builds the correct composition dimensions, FPS, duration, codecs, quality, audio flag, and output target.
- Abort signal prevents a result.
- Missing audio asset does not crash the renderer.
- Validation failure withholds the download.
- OPFS failure falls back safely.
- Result cleanup releases URLs.

### 11.3 E2E tests

Add `e2e/r6-export.spec.ts`:

- Seed or create a short export fixture.
- Open export configuration.
- Select 720p and WebM.
- Export, download, and validate with `scripts/validate-video.mjs`.
- Assert duration tolerance, dimensions, codec, and audio.
- Cancel mid-export and assert no download.
- Change file name and assert the suggested filename.
- Change aspect ratio and frame rate; assert project duration and undo.
- Block a project over 15 minutes.
- Assert no horizontal overflow at 390 px.
- Keep R1 export, R2, R3, R4, and R5 green.

Add `e2e/r6-production.spec.ts`:

- Seed a short R6 export fixture.
- Export 720p WebM in the production build.
- Download and validate the file.
- Assert no horizontal overflow at 390 px.

### 11.4 Manual validation

- Export MP4 H.264/AAC in installed Chrome stable.
- Validate with `scripts/validate-video.mjs`.
- Open the file in a common player.
- Record capability matrix and render time.

### 11.5 Fixtures

- `src/features/studio/fixtures/r6-export-project.json`: short project with at least one scene and audio.
- E2E uses IndexedDB seeding, not a product feature.
- Validation files are temporary and not committed if large.

---

## 12. Gate G10

G10 passes only when:

- AC-07 passes.
- MP4 and WebM capability detection is visible and correct.
- A valid WebM export is produced and validated in Playwright.
- MP4 is produced and validated in Chrome stable when supported.
- Output dimensions and duration match the selected configuration within tolerance.
- Audio is present when enabled.
- Cancellation produces no file and leaves the project unchanged.
- The 5-minute warning and 15-minute cap work.
- OPFS and arraybuffer paths are handled.
- R1, R2, R3, R4, and R5 remain green.
- Production E2E passes.
- `npm run check:all` passes.
- Evidence is recorded in `docs/evidence/R6/gate-g10.md`.

---

## 13. Task order

### 13.1 Wave 1: configuration and policy

1. Export config model and defaults.
2. Resolution mapping.
3. Quality mapping.
4. Duration policy.
5. File-name sanitization.
6. FPS project operation.
7. Unit tests.

Maps to R6-T01.

### 13.2 Wave 2: capability detection

1. Capability matrix.
2. Auto-selection.
3. Output target selection.
4. Unsupported explanations.
5. Unit tests.

Maps to R6-T02.

### 13.3 Wave 3: render pipeline

1. Project snapshot.
2. Asset preloading and URL lifecycle.
3. Renderer request.
4. OPFS and fallback.
5. Progress and cancellation.
6. Unit and integration tests.

Maps to R6-T03, R6-T04, R6-T06.

### 13.4 Wave 4: validation and errors

1. Mediabunny validation.
2. ExportError taxonomy.
3. Cleanup paths.
4. Unit tests.

Maps to R6-T05, R6-T07, R6-T08.

### 13.5 Wave 5: export UI

1. Config controls.
2. Capability badges.
3. Duration warning.
4. Progress and cancel.
5. Result and download.
6. Page-close guard.
7. R1 compatibility.

Maps to R6-T01, R6-T04, R6-T08.

### 13.6 Wave 6: gate

1. Dev E2E.
2. Production E2E.
3. Manual MP4 validation.
4. Evidence.
5. ADR and ROADMAP updates.

Maps to R6-T09.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Playwright cannot encode MP4 | Validate WebM in E2E; validate MP4 manually in Chrome stable |
| OPFS unavailable | Capability check and arraybuffer fallback |
| Long export memory pressure | 60-second OPFS threshold and 15-minute cap |
| FPS change surprises users | Warning, undo, and duration display |
| Validation rejects playable files | Documented tolerance and actionable error |
| Audio asset URL revoked too early | Keep URLs until result clear or unmount |
| Cancellation leaves temp files | Abort, clear refs, revoke URLs, rely on renderer OPFS cleanup |
| Autosave changes project during render | Render a frozen snapshot |
| R1 export breaks | Preserve labels and default WebM fallback |

---

## 15. Handoff to R7

R6 hands R7:

- Export configuration and capability matrix.
- Project snapshot renderer.
- OPFS and arraybuffer paths.
- MP4/WebM output with codec fallback.
- Progress, cancellation, and page-close handling.
- Mediabunny validation and export error taxonomy.
- R6 E2E and Gate G10 evidence.

R7 adds final hardening, backup/restore, deployment, accessibility, documentation, and release validation. R7 must not create a second renderer.

---

*Generated from `docs/ROADMAP.md` v1.0, PRD revision 1.1, approved user decisions, and `docs/specs/R5-video-studio.md` on 2026-11-23.*
