---
title: ChessForge — Phase R4 Animation Core Specification
product: ChessForge
spec_version: "1.0"
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Gate-verified
last_updated: 2026-11-23
language: en
---

# ChessForge — Phase R4 Specification

R4 builds the deterministic animation core. It turns a game and a persisted project into a frame-accurate scene sequence: SVG board, move animation, effects, camera, text, audio, and Remotion preview.

R3 remains the proof that analysis data and move evidence exist. R4 consumes that data without recomputing engine analysis in the renderer.

---

## 1. Purpose

R4 exists to deliver:

1. A versioned scene model that can render a contiguous move range.
2. A deterministic frame timeline for scenes and projects.
3. An SVG board renderer with themes, coordinates, check, and last-move highlight.
4. Legal move animation for normal moves, captures, castling, en passant, and promotion.
5. Configurable annotations and visual effects.
6. Camera keyframes with smooth deterministic transitions.
7. Text and subtitle overlays with safe-area validation.
8. Project-level audio tracks and scene-level move SFX.
9. A Remotion `ProjectComposition` used by both preview and export.
10. A studio preview upgrade with full-sequence playback and scene seeking.
11. R1 project migration to the v2 scene model.
12. Gate G8 evidence.

R4 passes only when Gate G8 passes.

---

## 2. Scope

### 2.1 In scope

- Scene schema v2 with multi-move ranges.
- Project schema v2 with audio tracks.
- Deterministic scene and project duration calculations.
- SVG board renderer for Forge and Classic themes.
- Piece movement, capture, castling, en passant, and promotion animation.
- Last-move, check, checkmate, capture, glow, and focus effects.
- Arrow and square annotations with timing.
- Camera keyframes with easing and safe clamping.
- Text overlays with curated typography, colours, alignment, and safe-area warnings.
- Built-in CC0 SFX.
- User audio references from the existing asset store, without an upload UI.
- Per-track volume, mute, start frame, and duration.
- `ProjectComposition` for preview and export.
- Studio preview with full sequence, scene list, seek, play, and pause.
- R1 project normalisation on read.
- Unit, integration, dev E2E, production E2E, and Gate G8 evidence.

### 2.2 Out of scope

- Timeline editing, scene add/remove/reorder/duplicate.
- Scene duration editor.
- Template gallery, template application, and custom templates.
- Project creation from a full game or selected moments. R5 owns it.
- Audio upload UI and audio track editor.
- Text editing UI.
- Export format settings, capability UI, and export error taxonomy. R6 owns them.
- Free-form camera paths outside keyframes.
- Free-form fonts and colours outside curated tokens.
- Mobile-specific editor redesign beyond responsive preview.
- Changing the R1 walking skeleton or R2/R3 contracts.

---

## 3. Approved decisions

| Topic                 | Decision                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| Scene content         | One scene can contain a contiguous multi-move range.                       |
| Preview surface       | Upgrade `/studio/[projectId]` to full-sequence preview with scene seeking. |
| Timeline editing      | Deferred to R5.                                                            |
| Audio model           | Project-level audio tracks plus scene-level semantic SFX events.           |
| Audio upload          | Deferred to R5. R4 consumes existing asset-store blobs.                    |
| Project compatibility | Normalise R1 projects to v2 on read. Keep IndexedDB v1.                    |
| Camera                | Keyframes with zoom, pan, focus, easing, and clamping.                     |
| Typography            | Curated Geist, Geist Mono, and display/body/mono tokens.                   |
| Effects               | Restrained dark-first tokens. No arbitrary glow or rainbow effects.        |
| Safe area             | 7% horizontal and 6% vertical insets.                                      |
| Composition           | Preview and export share `ProjectComposition`.                             |
| R4 boundary           | Templates, timeline editor, scene editor, and R6 export settings stay out. |

---

## 4. User flow

```text
/studio/{projectId}
  load project
  normalise v1 to v2
  resolve audio assets
  render ProjectComposition
  play full sequence
  select a scene
  seek to scene start
  inspect project details
  export the same composition (R1 export path remains)
```

R4 does not add project-creation UI. Existing R1 projects and R5 projects use the same preview.

---

## 5. Scene model v2

### 5.1 Required fields

