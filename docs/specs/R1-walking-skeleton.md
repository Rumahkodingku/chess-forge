---
title: ChessForge — Phase R1 Walking Skeleton Specification
product: ChessForge
spec_version: "1.0"
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Ready for implementation
last_updated: 2026-11-22
language: en
---

# ChessForge — Phase R1 Specification

This document specifies the R1 walking skeleton. R1 proves the full product path with one thin slice: import a fixture PGN, replay it, analyse one position, create one scene, preview it, export a three-second video, save the project, reload, and reopen it.

R1 is not the final import, analysis, or studio implementation. It is the end-to-end risk gate before R2, R3, and R4 add depth.

---

## 1. Purpose

R1 exists to prove that every architectural layer works together with real data:

1. PGN import and local persistence.
2. Legal move replay and selection.
3. Stockfish analysis in a Web Worker.
4. Project and scene creation.
5. Remotion preview.
6. Browser video export with audio.
7. Save, reload, and reopen.
8. Production-build E2E coverage.

R1 passes only when Gate G5 passes with evidence.

---

## 2. Scope

### 2.1 In scope

- Real routes: `/analysis`, `/analysis/[gameId]`, `/studio`, `/studio/[projectId]`.
- Paste PGN with one fixture shortcut.
- Persist imported game to IndexedDB.
- SVG board replay with first, previous, next, last, and direct move selection.
- Keyboard left and right arrow navigation.
- One-shot Stockfish analysis for the position before the selected move.
- Eval, best move, mate score, and MultiPV 3 display.
- One scene from the selected move.
- Three-second 9:16 composition at 1080x1920, 30 FPS.
- Remotion Player preview.
- WebM export with move SFX.
- MP4 export where supported.
- Explicit project save, reload, and reopen.
- Dashboard recent game and recent project.
- Production-build Playwright test.
- Gate G5 evidence.

### 2.2 Out of scope

- Chessground and interactive board dragging.
- PGN file upload.
- Chess.com and Lichess import.
- Multiple-game selection.
- Move classifications, centipawn loss, opening, phase, threats, and game summary.
- Analysis cache and full-game analysis queue.
- Template gallery, template application, and custom templates.
- Timeline, multiple scenes, scene reordering, and scene editing.
- Audio track editor and user audio upload.
- Autosave.
- Backup and restore.
- Full game or project library pages.
- Mobile-specific feature redesign beyond the existing responsive shell.

---

## 3. Approved decisions

| Topic             | Decision                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Flow location     | Real product routes                                                 |
| Persistence       | Game and project stored in IndexedDB                                |
| Replay board      | R0 `BoardSvg`; Chessground arrives in R2                            |
| Analysis position | Position before the selected move                                   |
| Analysis mode     | One-shot, MultiPV 3, no cache, no classification                    |
| Scene             | One scene, fixed three seconds, one move                            |
| Output            | 9:16, 1080x1920, 30 FPS, 90 frames                                  |
| Audio             | One move SFX                                                        |
| Save timing       | Save when scene is created, plus `Save project` on the studio route |
| Reload            | `/studio/[projectId]` reloads from IndexedDB                        |
| Dashboard         | Recent game and recent project from IndexedDB                       |
| Production E2E    | `next build` plus `next start`                                      |
| UI quality        | Polished minimal, consistent with R0 design system                  |

---

## 4. User flow

```text
/analysis
  Paste PGN or use fixture
  Import
  -> /analysis/[gameId]
  Navigate to a move
  Analyse position
  Create 3-second scene
  -> /studio/[projectId]
  Preview
  Save project
  Export WebM
  Download
  Reload page
  Reopen project
```

The flow must work without an account, cloud service, or network call.

---

## 5. Fixture

Use one deterministic fixture:

```pgn
[Event "R1 walking skeleton fixture"]
[Site "local"]
[Date "2024.01.01"]
[Round "1"]
[White "White"]
[Black "Black"]
[Result "*"]
[TimeControl "300+0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *
```

Requirements:

- Fixture file: `src/features/games/fixtures/r1-walking-skeleton.pgn`.
- Legal standard chess.
- Ten ply.
- Includes castling.
- Result `*` is acceptable.
- Import uses the existing `parseSinglePgn` path.
- The fixture is test data, not a fabricated user game.

---

## 6. Routes and screen contracts

### 6.1 `/analysis`

Purpose: import one PGN.

Required elements:

- Page title and short description.
- Visible label for the PGN textarea.
- PGN textarea.
- `Use fixture` button.
- `Import game` button.
- Error alert for invalid PGN.
- Loading state on import.
- Link to `/labs/pgn` for the parser proof.

Behaviour:

