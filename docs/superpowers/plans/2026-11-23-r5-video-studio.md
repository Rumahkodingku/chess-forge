# R5 Video Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Execute `docs/specs/R5-video-studio.md` end to end on `main`.

**Architecture:** Extend project v2 to v3 with a template snapshot, generate deterministic scenes from source selections, then add timeline/scene/audio editors on the existing `ProjectComposition` renderer.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, IndexedDB (`idb`), Remotion Player, Vitest, Playwright.

**Spec:** `docs/specs/R5-video-studio.md`

## Global Constraints

- Work only on `main`.
- Do not create a second renderer; preview and export keep `ProjectComposition`.
- Keep R1, R2, R3, and R4 green.
- No new dependencies.
- IndexedDB stays at version 1.
- All persisted boundaries use Zod.
- Run focused tests per task, then `npm run check:all`, dev E2E, and production E2E before Gate G9.
- Use existing R4 tokens, fonts, colours, piece set, and audio assets.

## Review Focus

- Template snapshot survives template edit/delete and project reload.
- R4 v2 projects still open after v3 normalisation.
- Autosave does not save a stale project after undo or rapid edits.
- Regenerating scenes is confirmed, undoable, and never mutates the template.
- Audio upload rejects bad MIME, over-size, over-duration, and over-quota files.
- Aspect ratio changes keep text warnings and preview dimensions correct.
- Timeline duration cannot fall below `sceneMinimumFrames`.

---

### Task 1: Project v3, template schema, built-ins, migration

**Files:**
- Modify: `src/features/studio/scene/scene.types.ts`
- Modify: `src/features/studio/scene/project-normalization.ts`
- Modify: `src/features/studio/project-factory.ts`
- Modify: `src/features/templates/types.ts`
- Create: `src/features/templates/builtins.ts`
- Create: `src/features/templates/builtins.test.ts`
- Modify: `src/features/studio/scene/project-normalization.test.ts`
- Modify: `src/features/storage/db.test.ts`

**Interfaces:**
- Produces: `videoProjectSchema` v3 with `template`, `sourceSelection`, `sourceContext`.
- Produces: `templateSchema` v2 and `BUILT_IN_TEMPLATES`.
- Produces: `normalizeProject` accepting v1, v2, and v3.

- [ ] Write failing tests for v2→v3, v1→v3, idempotence, template schema, seven built-ins.
- [ ] Run tests and confirm failure.
- [ ] Implement schemas, normalisation, and built-ins.
- [ ] Run focused tests and full typecheck.
- [ ] Commit.

### Task 2: Scene generation and source selection

**Files:**
- Create: `src/features/studio/creation/source-selection.ts`
- Create: `src/features/studio/creation/source-selection.test.ts`
- Create: `src/features/studio/creation/generate-project.ts`
- Create: `src/features/studio/creation/generate-project.test.ts`

**Interfaces:**
- Consumes: project v3 and template snapshot from Task 1.
- Produces: `generateProject({ game, summary, template, selection, settings })`.
- Produces: `selectSourcePlies(game, selection, rules)`.

- [ ] Write failing tests for full-game grouping, final partial block, moment dedupe/clipping, manual range validation, intro/outro, duration minimum, token replacement.
- [ ] Run tests and confirm failure.
- [ ] Implement pure generation helpers.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 3: Creation dialog and analysis integration

**Files:**
- Create: `src/features/studio/components/create-project-dialog.tsx`
- Modify: `src/app/(app)/analysis/[gameId]/page.tsx`
- Modify: `src/features/analysis/components/game-summary-panel.tsx` if needed
- Create: `src/features/studio/creation/create-project.test.ts` if UI logic is extracted

**Interfaces:**
- Consumes: generation from Task 2.
- Produces: modal with full game, critical moments, and manual range modes.

- [ ] Write failing tests for modal source-state validation and project name/canvas defaults.
- [ ] Run tests and confirm failure.
- [ ] Implement modal, save project, navigate to studio, keep R1 quick path.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 4: Timeline operations, autosave, undo