```ts
interface Scene {
  id: string;
  type: "intro" | "move" | "analysis" | "recap" | "outro";
  startFrame: number;
  durationInFrames: number;
  moveRange?: { fromPly: number; toPly: number };
  boardState: {
    fen: string;
    orientation: "w" | "b";
    theme: "forge" | "classic";
    coordinates: boolean;
  };
  timing: {
    leadInFrames: number;
    moveDurationFrames: number;
    gapFrames: number;
    holdFrames: number;
    easing: EasingName;
  };
  camera: { keyframes: CameraKeyframe[] };
  annotations: Annotation[];
  textOverlays: TextOverlay[];
  effects: Effects;
  focusSquares: string[];
  audioEvents: SceneAudioEvent[];
  overrides: Record<string, unknown>;
  schemaVersion: 2;
}
```

Rules:

- `moveRange` is inclusive and contiguous.
- `fromPly` and `toPly` must exist in the project game snapshot.
- `boardState.fen` is the FEN before `fromPly`. It is not the final scene FEN.
- If `moveRange` is absent, the scene renders a static board.
- `startFrame` is the scene start within the project timeline.
- `durationInFrames` must be at least the calculated minimum in §5.2.
- Scene IDs are UUIDs.
- Unknown override keys are preserved. R5 owns their interpretation.

### 5.2 Timing

Easing values:

- `linear`
- `easeIn`
- `easeOut`
- `easeInOut`

Default scene timing:

| Field                | Default     |
| -------------------- | ----------- |
| `leadInFrames`       | 12          |
| `moveDurationFrames` | 24          |
| `gapFrames`          | 6           |
| `holdFrames`         | 24          |
| `easing`             | `easeInOut` |

Calculated minimum:

```text
moveCount = moveRange ? toPly - fromPly + 1 : 0
minimumFrames =
  leadInFrames +
  moveCount * moveDurationFrames +
  max(0, moveCount - 1) * gapFrames +
  holdFrames
```

Move frame map:

```text
start(i) = leadInFrames + i * (moveDurationFrames + gapFrames)
end(i)   = start(i) + moveDurationFrames
```

Rules:

- `durationInFrames >= minimumFrames`.
- Frames after the last move are hold frames.
- A scene with no move range holds its static board for the full duration.
- R5 may change scene duration, but never below the minimum.
- R4 normalisation preserves the R1 90-frame single-move scene.
- Duration values are integer frames.

### 5.3 Board state

- `fen` is the FEN before the first move in `moveRange`.
- `orientation` controls board flip.
- `theme` controls Forge or Classic square colours.
- `coordinates` controls file and rank labels.
- Pieces are always cburnett from `public/pieces/cburnett`.
- The renderer must validate the FEN and show a recoverable error, not crash.

### 5.4 Annotations

```ts
interface Annotation {
  id: string;
  type: "arrow" | "square" | "highlight";
  from?: string;
  to?: string;
  square?: string;
  color: "brand" | "red" | "green" | "blue" | "white";
  startFrame: number;
  durationInFrames: number;
  opacity?: number;
}
```

Rules:

- Arrow requires `from` and `to`.
- Square and highlight require `square`.
- `startFrame` is relative to the scene.
- `durationInFrames` is positive and must not exceed the scene duration after the start.
- Invalid annotations are skipped with a warning.
- Annotations are SVG layers above the board and below text.

### 5.5 Camera

```ts
type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

interface CameraKeyframe {
  frame: number;
  zoom: number;
  x: number;
  y: number;
  easing: EasingName;
}
```

Rules:

- `zoom` is 1 to 3.
- `x` and `y` are normalised board offsets from the centre. `0` is centred.
- `x = 0.25` means one quarter of the board width to the right.
- Keyframes are sorted by `frame`.
- If there are no keyframes, use `{frame: 0, zoom: 1, x: 0, y: 0}`.
- Frames before the first or after the last keyframe clamp to that keyframe.
- Interpolation is linear between keyframes with the target keyframe's easing.
- Translate is clamped so the board never exposes empty space at the current zoom.
- The default camera is a reset at frame 0.
- A helper may create a focus keyframe from a square:
  - `x = (file - 3.5) / 8`
  - `y = (3.5 - rank) / 8`
  - default focus zoom `1.6`
