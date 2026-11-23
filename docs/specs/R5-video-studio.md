# R5 — Video Studio

**Spec version:** 1.0
**Status:** Ready for implementation
**Phase:** R5
**PRD mapping:** PH-4; §5.4, §5.5, §6.4, §6.6, §6.7, §6.9.2
**Acceptance criteria:** AC-05, AC-06
**Exit gate:** G9
**Depends on:** Gate G8
**Handoff to:** R6
**Last updated:** 2026-11-23

---

## 1. Purpose

R5 turns the R4 deterministic animation engine into a usable video studio. It adds project creation, template application, timeline editing, scene editing, audio upload, autosave, project library, and template management.

R5 must not create a second renderer. Preview and export continue to use `ProjectComposition`.

---

## 2. Scope

### 2.1 In scope

- Project creation from a full game, critical moments, or a manual move range.
- Template selection during project creation.
- Deterministic scene generation from a game snapshot and a template.
- Timeline with scene order, duration, selection, add, duplicate, delete, and reorder.
- Text, annotation, and audio track presentation.
- Scene editing for board, timing, camera, annotations, text, effects, and scene SFX.
- Project audio track editing, including upload.
- Four aspect ratios: 9:16, 16:9, 1:1, 4:5.
- Autosave, undo/redo, and destructive-action confirmation.
- Project save, reopen, and migration from R4 projects.
- Built-in template gallery, custom template CRUD, and template application.
- Project library and dashboard integration.
- R5 E2E and Gate G9 evidence.

### 2.2 Out of scope

- Export settings, capability detection, and export error taxonomy; owned by R6.
- Timeline zoom; TML-011 remains a P2 stretch item.
- Free-form camera paths outside keyframes.
- Free-form fonts or colours outside the R4 curated tokens.
- New piece sets; only cburnett is included.
- Cloud sync, accounts, or collaborative editing.
- Mobile-specific editor redesign beyond responsive preview and 390 px safety.

### 2.3 Approved decisions

| Topic | Decision |
|---|---|
| Full-game grouping | One scene per three plies, plus optional intro and outro |
| Critical moments | One scene per moment block, with configurable leading and trailing plies |
| Manual range | One contiguous move range |
| Template model | Project stores a full template snapshot |
| Template application | Apply style non-destructively, or regenerate scenes with confirmation |
| Custom template | Stores rules and defaults only, never moves or scene IDs |
| Editor depth | Full scene editor, including audio upload |
| Autosave | Debounced 800 ms with visible save state and retry |
| Undo | 20 project snapshots |
| Aspect ratios | 9:16, 16:9, 1:1, 4:5 |
| Template presets | Defined by this spec using existing R4 tokens only |
| Project version | Project v3; IndexedDB stays at version 1 |
| Timeline depth | Scene strip plus track rows, no timeline zoom |

---

## 3. User flow

```text
Analysis
  -> Create video
  -> Choose source mode: full game, critical moments, or manual range
  -> Choose template
  -> Configure lead-in and follow-through
  -> Generate scenes
  -> Open Video Studio
  -> Edit timeline and scenes
  -> Autosave
  -> Preview
  -> Save as template
  -> Templates gallery apply to existing project
```

```text
Templates
  -> Browse built-in and custom templates
  -> Preview representative frame
  -> Apply style or regenerate scenes in a selected project
  -> Duplicate, rename, or delete a custom template
```

---

## 4. Project model v3

### 4.1 Fields

`VideoProject` extends the R4 v2 model.

```ts
interface VideoProject {
  // Existing R4 fields remain.
  projectVersion: 3;
  template: TemplateSnapshot | null;
  sourceSelection?: SourceSelection;
  sourceContext?: SourceContext;
  schemaVersion: 3;
}
```

### 4.2 Template snapshot

```ts
interface TemplateSnapshot {
  id: string;
  name: string;
  version: number;
  description: string;
  defaultCanvas: CanvasSettings;
  defaultFrameRate: 30 | 60;
  style: TemplateStyle;
  sceneRules: TemplateSceneRules;
}
```