- Empty input shows a clear validation error.
- Invalid PGN shows the parser error and does not write to IndexedDB.
- Valid PGN is converted to the internal `Game` model.
- Imported game is saved with `GameRepository`.
- On success, navigate to `/analysis/{game.id}`.
- Multiple games are not selected in R1. Use the first parsed game and state that R2 adds selection.

### 6.2 `/analysis/[gameId]`

Purpose: replay a saved game and analyse one position.

Required elements:

- Board rendered by `BoardSvg`.
- Game metadata: White, Black, result.
- Move list with SAN.
- First, previous, next, last controls.
- Direct move selection.
- Selected ply indicator.
- Engine panel.
- `Analyse position` button.
- `Stop` button while analysis is running.
- Eval, best move, mate score, and MultiPV lines.
- `Create 3-second scene` button.
- Not-found state when the game ID is invalid or missing.

Behaviour:

- Selected ply 0 is the initial position.
- Board always matches the selected ply.
- Move list highlights the selected move.
- Left and right arrow keys move one ply.
- Analysis uses the FEN before the selected move.
- Analysis is one-shot and is not persisted.
- Analysis result is cleared when the selected move changes.
- `Create 3-second scene` is disabled at ply 0.
- Create scene persists the project and navigates to `/studio/{project.id}`.
- Engine failure does not prevent scene creation.

### 6.3 `/studio`

Purpose: list saved R1 projects.

Required elements:

- Page title.
- Saved project list with name, source players, and updated time.
- Link to `/studio/[projectId]`.
- Empty state with a link to `/analysis`.

Behaviour:

- Projects load from `ProjectRepository`.
- Missing or invalid records show a recoverable error.
- No fake project rows.

### 6.4 `/studio/[projectId]`

Purpose: preview, save, and export one project.

Required elements:

- Remotion Player preview.
- Project and scene summary.
- `Save project` button.
- `Export video` button.
- Export progress.
- `Cancel export` button.
- Download link after success.
- Not-found state for a missing project.
- Error state for export failure.

Behaviour:

- Project loads from `ProjectRepository`.
- Preview uses the shared `SceneComposition`.
- Save writes the current project to IndexedDB.
- Export uses the shared export runner.
- Export cancellation does not remove or mutate the project.
- Reload after save reopens the same project.
- Export file name is derived from the project name and sanitised.

### 6.5 Dashboard

Add a client component that loads:

- Most recent game.
- Most recent project.

Requirements:

- Links go to the real routes.
- Empty states remain honest.
- No fabricated rows, counts, or metrics.
- Loading and error states are visible.
- The component reads through repositories, not raw IndexedDB.

---

## 7. Data model changes

### 7.1 Game snapshot

`VideoProject` gains an optional game snapshot so the project can render after the source game is deleted.

```ts
export interface GameSnapshot {
  metadata: GameMetadata;
  initialFen: string;
  moves: Move[];
}
```

Add to `VideoProject`:

```ts
gameSnapshot?: GameSnapshot;
```

The R1 factory always writes a snapshot. The field remains optional for backward compatibility.

### 7.2 Project factory

Create `src/features/studio/project-factory.ts`.

```ts
export interface CreateWalkingSkeletonProjectInput {
  game: Game;
  selectedPly: number;
}

export function createWalkingSkeletonProject(
  input: CreateWalkingSkeletonProjectInput,
): VideoProject;
```

Factory rules:

- `id`: `crypto.randomUUID()`.
- `name`: `${metadata.white} vs ${metadata.black}`.
- `sourceGameId`: game ID.
- `templateId`: `"r1-skeleton"`.
- `projectVersion`: 1.
- `canvas`: 9:16, width 1080, height 1920.
- `frameRate`: 30.
- `scenes`: one move scene.
- `tracks`: empty text, annotation, and audio arrays.
- `assets`: empty.
- `gameSnapshot`: metadata, initial FEN, all moves.
- `createdAt` and `updatedAt`: ISO timestamp.
- `schemaVersion`: 1.

### 7.3 Scene factory

The selected ply must be at least 1.

```ts
export interface CreateMoveSceneInput {
  game: Game;
  selectedPly: number;
}

export function createWalkingSkeletonScene(
  input: CreateMoveSceneInput,
): Scene;
```

Scene rules:

- `id`: `crypto.randomUUID()`.
- `type`: `"move"`.
- `startFrame`: 0.
- `durationInFrames`: 90.
- `moveRange`: selected ply to selected ply.
- `boardState.fen`: the selected move's `fenBefore`.
- `boardState.orientation`: `"w"`.
- `boardState.lastMove`: the selected move's `uci`.
- `camera`: zoom 1, x 0, y 0.
- `annotations`: empty.
- `textOverlays`: one move label.
- Move label text: full move number plus SAN, for example `1. e4` or `1... e5`.
- Move label position: bottom.
- Move label timing: frame 0 to frame 90.
- `effects.lastMoveHighlight`: true.
- `effects.checkIndicator`: true.
- `effects.captureEmphasis`: true.
- `effects.glow`: false.
- `audioReferences`: empty.
- `overrides`: empty.
- `schemaVersion`: 1.

