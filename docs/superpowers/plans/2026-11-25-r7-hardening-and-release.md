# R7 Hardening and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining error, backup, performance, accessibility, deployment, documentation, and release-gate gaps so ChessForge is release-ready.

**Architecture:** Harden existing boundaries instead of adding a new module. Extend the current `.chessforge` backup pipeline with a single-project format, make restore transactional and recoverable, then prove the release with error-matrix, performance, accessibility, deployment, and E2E evidence.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod, IndexedDB via `idb`, `fflate`, Vitest, Playwright.

**Spec:** `docs/specs/R7-hardening-and-release.md`

## Global Constraints

- The release gate is G11 and it includes G12.
- Do not add a new runtime dependency.
- Keep IndexedDB at version 2.
- Backup files are ZIP containers built with `fflate`.
- Full backup format: `chessforge-backup` version 1.
- Single-project format: `chessforge-project` version 1.
- Single-project restore always asks overwrite or duplicate; overwrite needs a second confirmation.
- No accounts, cloud sync, or secrets in the repository.
- Basic auth is documented at the Reverse Proxy, not implemented in the app.
- Performance uses automated budgets plus a manual reference-device checklist.
- Accessibility uses pragmatic WCAG 2.1 AA checks without axe.
- R8 human content sign-off must be recorded before G11 closes.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and the relevant Playwright suite before each task is marked complete.

## Review Focus

1. Restoring a project whose ID already exists while asset IDs collide — user expects either a clean copy or an explicit overwrite, never a half-merged project.
2. A restore that fails after clearing a store — user expects previous projects to remain intact.
3. Opening the app while another v1 tab blocks the v2 upgrade — user expects a recovery message, not a permanently pending screen.
4. Keyboard-only timeline and export flow — user expects focus order, visible focus, and operable dialogs without a mouse.
5. Performance budgets measured after a cold compile — user expects the budget to measure the app, not the dev server.

---

### Task 1: Error matrix and migration-blocked recovery

**Files:**
- Create: `docs/evidence/R7/error-matrix.md`
- Modify: `src/lib/errors.ts`
- Modify: `src/features/storage/db.ts`
- Modify: `src/app/error.tsx`
- Test: `src/features/storage/db.test.ts`

**Interfaces:**
- Consumes: existing `AppError`, `StorageMigrationError`, `openChessForgeDatabase`.
- Produces: `StorageBlockedError`; explicit recovery text for migration-blocked and corrupt-record paths.

- [ ] **Step 1: Write the failing test**

In `src/features/storage/db.test.ts`, add:

```ts
it("surfaces a blocked upgrade as a recoverable error", async () => {
  const error = new StorageBlockedError();
  expect(error.code).toBe("STORAGE_MIGRATION_FAILED");
  expect(error.recovery).toContain("Close other ChessForge tabs");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/features/storage/db.test.ts`
Expected: FAIL because `StorageBlockedError` is not exported.

- [ ] **Step 3: Add `StorageBlockedError` and wire `blocked()`**

Add to `src/lib/errors.ts`:

```ts
export class StorageBlockedError extends AppError {
  constructor() {
    super(
      "STORAGE_MIGRATION_FAILED",
      "The local database upgrade is blocked by another ChessForge tab.",
      "Close other ChessForge tabs, reload this page, and try again.",
    );
    this.name = "StorageBlockedError";
  }
}
```

In `db.ts`, make `blocked()` reject the pending open with this error instead of only logging.

- [ ] **Step 4: Create the error matrix**

Create `docs/evidence/R7/error-matrix.md` with one row per PRD §12 case and columns: area, case, status, UI, recovery, test. Mark existing cases `covered`, gaps `partial`, and missing cases `missing`.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/features/storage/db.test.ts`
Expected: PASS.

```bash
git add src/lib/errors.ts src/features/storage/db.ts src/features/storage/db.test.ts src/app/error.tsx docs/evidence/R7/error-matrix.md
git commit -m "fix(storage): surface blocked database upgrades"
```

---

### Task 2: Single-project backup export

**Files:**
- Create: `src/features/storage/project-backup.ts`
- Create: `src/features/storage/project-backup.test.ts`
- Modify: `src/app/(app)/studio/[projectId]/page.tsx`
- Modify: `src/features/studio/file-name.ts` only if slug helper is missing

**Interfaces:**
- Consumes: `VideoProject`, `AssetRecord`, `createProjectRepository`, `createAssetRepository`, `openChessForgeDatabase`, `fflate`.
- Produces:

```ts
export interface ProjectBackupManifest {
  format: "chessforge-project";
  version: 1;
  schemaVersion: number;
  createdAt: string;
  projectId: string;
  projectName: string;
}