### 4.3 Source selection

```ts
type SourceSelection =
  | { mode: "full" }
  | { mode: "range"; fromPly: number; toPly: number }
  | {
      mode: "moments";
      moments: CriticalMomentReference[];
      leadInPlies: number;
      trailInPlies: number;
    };

interface CriticalMomentReference {
  ply: number;
  san: string;
  classification?: string;
  reason?: string;
}
```

### 4.4 Source context

```ts
interface SourceContext {
  opening?: { eco: string; name: string } | null;
  result?: string;
  criticalMoments?: CriticalMomentReference[];
}
```

### 4.5 Rules

- Project v3 is the only new project format.
- R4 v2 projects normalise to v3 on read.
- R1 v1 projects first normalise to v2, then to v3.
- Missing template snapshot remains `null` and disables template reset.
- `sourceSelection` is optional for migrated projects.
- `sourceContext` is optional and is used only for template text.
- Project canvas and frame rate are project-level values, not template-bound after creation.

---

## 5. Template model v2

### 5.1 Schema

```ts
interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  isBuiltIn: boolean;
  previewKey: string;
  defaultCanvas: CanvasSettings;
  defaultFrameRate: 30 | 60;
  style: TemplateStyle;
  sceneRules: TemplateSceneRules;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 2;
}
```

### 5.2 Template style

```ts
interface TemplateStyle {
  boardTheme: "forge" | "classic";
  coordinates: boolean;
  effects: Effects;
  camera: {
    introZoom: number;
    sceneZoom: number;
    focusActiveMove: boolean;
    easing: EasingName;
  };
  timing: SceneTiming;
  text: {
    title: TextStyle;
    moveLabel: TextStyle;
    explanation: TextStyle;
    caption: TextStyle;
  };
  audio: {
    sceneSfx: SceneAudioEvent[];
    projectTracks: AudioTrackTemplate[];
  };
}
```

### 5.3 Text style

```ts
interface TextStyle {
  font: "display" | "body" | "mono";
  fontSize: number;
  color: TextOverlay["color"];
  align: TextOverlay["align"];
  position: TextOverlay["position"];
  x: number;
  y: number;
  maxWidth: number;
  background: boolean;
}
```

### 5.4 Scene rules

```ts
interface TemplateSceneRules {
  defaultSourceMode: "full" | "moments" | "range";
  movesPerScene: number;
  includeIntro: boolean;
  includeOutro: boolean;
  introDurationInFrames: number;
  outroDurationInFrames: number;
  leadInPlies: number;
  trailInPlies: number;
}
```

### 5.5 Audio track template

```ts
interface AudioTrackTemplate {
  kind: "music" | "sfx";
  source: AudioSource;
  startFrame: number;
  durationInFrames: number;
  volume: number;
  muted: boolean;
  loop: boolean;
}
```

### 5.6 Template rules

- Built-in templates are read-only.
- Custom templates are stored in the existing `templates` store.
- Built-in templates are defined in code and merged with stored custom templates.
- Template version increments on every custom template update.
- Applying a template never mutates the source template.
- Custom template `id` values are UUIDs.
- Invalid or unsupported custom templates are skipped with a warning, not a crash.

---

## 6. Built-in templates

All seven templates use existing R4 tokens, themes, effects, text styles, timing, and audio events. No new fonts, colours, piece sets, or asset types are introduced.