Move SFX is a composition default in R1, not scene data. R4/R5 moves it into scene audio references.

### 7.4 Schema compatibility

- `gameSnapshot` is optional and does not require an IndexedDB version bump.
- Existing R0 test data remains valid.
- New R1 projects always include a snapshot.
- R2 may add game-library features, but R1 projects remain independent.

---

## 8. Composition and export architecture

### 8.1 Shared scene composition

Refactor the R0 export proof into a shared composition:

```ts
export interface SceneCompositionProps {
  project: VideoProject;
  scene: Scene;
}
```

File: `src/features/studio/rendering/scene-composition.tsx`.

Requirements:

- Render the board from `scene.boardState.fen`.
- Find the selected move in `project.gameSnapshot.moves` by `scene.moveRange.fromPly`.
- Animate the move over frames 10 to 55.
- Hold the final position from frame 55 to frame 90.
- Play `/audio/sfx/move.wav` at frame 10.
- Render the scene text overlay.
- Keep the composition deterministic.
- Do not read IndexedDB during render.
- Do not fetch remote assets.

The R0 export lab must use this composition with a fixture project. G1 must still pass after the refactor.

### 8.2 Shared export runner

Create `src/features/studio/rendering/export-runner.ts`.

```ts
export interface ExportProjectRequest {
  project: VideoProject;
  container: "webm" | "mp4";
  videoCodec: "vp9" | "vp8" | "h264";
  audioCodec: "opus" | "aac";
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

export interface ExportProjectResult {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
}

export async function exportProject(
  request: ExportProjectRequest,
): Promise<ExportProjectResult>;
```

Requirements:

- Use `canRenderMediaOnWeb` before rendering.
- Use `renderMediaOnWeb`.
- Use `licenseKey: "free-license"`.
- Use 1080x1920, 30 FPS, 90 frames.
- Support cancellation through `AbortSignal`.
- Clean up object URLs and temporary resources.
- Use the same runner in `/labs/export` and `/studio/[projectId]`.
- WebM VP9/Opus is the required R1 output.
- MP4 H.264/AAC is attempted when supported.

### 8.3 Export acceptance

An R1 export passes when:

- A file is produced.
- The file is non-empty.
- WebM is produced in the primary test.
- MP4 is produced where the browser supports it.
- Video duration is approximately three seconds.
- Dimensions are 1080x1920.
- Audio is present.
- The file opens in a common media player.

---

## 9. Persistence and reload

### 9.1 Game persistence

- Imported game is written to `games`.
- Repository validation applies.
- Failed writes show a visible error.
- Failed import does not overwrite an existing game.

### 9.2 Project persistence

- Project is written to `projects` when `Create 3-second scene` is clicked.
- `Save project` re-writes the same project and updates `updatedAt`.
- Project load validates the stored record.
- Missing project shows a not-found state.
- Reloading `/studio/[projectId]` loads the same project.
- No autosave in R1.

### 9.3 Recent work

- Dashboard recent game is the latest `games` record by `updatedAt`.
- Dashboard recent project is the latest `projects` record by `updatedAt`.
- The component uses repositories and handles empty, loading, and error states.

---

## 10. Error handling

| Case                     | Required behaviour                                     |
| ------------------------ | ------------------------------------------------------ |
| Empty PGN                | Inline validation, no write                            |
| Invalid PGN              | Parser error, no write, existing data unchanged        |
| Invalid game route ID    | Not-found state, link to `/analysis`                   |
| Missing game             | Not-found state, no crash                              |
| Engine load failure      | Error panel with retry, scene creation still available |
| Engine analysis failure  | Error panel, selected position unchanged               |
| Analysis stopped         | Show partial or unavailable state, no crash            |
| Invalid project route ID | Not-found state, link to `/studio`                     |
| Missing project          | Not-found state, no crash                              |
| Project save failure     | Visible error, do not claim saved                      |
| Export unsupported       | Explain unavailable codec, offer WebM                  |
| Export cancelled         | No file kept, project unchanged                        |
| Export failure           | Useful error, project unchanged                        |
| IndexedDB unavailable    | Recoverable storage error                              |
| Corrupt stored record    | Validation error, no crash                             |

---

## 11. Testing

### 11.1 Unit tests

- `createWalkingSkeletonProject` writes snapshot, scene, canvas, and template.
- `createWalkingSkeletonScene` rejects ply 0.
- Scene timing is exactly 90 frames.
- Move label uses correct SAN and move number.
- Game snapshot preserves initial FEN and moves.
- Route ID validation accepts UUIDs and rejects malformed IDs.
- Export request validation covers supported and unsupported combinations.