- Camera movement must not hide the active move squares.

### 5.6 Text overlays

```ts
type TextFont = "display" | "body" | "mono";
type TextColor = "foreground" | "muted" | "brand" | "danger";

interface TextOverlay {
  id: string;
  kind: "title" | "move-label" | "explanation" | "caption";
  text: string;
  font: TextFont;
  fontSize: number;
  color: TextColor;
  align: "left" | "center" | "right";
  position: "top" | "bottom" | "left" | "right" | "center";
  x: number;
  y: number;
  maxWidth: number;
  background: boolean;
  startFrame: number;
  durationInFrames: number;
}
```

Defaults:

| Field        | Default      |
| ------------ | ------------ |
| `font`       | `body`       |
| `fontSize`   | 24           |
| `color`      | `foreground` |
| `align`      | `center`     |
| `position`   | `bottom`     |
| `x`          | 0            |
| `y`          | 0            |
| `maxWidth`   | 80           |
| `background` | false        |

Rules:

- `fontSize` is authored for the 1080 x 1920 base canvas.
- Render font size scales by `min(width / 1080, height / 1920)`.
- `maxWidth` is a percentage of the safe-area width.
- Text is plain React text, never HTML injection.
- Text must fit within the safe area.
- Safe area insets: 7% horizontal, 6% vertical.
- A clipping warning is returned when estimated text bounds exceed the safe area.
- Warnings are visible in the studio preview. They do not block rendering.
- `background` adds a controlled dark translucent panel behind the text.
- Text motion is frame-based opacity only. No time-based CSS animation.

### 5.7 Audio events

```ts
interface SceneAudioEvent {
  id: string;
  trigger: "move" | "capture" | "check" | "checkmate";
  frameOffset: number;
  volume: number;
  muted: boolean;
}
```

Rules:

- Events are relative to the scene.
- The trigger fires at the end frame of a matching move plus `frameOffset`.
- Semantic precedence for one move: `checkmate`, then `check`, then `capture`, then `move`.
- Only one semantic trigger fires per move.
- If the scene has no event for the matching trigger, no SFX plays.
- `volume` is 0 to 1.
- Events outside the scene duration are ignored with a warning.

### 5.8 Effects

```ts
interface Effects {
  lastMoveHighlight: boolean;
  checkIndicator: boolean;
  captureEmphasis: boolean;
  checkmateEmphasis: boolean;
  glow: boolean;
  focus: boolean;
}
```

Defaults:

- `lastMoveHighlight`: true
- `checkIndicator`: true
- `captureEmphasis`: true
- `checkmateEmphasis`: true
- `glow`: false
- `focus`: false

Rules:

- Effects are configurable per scene.
- R5 template defaults may override them through `overrides`.
- R4 applies scene values only.

---

## 6. Project model v2

### 6.1 Project fields

Extend `VideoProject`:

```ts
interface VideoProject {
  // existing fields remain
  projectVersion: 2;
  audioTracks: AudioTrack[];
  schemaVersion: 2;
}
```

Keep existing `tracks`, `gameSnapshot`, `assets`, `canvas`, and `frameRate` fields.

### 6.2 Audio tracks

```ts
type AudioSource =
  | { type: "builtin"; id: "move" | "capture" | "check" | "checkmate" }
  | { type: "asset"; assetId: string };

interface AudioTrack {
  id: string;
  kind: "music" | "sfx";
  source: AudioSource;
  startFrame: number;
  durationInFrames: number;
  volume: number;
  muted: boolean;
  loop: boolean;
}
```

Rules:

- `startFrame` is absolute on the project timeline.
- `durationInFrames` is required and positive.
- Built-in SFX paths:
  - move: `/audio/sfx/move.wav`
  - capture: `/audio/sfx/capture.wav`
  - check: `/audio/sfx/check.wav`
  - checkmate: `/audio/sfx/checkmate.wav`
- Asset audio lives in the existing `assets` store.
- Missing assets are skipped with a visible warning.
- R4 does not add upload UI.
- R5 owns the audio track editor.

### 6.3 Asset resolver