| ID | Name | Default source | Scene grouping | Intro / outro | Visual and audio character |
|---|---|---|---|---|---|
| `cinematic-chess` | Cinematic Chess | Full game | 4 plies | 75 / 75 | forge, glow off, zoom 1.15, title and caption, move SFX 0.35 |
| `tactical-breakdown` | Tactical Breakdown | Critical moments | One scene per moment block | 45 / 45 | forge, capture/check focus, arrows, explanation from R3 reason, SFX 0.5 |
| `brilliant-move` | Brilliant Move | Brilliant moments | One scene per moment block | 60 / 60 | forge, glow on, zoom 1.4, brand annotation, caption |
| `checkmate-sequence` | Checkmate Sequence | Final six plies | 2 plies | 45 / 60 | forge, checkmate emphasis, glow on, result outro, checkmate SFX |
| `minimalist-analysis` | Minimalist Analysis | Full game | 4 plies | 45 / 45 | forge, coordinates off, zoom 1.0, small body captions, SFX 0.25 |
| `opening-tutorial` | Opening Tutorial | First ten plies | 2 plies | 60 / 45 | classic, coordinates on, ECO and opening name, calm pacing |
| `game-recap` | Game Recap | Critical moments | One scene per moment block | 60 / 60 | forge, focus on key squares, classification and reason, result outro |

### 6.1 Template default source modes

- `full`: use all plies in the game snapshot.
- `moments`: use the critical or brilliant moments selected during creation.
- `range`: use a manual ply range.

Templates with a moment default fall back to full game when no moments are available.

### 6.2 Template text tokens

Template text may use these tokens:

- `{white}`
- `{black}`
- `{result}`
- `{opening}`
- `{eco}`
- `{san}`
- `{moveNumber}`
- `{classification}`
- `{reason}`
- `{plyCount}`

Unknown tokens are left unchanged. Tokens are rendered as text nodes, never HTML.

---

## 7. Project creation

### 7.1 Entry points

- Analysis page has a **Create video** action.
- The action opens a modal.
- The modal requires a template selection.
- The modal supports three source modes.

### 7.2 Source modes

#### Full game

- Uses every ply in the game snapshot.
- Groups plies into blocks of `template.sceneRules.movesPerScene`.
- The final block may contain fewer plies.
- Adds intro and outro when enabled.

#### Critical moments

- Uses up to three critical moments from R3 when available.
- Deduplicates moments whose blocks overlap.
- Each moment becomes one scene block.
- Each block uses `leadInPlies` before and `trailInPlies` after the moment ply.
- Blocks are clipped to game bounds.
- Adds intro and outro when enabled.

#### Manual range

- Uses one contiguous `fromPly` to `toPly` range.
- Groups plies into blocks of `template.sceneRules.movesPerScene`.
- Adds intro and outro when enabled.

### 7.3 Project defaults

- Project name defaults to `{white} vs {black}`.
- Canvas defaults to the selected template `defaultCanvas`.
- Frame rate defaults to the selected template `defaultFrameRate`.
- Template snapshot is stored in the project.
- `sourceSelection` is stored in the project.
- `sourceContext` is stored when analysis data is available.

### 7.4 Quick R1 path

The existing **Create 3-second scene** action remains available for the R1 walking skeleton. It uses `createWalkingSkeletonProject` and does not require a template selection.

---

## 8. Scene generation

### 8.1 Scene types

- `intro`
- `move`
- `analysis`
- `recap`
- `outro`

### 8.2 Generation rules

- Scenes render in array order.
- `startFrame` is normalised to cumulative scene starts.
- `durationInFrames` is at least `sceneMinimumFrames(scene)`.
- A move scene `boardState.fen` is the FEN before its first ply.
- Move scene `moveRange` is inclusive and contiguous.
- Camera keyframes are generated from template camera settings and active move squares.
- Annotations are generated only by templates that define them.
- Text overlays use template text styles and token replacement.
- Audio events use template scene SFX.
- Project audio tracks use template project tracks.
- Scene IDs are new UUIDs on generation and regeneration.

### 8.3 Intro and outro

- Intro uses the initial FEN.
- Outro uses the final FEN.
- Intro and outro are static scenes with no move range.
- Their text uses `sourceContext`.
- Their duration uses `introDurationInFrames` and `outroDurationInFrames`.

### 8.4 Empty and invalid source

- A game with zero moves produces a project with intro and outro only.
- A moment outside game bounds is ignored.
- A manual range with `fromPly > toPly` is rejected with a validation error.
- A missing game snapshot prevents regeneration but does not prevent project editing.

---

## 9. Timeline and editing

### 9.1 Requirements