export async function exportProjectBackup(projectId: string): Promise<Blob>;
```

- [ ] **Step 1: Write the failing test**

In `project-backup.test.ts`:

```ts
it("exports a project ZIP with a manifest and only referenced assets", async () => {
  const blob = await exportProjectBackup(project.id);
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(entries["manifest.json"]).toBeDefined();
  expect(entries["project.json"]).toBeDefined();
  expect(Object.keys(entries).some((name) => name.startsWith("assets/"))).toBe(true);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  expect(manifest).toMatchObject({
    format: "chessforge-project",
    version: 1,
    projectId: project.id,
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/features/storage/project-backup.test.ts`
Expected: FAIL because `exportProjectBackup` is not defined.

- [ ] **Step 3: Implement export**

Read the project by ID. Collect asset IDs from `project.audioTracks` where `source.type === "asset"`. Read each asset. Build `manifest.json`, `project.json`, and `assets/<id>` bytes. Return a ZIP Blob.

- [ ] **Step 4: Add the Studio action**

Add an “Export project backup” button to the Studio project page. Download as `<project-slug>.chessforge`. Show a toast on success and a recoverable error on failure.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/features/storage/project-backup.test.ts`
Expected: PASS.

```bash
git add src/features/storage/project-backup.ts src/features/storage/project-backup.test.ts "src/app/(app)/studio/[projectId]/page.tsx"
git commit -m "feat(backup): export single-project chessforge archives"
```

---

### Task 3: Single-project restore with copy/overwrite

**Files:**
- Modify: `src/features/storage/project-backup.ts`
- Modify: `src/features/storage/project-backup.test.ts`
- Create: `src/features/studio/components/restore-project-dialog.tsx`
- Modify: `src/app/(app)/studio/page.tsx`

**Interfaces:**
- Consumes: `exportProjectBackup`, `videoProjectSchema`, `createProjectRepository`, `createAssetRepository`.
- Produces:

```ts
export interface ProjectBackupInspection {
  manifest: ProjectBackupManifest;
  project: VideoProject;
  assetCount: number;
  exists: boolean;
}

export type ProjectRestoreMode = "copy" | "overwrite";

export async function inspectProjectBackup(file: Blob): Promise<ProjectBackupInspection>;

export async function restoreProjectBackup(
  file: Blob,
  mode: ProjectRestoreMode,
): Promise<{ projectId: string; mode: ProjectRestoreMode }>;
```

- [ ] **Step 1: Write the failing tests**

Add tests for:
- `inspectProjectBackup` rejects an invalid manifest.
- `restoreProjectBackup(..., "copy")` creates a new project ID when the original exists.
- `restoreProjectBackup(..., "overwrite")` replaces the project.
- A missing asset file rejects before writing.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/features/storage/project-backup.test.ts`
Expected: FAIL because inspect/restore functions are missing.

- [ ] **Step 3: Implement inspect and restore**

Validate ZIP, manifest, project schema, assets, and hashes. Use one IndexedDB transaction over `projects` and `assets`. For `copy`, generate a new project UUID and reuse assets by hash where possible. For `overwrite`, require an explicit `mode` and replace only that project.

- [ ] **Step 4: Add the Studio import UI**

Add “Import project backup” to the Studio list. Open `RestoreProjectDialog`; if `inspection.exists`, show Copy and Overwrite. Overwrite requires a second confirmation.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/features/storage/project-backup.test.ts`
Expected: PASS.

```bash
git add src/features/storage/project-backup.ts src/features/storage/project-backup.test.ts src/features/studio/components/restore-project-dialog.tsx "src/app/(app)/studio/page.tsx"
git commit -m "feat(backup): restore project backups as copy or overwrite"
```

---

### Task 4: Full-app restore validation and rollback

**Files:**
- Modify: `src/features/storage/backup.ts`
- Modify: `src/features/storage/backup.test.ts`

**Interfaces:**
- Consumes: `importApplicationBackup`, `backupManifestSchema`, `BACKUP_STORES`.
- Produces: validated import that aborts on the first invalid record.

- [ ] **Step 1: Write the failing tests**

Add:
- importing a backup with one invalid store record rejects;
- the original project/game still exists after the rejection;
- unsupported manifest version rejects before writes.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/features/storage/backup.test.ts`
Expected: FAIL because invalid records are currently written without validation.

- [ ] **Step 3: Implement validation and atomic restore**

Validate every record against its schema before opening the write transaction. If any record fails, throw `ValidationError` and do not write. Keep one transaction across all stores; any write failure aborts it.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test -- src/features/storage/backup.test.ts`
Expected: PASS.

```bash
git add src/features/storage/backup.ts src/features/storage/backup.test.ts
git commit -m "fix(backup): validate records and roll back failed restores"
```

---

### Task 5: Remaining §12 error gaps

**Files:**
- Modify: `src/features/storage/db.ts`
- Modify: `src/features/studio/components/export-panel.tsx`
- Modify: `src/features/games/import-workspace.tsx`
- Modify: `docs/evidence/R7/error-matrix.md`
- Test: `src/features/storage/db.test.ts`
- Test: `src/features/studio/export/capabilities.test.ts`

**Interfaces:**
- Consumes: existing repository and export error paths.
- Produces: explicit recovery for corrupt project/asset, export OOM/audio failure, and external API format change.

- [ ] **Step 1: Write failing tests**

Cover:
- corrupt project is skipped with a warning while other projects load;
- corrupt asset reference produces a user-facing warning;
- export OOM/audio failure leaves the project intact and exposes retry.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/features/storage/db.test.ts src/features/studio/export/capabilities.test.ts`
Expected: FAIL or missing assertions.

- [ ] **Step 3: Implement recovery paths**

Add `ValidationError` recovery text for corrupt records. In export, catch OOM/audio errors, release output writers, keep the project unchanged, and show a retry action. In import, convert unexpected adapter shape into a clear `ValidationError`.

- [ ] **Step 4: Update the matrix and commit**

Mark every row `covered` or `partial` with a reason. No `missing` row may remain for a case with a test.

```bash
git add src/features/storage/db.ts src/features/studio/components/export-panel.tsx src/features/games/import-workspace.tsx docs/evidence/R7/error-matrix.md src/features/storage/db.test.ts src/features/studio/export/capabilities.test.ts
git commit -m "fix: close remaining release error states"
```

---

### Task 6: Performance budgets and reference-device checklist

**Files:**
- Create: `e2e/r7-performance.spec.ts`
- Create: `docs/evidence/R7/performance.md`
- Modify: `playwright.config.ts` only if the spec needs a separate project

**Interfaces:**
- Consumes: seeded local project fixture and production build.
- Produces: measurable budgets and a manual record.

- [ ] **Step 1: Write failing budget tests**

Measure:
- initial shell usable without Stockfish;
- open project under 2 seconds;
- move navigation under 100 ms;
- no main-thread long task over 200 ms in the measured flow.

Use a tolerant CI multiplier, but record the raw value.

- [ ] **Step 2: Run the tests to verify they fail or expose slow paths**

Run: `npx playwright test e2e/r7-performance.spec.ts`
Expected: FAIL on the first missing budget or slow path.

- [ ] **Step 3: Fix measured bottlenecks only**

Do not add speculative optimisation. Fix measured long tasks, unnecessary re-renders, or blocking data loads.

- [ ] **Step 4: Record reference-device results**

Fill `docs/evidence/R7/performance.md` with hardware, browser, shell, project open, move navigation, preview FPS, export 60s, memory/thermal notes.

- [ ] **Step 5: Run tests and commit**

Run: `npx playwright test e2e/r7-performance.spec.ts`
Expected: PASS within tolerance.

```bash
git add e2e/r7-performance.spec.ts docs/evidence/R7/performance.md
git commit -m "test: add release performance budgets and evidence"
```

---

### Task 7: Accessibility keyboard/focus audit and fixes

**Files:**
- Create: `e2e/r7-accessibility.spec.ts`
- Create: `docs/evidence/R7/accessibility.md`
- Modify: `src/app/(app)/analysis/[gameId]/page.tsx`
- Modify: `src/features/studio/components/timeline-panel.tsx`
- Modify: `src/features/studio/components/export-panel.tsx`
- Modify: `src/components/ui/dialog.tsx` only if focus trapping is broken

**Interfaces:**
- Consumes: existing UI primitives and Playwright.
- Produces: keyboard regression coverage and manual WCAG 2.1 AA checklist.

- [ ] **Step 1: Write failing accessibility tests**

Test keyboard-only:
- move through Analysis;
- play/pause/seek;
- select and edit a timeline scene;
- open/close export dialog;
- verify focus visibility and accessible names.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx playwright test e2e/r7-accessibility.spec.ts`
Expected: FAIL on the first inaccessible control or focus trap.

- [ ] **Step 3: Fix gaps**

Add missing labels, focus-visible styles, keyboard handlers, and dialog focus restoration. Do not add axe.

- [ ] **Step 4: Record manual checklist**

Fill `docs/evidence/R7/accessibility.md` with contrast samples, keyboard walkthrough, screen-reader smoke check, reduced-motion check, and accepted exceptions.

- [ ] **Step 5: Run tests and commit**

Run: `npx playwright test e2e/r7-accessibility.spec.ts`
Expected: PASS.

```bash
git add e2e/r7-accessibility.spec.ts docs/evidence/R7/accessibility.md "src/app/(app)/analysis/[gameId]/page.tsx" src/features/studio/components/timeline-panel.tsx src/features/studio/components/export-panel.tsx src/components/ui/dialog.tsx
git commit -m "fix(a11y): close release keyboard and focus gaps"
```

---

### Task 8: Deployment, troubleshooting, README, ADR index

**Files:**
- Create: `docs/deployment.md`
- Create: `docs/troubleshooting.md`
- Modify: `README.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/THIRD_PARTY_NOTICES.md` only if inventory is stale

**Interfaces:**
- Consumes: Dockerfile, `next.config.ts`, `/api/health`, rate limits, backup format.
- Produces: operator runbook with real commands.

- [ ] **Step 1: Write the deployment guide**

Include:
- `docker build -t chessforge .`
- `docker run --rm -p 3000:3000 chessforge`
- standalone `node server.js` start;
- Coolify port, domain, TLS, basic auth at proxy, healthcheck;
- security headers and rate limits;
- backup/restore procedure;
- browser support and codec limits.

- [ ] **Step 2: Write the troubleshooting guide**

Cover storage unavailable, quota, blocked migration, corrupt project, backup version, missing asset, engine load, export codec, export OOM, page close, and restore overwrite.

- [ ] **Step 3: Update README and ADR index**

Link the new docs and record the R7 decisions. Keep commands copy-pasteable.

- [ ] **Step 4: Verify Docker and commit**

Run:
```bash
docker build -t chessforge .
```
Expected: build succeeds.

```bash
git add docs/deployment.md docs/troubleshooting.md README.md docs/adr/README.md docs/THIRD_PARTY_NOTICES.md
git commit -m "docs: add release deployment and troubleshooting guides"
```

---

### Task 9: Seven-scenario E2E and production suite

**Files:**
- Create: `e2e/r7-release.spec.ts`
- Create: `e2e/r7-production.spec.ts`
- Modify: `playwright.production.config.ts`
- Modify: `playwright.config.ts` only if needed

**Interfaces:**
- Consumes: existing import, analysis, studio, export, backup fixtures.
- Produces: full release E2E coverage.

- [ ] **Step 1: Write the failing release suite**

Cover:
1. import and replay;
2. analysis and selected move;
3. video from selected moment;
4. template apply/customise;
5. save/reload/reopen;
6. short export;
7. project backup restore.

Add full-app restore and single-project copy/overwrite.

- [ ] **Step 2: Run the suite to verify it fails**

Run: `npx playwright test e2e/r7-release.spec.ts`
Expected: FAIL on missing restore coverage or selectors.

- [ ] **Step 3: Implement missing hooks or selectors only**

Do not weaken assertions. Fix the app or add stable accessible selectors.

- [ ] **Step 4: Run dev and production suites**

Run:
```bash
npx playwright test
npm run test:e2e:prod
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add e2e/r7-release.spec.ts e2e/r7-production.spec.ts playwright.config.ts playwright.production.config.ts
git commit -m "test: complete release E2E coverage"
```

---

### Task 10: Acceptance matrix and Gate G11 evidence

**Files:**
- Create: `docs/evidence/R7/gate-g11.md`
- Modify: `docs/ROADMAP.md` only to mark R7 tasks complete
- Modify: `docs/evidence/R8/gate-g12.md` only to record human sign-off if present

**Interfaces:**
- Consumes: all previous tasks, R8 G12 status, test output.
- Produces: final release evidence.

- [ ] **Step 1: Run the full gate**

Run:
```bash
npm run check:all
npx playwright test
npm run test:e2e:prod
docker build -t chessforge .
```

- [ ] **Step 2: Verify AC-01–AC-09**

Record each criterion with its evidence command or file. Mark any failure BLOCKED; do not mark G11 complete.

- [ ] **Step 3: Verify R8 sign-off**

Read `docs/evidence/R8/gate-g12.md`. If human content sign-off is still pending, G11 stays open and the evidence states why.

- [ ] **Step 4: Write the evidence**

`docs/evidence/R7/gate-g11.md` contains:
- date, commands, results;
- AC matrix;
- G0–G12 status;
- backup/restore results;
- performance and accessibility evidence;
- Docker result;
- documentation and licence checklist;
- known limitations;
- R8 sign-off state.

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/R7/gate-g11.md docs/ROADMAP.md docs/evidence/R8/gate-g12.md
git commit -m "docs: record R7 release gate evidence"
```

---

## Self-Review

- Spec coverage: error matrix (Task 1, 5), backup full/single (Task 2–4), performance (Task 6), accessibility (Task 7), deployment/docs (Task 8), E2E/release (Task 9–10).
- Review Focus tests: overwrite/asset collision (Task 3), rollback (Task 4), migration blocked (Task 1), keyboard export/timeline (Task 7), cold-cache performance (Task 6).
- Type consistency: `ProjectBackupManifest`, `ProjectBackupInspection`, `ProjectRestoreMode`, and `exportProjectBackup` are defined once and reused.
- Proportion: tasks point to the spec and existing modules; code bodies are omitted where signatures and tests determine them.