**Files:**
- Create: `src/features/studio/editing/project-operations.ts`
- Create: `src/features/studio/editing/project-operations.test.ts`
- Create: `src/features/studio/editing/history.ts`
- Create: `src/features/studio/editing/history.test.ts`
- Create: `src/features/studio/editing/use-project-editor.ts`
- Create: `src/features/studio/editing/use-project-editor.test.ts`

**Interfaces:**
- Produces: reorder, duplicate, delete, add scene, set duration, set canvas, set template snapshot.
- Produces: 20-snapshot undo/redo.
- Produces: revision-based autosave hook with 800 ms debounce and save state.

- [ ] Write failing tests for operations, minimum duration, undo limit, redo, autosave debounce, save error.
- [ ] Run tests and confirm failure.
- [ ] Implement operations and hooks.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 5: Studio editor UI, timeline, inspector, aspect ratio

**Files:**
- Create: `src/features/studio/components/timeline-panel.tsx`
- Create: `src/features/studio/components/scene-inspector.tsx`
- Create: `src/features/studio/components/project-toolbar.tsx`
- Create: `src/features/studio/components/scene-editors/*`
- Modify: `src/app/(app)/studio/[projectId]/page.tsx`
- Create: unit tests for override/reset and text/annotation editors

**Interfaces:**
- Consumes: editing hooks from Task 4.
- Produces: scene strip, track rows, scene inspector, aspect ratio selector, save state, undo/redo.

- [ ] Write failing tests for override recording/reset, duration UI clamp, canvas presets, track projections.
- [ ] Run tests and confirm failure.
- [ ] Implement UI components and page integration.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 6: Audio upload and track editor

**Files:**
- Create: `src/features/studio/audio/audio-upload.ts`
- Create: `src/features/studio/audio/audio-upload.test.ts`
- Create: `src/features/studio/components/project-audio-editor.tsx`
- Modify: `src/app/(app)/studio/[projectId]/page.tsx`

**Interfaces:**
- Produces: `importAudioAsset`, MIME/size/duration/project-total validation, hash dedupe.
- Produces: project audio track add/edit/delete and file upload UI.

- [ ] Write failing tests for MIME, size, duration, dedupe, project total.
- [ ] Run tests and confirm failure.
- [ ] Implement upload and editor.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 7: Template application, custom CRUD, templates page, library

**Files:**
- Create: `src/features/templates/apply.ts`
- Create: `src/features/templates/apply.test.ts`
- Create: `src/features/templates/custom.ts`
- Create: `src/features/templates/custom.test.ts`
- Create: `src/features/templates/components/template-preview.tsx`
- Modify: `src/app/(app)/templates/page.tsx`
- Modify: `src/app/(app)/studio/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: snapshots from Task 1 and generation from Task 2.
- Produces: apply style, regenerate scenes, reset defaults, custom template CRUD, template gallery.

- [ ] Write failing tests for apply preserving overrides, regenerate using source selection, custom snapshot rules only, template version bump.
- [ ] Run tests and confirm failure.
- [ ] Implement domain helpers, pages, and dialogs.
- [ ] Run focused tests and typecheck.
- [ ] Commit.

### Task 8: R5 E2E, production E2E, evidence, docs

**Files:**
- Create: `e2e/r5-studio.spec.ts`
- Create: `e2e/r5-production.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `playwright.production.config.ts`
- Create: `src/features/studio/fixtures/r5-project.ts`
- Create: `docs/evidence/R5/gate-g9.md`
- Create: `docs/evidence/R5/*.png`
- Create: `docs/adr/0016-video-studio.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/specs/R5-video-studio.md` status

**Acceptance:**
- R5 dev and production E2E pass.
- `npm run check:all` passes.
- R1–R4 remain green.
- Gate G9 evidence recorded.

- [ ] Add E2E and fixture.
- [ ] Run full checks and both E2E suites.
- [ ] Capture evidence and update docs.
- [ ] Commit.