- Display scenes in timeline order.
- Display scene duration.
- Allow scene selection and seek.
- Allow scene duration changes.
- Preview selected scene and full sequence.
- Allow scene reordering.
- Allow adding, duplicating, and deleting scenes.
- Show total project duration.
- Support text and annotation track presentation.
- Support audio track presentation.

### 9.2 Scene operations

- Reorder recalculates every `startFrame`.
- Duplicate creates a new scene ID and preserves content.
- Delete requires confirmation.
- Add scene creates a static board scene from the selected scene's final FEN.
- Duration changes are clamped to `sceneMinimumFrames(scene)`.
- Empty projects show an empty preview state.

### 9.3 Track presentation

- Text and annotation tracks are projections of scene-owned overlays and annotations.
- Audio track rows display project audio tracks.
- Scene SFX are shown as markers on the audio row.
- Tracks are edited through the scene inspector.
- No duplicate project-level text or annotation data model is introduced.

### 9.4 Timeline UI

- Scene strip uses cards, not a full NLE lane editor.
- Tracks are rows beneath the scene strip.
- Playhead shows the current frame.
- No timeline zoom is implemented in R5.

### 9.5 Editing behaviour

- Changes update preview immediately.
- Template defaults and project-specific overrides are distinguished.
- A property can be reset to its template default.
- Destructive actions require confirmation.
- The editor avoids losing changes during panel navigation.
- Autosave is debounced and shows visible save state.

---

## 10. Scene editing

### 10.1 Board

- Board theme: forge or classic.
- Orientation: white or black.
- Coordinates on or off.
- Focus toggle.
- Scene timing fields.
- Duration.

### 10.2 Camera

- Camera keyframe list.
- Add keyframe at the current scene frame.
- Edit frame, zoom, x, y, and easing.
- Delete keyframe.
- Reset camera to one default keyframe.

### 10.3 Annotations

- Add, edit, and delete arrow, square, and highlight annotations.
- Fields: type, from, to, square, colour, opacity, start frame, duration.
- Invalid squares are skipped with a warning.

### 10.4 Text overlays

- Add, edit, and delete text overlays.
- Fields: kind, text, font, size, colour, alignment, position, x, y, maxWidth, background, start frame, duration.
- Safe-area warning per overlay.

### 10.5 Effects

- lastMoveHighlight
- checkIndicator
- captureEmphasis
- checkmateEmphasis
- glow
- focus

### 10.6 Scene SFX

- Add, edit, and delete scene audio events.
- Fields: trigger, frame offset, volume, mute.

### 10.7 Overrides

- An edited property is recorded in `scene.overrides`.
- Reset removes the override and restores the template default.
- Scenes without a template snapshot cannot reset to a template default.

---

## 11. Audio

### 11.1 Project audio tracks

- Add, edit, and delete project audio tracks.
- Fields: kind, source, start frame, duration, volume, mute, loop.
- Built-in sources use the R4 SFX paths.
- Asset sources reference the asset store.

### 11.2 Upload

- Supported MIME types: `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/ogg`, `audio/mp4`, `audio/webm`.
- Maximum file size: 50 MB.
- Maximum duration: 10 minutes.
- Maximum project asset total: 250 MB.
- Files are hashed with SHA-256 and deduplicated.
- Asset metadata is stored in `project.assets`.
- Unsupported files produce a visible error and are not stored.

### 11.3 Preview

- The R4 asset resolver creates object URLs.
- Missing assets produce warnings, not crashes.
- Object URLs are revoked on unmount.

---

## 12. Aspect ratios

Supported values:

- `9:16`: 1080 x 1920
- `16:9`: 1920 x 1080
- `1:1`: 1080 x 1080
- `4:5`: 1080 x 1350

Rules:

- Changing aspect ratio updates `canvas`.
- Text and safe-area warnings recompute.
- Existing overlays are not automatically resized.
- Preview uses the new dimensions immediately.

---

## 13. Autosave and undo

### 13.1 Autosave