- The studio page resolves referenced asset IDs to object URLs.
- The resolver returns `Record<string, string>`.
- The same resolver output is passed to the Player and export.
- Object URLs are revoked on unmount.
- The composition receives no raw IndexedDB access.
- Missing URLs produce a warning, not a crash.

### 6.4 Scene sequence

- Scenes render in array order.
- `scene.startFrame` is normalised to the cumulative start of the previous scenes.
- Project duration is derived:

```text
projectDuration = max(scene.startFrame + scene.durationInFrames)
```

- Empty projects show an empty preview.
- Overlap or negative scene timing is rejected during normalisation.

---

## 7. Deterministic timeline

- All scene timing is integer frames.
- Composition uses `useCurrentFrame()` and frame values only.
- No `Date.now`, random values, timers, or CSS transitions inside the composition.
- The same project and frame produce the same board, camera, text, effect, and audio state.
- Preview and export use the same `ProjectComposition`.
- Scene-local frame is `projectFrame - scene.startFrame`.
- Helpers are pure functions with unit tests:
  - `sceneMinimumFrames(scene)`
  - `projectDurationInFrames(project)`
  - `moveFrameMap(scene)`
  - `boardStateAtFrame(scene, gameSnapshot, frame)`
  - `cameraAtFrame(keyframes, frame)`
  - `visibleOverlaysAtFrame(scene, frame)`
  - `audioEventsAtFrame(scene, gameSnapshot, frame)`

---

## 8. SVG board renderer

### 8.1 Layers

The scene board renders, bottom to top:

1. Board surface.
2. Square colours.
3. Last-move highlight.
4. Focus dimming.
5. Check or checkmate indicator.
6. Pieces.
7. Moving pieces.
8. Capture flash.
9. Annotation arrows and squares.
10. Border and coordinates.

Text overlays are outside the SVG board layer.

### 8.2 Themes

| Theme   | Light square | Dark square |
| ------- | ------------ | ----------- |
| Forge   | `#c9b28a`    | `#5f4b39`   |
| Classic | `#f0d9b5`    | `#b58863`   |

- Piece set: cburnett from `public/pieces/cburnett`.
- Coordinates use contrasting text on both square colours.
- Board corners use a consistent radius.
- The SVG viewBox remains 800 x 800.
- The board wrapper clips camera transforms.

### 8.3 Move state

For scene frame `f`:

- Before the first move: show `boardState.fen`.
- During move `i`: show the FEN before move `i`, with moving piece overlays.
- After move `i` completes: show `fenAfter` of move `i`.
- At the end: show the FEN after the last move.
- Last-move highlight follows the active or last completed move.
- Check indicator uses the completed FEN, not the pre-move FEN.

### 8.4 Move animation

Normal move:

- Interpolate piece position from source to destination.
- Ease with the scene easing.
- Duration is `moveDurationFrames`.

Capture:

- Captured piece fades out during the first 40% of the move.
- Destination square flashes during the last 20%.
- The moving piece remains above the fading piece.

Castling:

- King and rook animate at the same time.
- King movement and rook movement derive from FEN before/after.
- Both pieces use the same progress.

En passant:

- The moving pawn animates diagonally.
- The captured pawn is removed during the move.
- The captured pawn is identified from the FEN before and the UCI destination.

Promotion:

- The pawn animates to the final rank.
- The promoted piece replaces it at progress 1.
- Promotion type comes from the UCI suffix.

Rules:

- Illegal or missing moves skip animation and hold the previous FEN.
- Animation never changes the underlying game snapshot.
- Moves outside `moveRange` are not rendered.
- The board stays legible at every frame.

---

## 9. Annotations and effects

- Last-move highlight: translucent brand overlay on source and destination.
- Arrow: SVG line with marker, bounded to the board.
- Square highlight: filled translucent square.
- Focus: non-focus squares dim to 45% and focus squares receive a brand outline.
- Check: red radial pulse at the king square, 12 frames.
- Checkmate: expanding brand/red ring around the king, 20 frames.
- Capture: white flash at the destination, 8 frames.
- Glow: controlled board-wrapper shadow, not a full-page glow.
- All effect timings are frame-based and deterministic.
- Effects respect reduced motion only in the editor UI. Export composition remains deterministic and must not depend on media queries.
- Effect colours use the curated palette.

---

## 10. Camera