### 11.2 Integration tests

- Save a game, load it by ID, and list it.
- Save a project with a game snapshot, load it, and compare.
- Dashboard latest-game and latest-project selectors.
- Project reload after repository round trip.
- Existing R0 export proof still passes after the composition refactor.

### 11.3 Production E2E

Add `playwright.production.config.ts` and a script:

```json
{
  "test:e2e:prod": "npm run build && playwright test -c playwright.production.config.ts"
}
```

Production server:

- `next start -p 3100`.
- `baseURL: "http://localhost:3100"`.
- `reuseExistingServer: false`.
- Chromium project.
- No dev server.

Test flow:

1. Open `/analysis`.
2. Use fixture.
3. Import.
4. Replay at least five moves.
5. Analyse the selected position.
6. See eval and best move.
7. Create scene.
8. Open studio project route.
9. See Remotion preview.
10. Export WebM.
11. Assert downloaded file is non-empty.
12. Save project.
13. Reload.
14. Reopen project.
15. Assert preview and project metadata are present.

CI:

- Keep the existing fast dev E2E suite.
- Add the production E2E step after the production build.
- Use Playwright Chromium and WebM.
- Do not depend on live Chess.com or Lichess.

### 11.4 Evidence

Create `docs/evidence/R1/` with:

- `gate-g5.md`.
- Production E2E log.
- Dashboard and analysis screenshots.
- Studio preview screenshot.
- Exported three-second WebM.
- `ffprobe` validation output.
- Any known limitations.

---

## 12. Gate G5 acceptance criteria

G5 passes only when:

- R1-T01 to R1-T08 are complete.
- A fixture PGN imports and persists.
- At least five moves replay correctly.
- One position analyses with Stockfish.
- Eval, best move, and mate distinction display.
- One scene is created from a selected move.
- Remotion preview renders deterministically.
- A three-second WebM exports with audio.
- Project saves, reloads, and reopens.
- Production E2E passes in CI.
- No critical console errors.
- `npm run check:all` passes.
- R0 export proof still passes.

---

## 13. Task order

### 13.1 Wave 1: data and render foundation

1. Add `GameSnapshot` and update `VideoProject` schema.
2. Create project and scene factories.
3. Refactor the R0 composition into `SceneComposition`.
4. Create the shared export runner.
5. Run R0 G1 regression.

### 13.2 Wave 2: import and analysis

1. Build `/analysis` import screen.
2. Persist imported game and navigate.
3. Build `/analysis/[gameId]`.
4. Add board replay and keyboard navigation.
5. Add one-shot engine analysis.
6. Add scene creation and project save.

### 13.3 Wave 3: studio and export

1. Build `/studio` project list.
2. Build `/studio/[projectId]`.
3. Add Player preview.
4. Add explicit save.
5. Add WebM export, progress, cancel, and download.
6. Add error states.

### 13.4 Wave 4: dashboard and gate

1. Add recent game and project to dashboard.
2. Add production Playwright config.
3. Add production E2E flow.
4. Record Gate G5 evidence.
5. Update ADRs and ROADMAP R1 status.

---

## 14. Risks

| Risk                                 | Mitigation                                       |
| ------------------------------------ | ------------------------------------------------ |
| Composition refactor breaks R0 G1    | Run R0 export E2E after refactor                 |
| Project snapshot duplicates data     | Keep it optional and factory-owned               |
| IndexedDB hydration delay            | Client loading states; no fake data              |
| Production E2E slower than dev       | Separate config and CI step                      |
| Audio sync drifts                    | Fixed 90-frame timing and one SFX at frame 10    |
| Engine failure blocks scene creation | Analysis is independent from scene creation      |
| Route reload loses state             | Save project before navigation; load by route ID |
| Remotion client renderer limitations | Reuse R0-proven primitives only                  |
| Missing project after reload         | Not-found state with recovery link               |

---

## 15. Definition of Done

R1 is done when:

- All R1 tasks are complete.
- Gate G5 passes.
- `npm run check:all` passes.
- `npm run test:e2e` passes.
- `npm run test:e2e:prod` passes.
- R0 export proof remains green.
- Evidence is recorded.
- Documentation and roadmap status are updated.
- No R2 or R5 feature has been pulled into R1 without approval.

---

## 16. Handoff to R2

R1 hands R2:

- A working import route and persisted game records.
- A working analysis route with one-shot engine analysis.
- A project factory and scene factory.
- A shared deterministic composition.
- A shared export runner.
- A production E2E harness.
- Evidence that the full path works.

R2 replaces the SVG analysis board with Chessground, adds PGN file upload, multi-game selection, and external imports.

---

*Generated from `docs/ROADMAP.md` v1.0 and approved user decisions on 2026-11-22.*