- Autosave begins only after the project is loaded.
- Meaningful edits are debounced for 800 ms.
- Save state is `idle`, `saving`, `saved`, or `error`.
- Save errors show a retry action.
- `updatedAt` is updated by the repository on save.
- Save failure does not discard in-memory edits.

### 13.2 Undo and redo

- 20 project snapshots are retained.
- Undo and redo are available from buttons.
- Keyboard shortcuts are `Ctrl/Cmd+Z` and `Shift+Ctrl/Cmd+Z`.
- Shortcuts do not override text input editing.
- Scene selection alone does not create a history entry.

### 13.3 Destructive actions

- Delete scene requires confirmation.
- Delete project requires confirmation.
- Delete template requires confirmation.
- Template regeneration requires confirmation and explains lost edits.

### 13.4 Navigation safety

- Pending autosave is flushed on unmount.
- A dirty project warns before browser unload.

---

## 14. Template application

### 14.1 Apply style

- Updates the project template snapshot.
- Applies template style to scene properties that are not recorded in `scene.overrides`.
- Preserves scene sequence, move ranges, text content edits marked as overrides, and project audio tracks.
- Does not change project canvas or frame rate.

### 14.2 Regenerate scenes

- Requires `sourceSelection`.
- Rebuilds scenes from the game snapshot and template.
- Preserves project name, canvas, frame rate, and project audio tracks.
- Replaces scenes and scene SFX.
- Requires confirmation.
- Is recorded as one undo entry.

### 14.3 Reset to template default

- Available when `template` is present.
- Rebuilds the affected property from the template snapshot and scene context.
- Removes the corresponding override key.

### 14.4 Custom template CRUD

- Create from current project.
- Duplicate.
- Rename and edit description.
- Update rules from current project.
- Delete with confirmation.
- Built-in templates are read-only.

### 14.5 Templates page

- Lists all built-in templates.
- Lists custom templates.
- Shows a code-rendered representative frame.
- Allows applying a template to an existing project.
- Allows choosing **Apply style** or **Regenerate scenes**.

---

## 15. Project library

### 15.1 Studio list

- Lists projects by `updatedAt`.
- Shows scene count, aspect ratio, and updated time.
- Opens a project.
- Deletes a project with confirmation.
- Links to analysis for new projects.

### 15.2 Dashboard

- Shows the most recent project.
- Links to templates.
- Does not duplicate the full project list.

---

## 16. Error handling

| Case | Required behaviour |
|---|---|
| Source game missing | Use stored game snapshot; show archived notice |
| Scene references invalid ply | Show board error and skip animation |
| Zero or negative duration | Reject with validation message |
| Audio asset unavailable | Warning, skip audio, continue preview |
| Text exceeds safe area | Warning listing overlay ID |
| Aspect ratio no longer fits | Warning, render continues |
| Preview frame fails | Visible error state, project untouched |
| Storage unavailable | Recoverable error state |
| Quota exceeded | Visible error and retry |
| Migration fails | Recoverable error state |
| Invalid template | Skip template, show warning |
| Audio upload invalid | Visible error, no asset stored |
| Empty project | Empty preview state |

---

## 17. Testing

### 17.1 Unit tests

- Project v2 to v3 normalisation.
- R1 v1 to v3 normalisation.
- Idempotent normalisation.
- Template v1 to v2 normalisation.
- Built-in template count and schema.
- Full-game grouping with final partial block.
- Critical moment deduplication and clipping.
- Manual range validation.
- Scene minimum duration and duration clamp.
- Timeline reorder and start recalculation.
- Duplicate and delete behaviour.
- Undo history limit.
- Autosave debounce.
- Template apply preserves overrides.
- Template regeneration uses source selection.
- Reset to template default.
- Audio upload validation and deduplication.
- Aspect ratio presets.
- Template text token replacement.

### 17.2 Integration tests

- Template repository CRUD.
- Project repository v3 save and reopen.
- Template application and regeneration.
- Asset repository deduplication.
- Create dialog generation.
- Autosave and save-error recovery.

### 17.3 E2E tests