- Camera transform applies to the board wrapper only.
- Text, metadata, and effects outside the board are not camera-transformed.
- Transform: translate then scale, origin at board centre.
- Zoom range: 1 to 3.
- Translation clamp:

```text
maxOffset = (1 - 1 / zoom) / 2
x = clamp(x, -maxOffset, maxOffset)
y = clamp(y, -maxOffset, maxOffset)
```

- Focus helper uses square centre coordinates.
- Camera transitions interpolate between keyframes.
- The active move squares must remain inside the visible board area.
- Reset keyframe returns to zoom 1, x 0, y 0.

---

## 11. Text and subtitles

- Titles use `display`.
- Body and explanations use `body`.
- Numeric or move labels may use `mono`.
- Alignment is left, centre, or right.
- Position anchors are top, bottom, left, right, or centre.
- `x` and `y` are percentage offsets within the safe area.
- Text wraps at `maxWidth`.
- Estimated line height is `1.25 * fontSize`.
- Maximum four lines in R4. More lines produce a warning.
- Text outside the safe area produces a warning listing the overlay ID.
- Text is selectable in the studio UI, not inside the exported video.
- Text must never contain injected HTML. Render as text nodes.

---

## 12. Audio engine

- Built-in SFX use public CC0 files.
- Project audio tracks use built-in or asset sources.
- Scene events use built-in semantic SFX only.
- Per-track volume and mute are honoured.
- Music tracks can loop.
- Track start and duration are frame-based.
- Missing assets are skipped with a warning.
- Audio is rendered in `ProjectComposition` and `SceneComposition`.
- Preview and export use the same `Audio` components.
- No audio upload UI in R4.

---

## 13. Project composition

### 13.1 Component

```ts
interface ProjectCompositionProps {
  project: VideoProject;
  resolvedAudioAssets: Record<string, string>;
}
```

Rules:

- Render scenes with `Sequence` using `scene.startFrame` and `scene.durationInFrames`.
- Render project audio tracks with `Sequence`.
- Render scene SFX inside each scene.
- Scene components receive only the current scene and game snapshot.
- The composition is client-only.
- The composition accepts no functions, blobs, or DOM nodes in serialised props.
- The composition must remain compatible with `@remotion/web-renderer`.

### 13.2 Export

- `exportProject` builds `ProjectComposition`, not a single scene.
- Duration is `projectDurationInFrames(project)`.
- Existing R1 export remains green.
- R6 owns format settings, capability UI, cancellation UX, and export validation beyond the R1 path.

---

## 14. Studio preview

### 14.1 `/studio/[projectId]`

Required elements:

- Remotion Player with `ProjectComposition`.
- Full project duration.
- Play, pause, seek, and loop controls.
- Scene list with index, type, start frame, duration, and selected state.
- Clicking a scene seeks to its start frame.
- Current frame and total duration.
- Project details.
- Existing save and export cards remain.
- Audio warning when an asset URL is missing.
- Empty state when the project has no scenes.

### 14.2 Scene list

```text
[01] move     0.0s - 3.0s
[02] analysis 3.0s - 6.4s
[03] outro    6.4s - 8.0s
```

Rules:

- Scene selection is a real button.
- Selected scene is visually marked and has `aria-current`.
- No drag, resize, add, remove, or reorder controls in R4.
- The list is horizontally safe at 390 px.

### 14.3 Player

- Dynamic import only; no SSR.
- `durationInFrames` equals project duration.
- `fps` equals project frame rate.
- Width and height equal project canvas.
- `acknowledgeRemotionLicense`.
- Scene seek uses the Player ref.
- No autoplay audio without user interaction in the browser preview.

---

## 15. Migration and normalisation

### 15.1 R1 to v2

`normalizeProject(input)` must:

- Accept unknown or v1 project data.
- Return a `VideoProject` v2.
- Be idempotent.
- Preserve IDs, names, source game, canvas, frame rate, assets, timestamps, and overrides.
- Convert each v1 scene:
  - `startFrame` and `durationInFrames` preserved.
  - `boardState.theme` defaults to `forge`.
  - `boardState.coordinates` defaults to true.
  - `timing` defaults: lead-in 10, move 45, gap 0, hold 35, easeInOut.
  - `camera.keyframes` from old `{zoom,x,y}` at frame 0 and scene end.
  - annotations receive `startFrame: 0` and the scene duration.
  - text overlays receive curated style defaults.
  - effects receive checkmate/focus false and focusSquares empty.
  - `audioReferences` map to project audio tracks with scene offset.
  - `schemaVersion` becomes 2.