Add `e2e/r5-studio.spec.ts`:

- Create a project from a full game.
- Create a project from critical moments.
- Create a project from a manual range.
- Select each built-in template.
- Reorder, duplicate, delete, and change scene duration.
- Edit text, annotation, camera, and effect.
- Upload audio and verify preview.
- Apply template style and regenerate.
- Save a custom template and apply it.
- Autosave indicator and reload reopen.
- No horizontal overflow at 390 px.

Add `e2e/r5-production.spec.ts`:

- Open a seeded R5 project in the production build.
- Verify timeline, scene seek, and project duration.
- Verify aspect ratio and no horizontal overflow at 390 px.

### 17.4 Gate G9

G9 passes only when:

- AC-05 and AC-06 pass.
- A project can be created from a complete game.
- A project can be created from selected moments.
- A built-in template can be applied.
- Generated scenes represent intended moves and positions.
- User can select scenes and change duration.
- User can preview the sequence.
- Project changes save and reopen locally.
- Custom templates can be saved and reused.
- All seven built-in templates work.
- R1, R2, R3, and R4 E2E remain green.
- Production E2E passes.
- `npm run check:all` passes.
- Evidence is recorded in `docs/evidence/R5/gate-g9.md`.

---

## 18. Task order

### 18.1 Wave 1: model and template library

1. Project v3 schema and normalisation.
2. Template v2 schema and normalisation.
3. Seven built-in templates.
4. Unit tests.

Maps to R5-T03, R5-T04.

### 18.2 Wave 2: project creation

1. Scene generation.
2. Creation modal.
3. Source selection storage.
4. Integration tests.

Maps to R5-T01, R5-T02.

### 18.3 Wave 3: timeline and persistence

1. Scene operations.
2. Track rows.
3. Autosave.
4. Undo and redo.
5. Unit and integration tests.

Maps to R5-T07, R5-T12, R5-T13, R5-T14.

### 18.4 Wave 4: scene editing

1. Board and timing.
2. Camera.
3. Annotations.
4. Text.
5. Effects and scene SFX.
6. Unit tests.

Maps to R5-T11, R5-T08.

### 18.5 Wave 5: audio and aspect ratio

1. Project audio editor.
2. Upload validation.
3. Aspect ratio switching.
4. Unit and integration tests.

Maps to R5-T09, R5-T10.

### 18.6 Wave 6: templates and library

1. Template application.
2. Regeneration.
3. Reset to template default.
4. Custom template CRUD.
5. Templates page.
6. Studio and dashboard library updates.
7. Unit and integration tests.

Maps to R5-T04, R5-T05, R5-T06, R5-T15.

### 18.7 Wave 7: gate

1. Determinism tests.
2. Dev E2E.
3. Production E2E.
4. Evidence.
5. ROADMAP and ADR updates.

Maps to R5-T16.

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| Full game creates too many scenes | Three-ply grouping and duration minimums |
| Template regeneration loses edits | Confirmation dialog and undo |
| Autosave races | Revision-based debounce and flush on unmount |
| Audio upload exceeds quota | Size, duration, and project total checks |
| Aspect ratio breaks text | Safe-area warnings and no auto-resize |
| Custom template becomes stale | Versioned snapshots and reset fallback |
| Track UI becomes crowded | Scene strip plus concise track rows |
| R4 projects lose template data | `template` remains optional and null |

---

## 20. Handoff to R6

R5 hands R6:

- Project v3 with template snapshot and source selection.
- Template schema v2 and seven built-in templates.
- Project creation and regeneration flow.
- Timeline operations and autosave.
- Scene and audio editors.
- Aspect ratio switching.
- Custom template CRUD.
- R5 E2E and Gate G9 evidence.

R6 adds export configuration, capability detection, rendering, cancellation, validation, and cleanup. R6 must not create a second renderer.

---

*Generated from `docs/ROADMAP.md` v1.0, PRD revision 1.1, approved user decisions, and `docs/specs/R4-animation-core.md` on 2026-11-23.*