- Set `projectVersion: 2` and `schemaVersion: 2`.
- Add `audioTracks: []` when absent.

### 15.2 Repository boundary

- `createProjectRepository.getById`, `list`, and `save` normalise before parsing.
- Invalid data raises a storage validation error.
- No IndexedDB version bump.
- Existing R1 projects remain openable.

---

## 16. Data model schemas

Add Zod schemas in `src/features/studio/scene/scene.types.ts`:

- `easingSchema`
- `boardThemeSchema`
- `annotationSchema`
- `cameraKeyframeSchema`
- `textOverlaySchema`
- `effectsSchema`
- `sceneAudioEventSchema`
- `sceneTimingSchema`
- `audioSourceSchema`
- `audioTrackSchema`
- `sceneSchema` v2
- `videoProjectSchema` v2

Rules:

- All persisted boundaries use Zod.
- Unknown override keys are allowed only through `overrides`.
- `schemaVersion` values are explicit.
- R1 migration is tested with a stored fixture.
- No `any` in production types.

---

## 17. Error handling

| Case                         | Required behaviour                          |
| ---------------------------- | ------------------------------------------- |
| Invalid project              | Storage error with recovery action          |
| Invalid scene FEN            | Board error, scene preview remains usable   |
| Move range out of bounds     | Scene normalisation error                   |
| Scene duration below minimum | Validation error                            |
| Invalid camera keyframe      | Skip keyframe and warn                      |
| Text exceeds safe area       | Warning in studio, render still works       |
| Missing audio asset          | Warning, skip audio, render continues       |
| Empty scene list             | Empty preview state                         |
| Unsupported audio MIME       | Warning, skip audio                         |
| Player load failure          | Visible error state, project data untouched |
| Scene seek out of range      | Clamp to project duration                   |
| Export render failure        | R1 error surface remains, project untouched |

---

## 18. Performance

- Preview target: 30 FPS for typical projects on the reference device.
- Only the active scene is mounted by `Sequence`.
- Board rendering uses memoised SVG geometry.
- Camera and effects do not remount the board.
- Text and annotation arrays are filtered by frame before rendering.
- Project duration calculations are O(scenes).
- Board state at frame is O(moveRange length) at scene start, not per render.
- Record preview FPS, scene count, canvas, and browser in Gate G8 evidence.
- No hard FPS failure threshold in R4 beyond visible stutter or dropped frames.

---

## 19. Testing

### 19.1 Unit tests

- Scene minimum duration.
- Project duration and cumulative scene start.
- Move frame map.
- Board FEN at key frames.
- Normal move animation at 0%, 50%, 100%.
- Capture fade and flash frames.
- Castling king and rook positions.
- En passant removal.
- Promotion swap.
- Last-move highlight.
- Check and checkmate indicators.
- Camera interpolation, clamping, focus helper, reset.
- Text safe-area validation and line limit.
- Annotation timing.
- Audio track scheduling and semantic SFX precedence.
- R1 project normalisation.
- Migration idempotence.
- Theme tokens.
- Deterministic same-frame output.

### 19.2 Integration tests

- Project repository normalises v1 and reads v2.
- `ProjectComposition` renders all scenes in order.
- Player scene seek uses the correct frame.
- Export composition uses project duration.
- Missing audio asset warning.
- Asset URL resolver lifecycle.

### 19.3 E2E tests

Add `e2e/r4-animation.spec.ts`:

- Seed a deterministic multi-scene project.
- Open `/studio/{id}`.
- Play the full sequence.
- Select a scene and verify seek.
- Verify move animation and effects at key frames.
- Verify camera transform changes.
- Verify text and safe-area warning.
- Verify audio tracks are present and missing assets warn.
- Verify no horizontal overflow at 390 px.
- Keep R1 export and R2/R3 flows green.

Add `e2e/r4-production.spec.ts`:

- Open the seeded project in the production build.
- Verify Player, scene seek, and project duration.
- Assert no horizontal overflow at 390 px.

### 19.4 Fixtures

- `src/features/studio/fixtures/r4-project.ts`: deterministic multi-scene project with intro, two move scenes, and outro.
- Small audio fixture or built-in SFX only.
- Fixture uses real game moves and exact frames.
- E2E seeding uses IndexedDB through the test harness, not a product feature.

---

## 20. Gate G8

G8 passes only when:

- AC-06 preview aspects pass.
- A game can be previewed as a deterministic animation.
- Move animation matches legal game state.
- Last move, check, checkmate, capture, castling, en passant, and promotion display correctly.
- Camera, annotations, text, and audio work in preview.
- Scene selection and seek work.
- Preview and export use `ProjectComposition` and the same timing rules.
- R1 projects open through normalisation.
- R1, R2, and R3 E2E remain green.
- Production E2E passes.
- `npm run check:all` passes.
- Evidence is recorded in `docs/evidence/R4/gate-g8.md`.

---

## 21. Task order

### 21.1 Wave 1: model and time

1. Scene v2 and project v2 schemas.
2. R1 normalisation.
3. Timeline helpers and minimum duration.
4. Repository boundary.
5. Unit tests.

Maps to R4-T01, R4-T02.

### 21.2 Wave 2: board

1. Theme-aware SVG board.
2. Board FEN at frame.
3. Normal move and capture animation.
4. Castling, en passant, and promotion.
5. Last move, check, and checkmate.
6. Unit and snapshot tests.

Maps to R4-T03, R4-T04.

### 21.3 Wave 3: presentation

1. Annotations and effects.
2. Camera keyframes.
3. Text overlays and safe area.
4. Audio tracks and scene SFX.
5. Unit tests.

Maps to R4-T05, R4-T06, R4-T07, R4-T08.

### 21.4 Wave 4: composition and preview

1. `ProjectComposition`.
2. Studio Player full sequence.
3. Scene list and seek.
4. Export composition update.
5. Integration and dev E2E.

Maps to R4-T09.

### 21.5 Wave 5: gate

1. Determinism and performance tests.
2. Production E2E.
3. Evidence.
4. ROADMAP and ADR updates.

Maps to R4-T10.

---

## 22. Risks

| Risk                                   | Mitigation                                   |
| -------------------------------------- | -------------------------------------------- |
| Multi-move timing drifts               | Pure frame helpers and tests                 |
| Castling / en passant / promotion bugs | Fixture per move type and key-frame tests    |
| Camera hides the board                 | Translation clamp and move-square focus      |
| Text clips in export                   | Safe-area validator and preview warnings     |
| Missing audio crashes preview          | Asset resolver and skip-with-warning         |
| Preview differs from export            | One `ProjectComposition`                     |
| R1 project breaks                      | Normalisation, idempotence tests, no DB bump |
| Player performance drops               | One mounted scene, memoised board geometry   |
| Web renderer CSS limits                | SVG board and inline frame-based styles      |

---

## 23. Definition of done

R4 is done when:

- R4-T01 through R4-T10 are complete.
- Gate G8 passes.
- `npm run check:all` passes.
- `npm run test:e2e` passes.
- `npm run test:e2e:prod` passes.
- R1, R2, and R3 remain green.
- R1 projects open through normalisation.
- Preview and export use the same composition.
- Move animation and effects match the game state.
- Camera, text, and audio work in preview.
- No R5 timeline/template/editor scope is pulled into R4.
- Documentation and ROADMAP status are updated.
- Evidence is recorded.

---

## 24. Handoff to R5

R4 hands R5:

- A versioned scene and project model with multi-move ranges.
- Deterministic timeline and frame helpers.
- A theme-aware SVG board with legal move animation.
- Camera, text, effects, annotations, and audio primitives.
- `ProjectComposition` used by preview and export.
- A studio preview with scene selection and seek.
- R1 migration and tests.
- Gate G8 evidence.

R5 adds project creation, templates, the timeline editor, scene editing, autosave, and library workflows. R5 must not create a second renderer.

---

*Generated from `docs/ROADMAP.md` v1.0 and approved user decisions on 2026-11-23.*
