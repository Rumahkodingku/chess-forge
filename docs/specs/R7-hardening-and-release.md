# R7 — Hardening and Release

**Spec version:** 1.0
**Status:** Approved for implementation
**Phase:** R7
**PRD mapping:** PH-6; AC-08, AC-09; §8, §12, §14, §15, §18
**Exit gate:** G11
**Depends on:** Gate G10, Gate G12
**Handoff to:** Release
**Last updated:** 2026-11-25

---

## 1. Purpose

R7 turns ChessForge from a feature-complete local workspace into a release-ready product. It closes the remaining error-state gaps, completes backup and restore, verifies performance and accessibility, documents deployment and recovery, and runs the final acceptance matrix.

R7 does not add a new product module. It hardens the existing R0–R6 features and the R8 Chess Library. The release gate is G11, and G11 includes G12 because R8 is already part of the shipping application.

---

## 2. Scope

### 2.1 In scope

- Error-state matrix for PRD §12 and recovery actions.
- Full application backup and restore hardening.
- Single-project `.chessforge` backup export and restore.
- Restore overwrite or duplicate choice.
- Restore rollback and storage-error recovery.
- Performance budgets and reference-device checklist.
- Accessibility audit with keyboard, focus, names, contrast, and reduced-motion checks.
- Docker and Coolify deployment documentation.
- Basic-auth-at-proxy, rate-limit, headers, and healthcheck verification.
- Troubleshooting and operations documentation.
- Complete seven-scenario E2E suite.
- Release acceptance matrix AC-01–AC-09.
- Gate G11 evidence.
- R8 G12 content sign-off check.

### 2.2 Out of scope

- New gameplay, analysis, studio, or Library features.
- Cloud sync or cloud rendering.
- Accounts, authentication inside the application, or multi-user support.
- Native desktop or mobile applications.
- New runtime dependencies, except an approved test-only dependency.
- Rewriting the design system.
- Full WCAG certification audit.
- Universal browser/codec support.
- Public template marketplace or social publishing.

### 2.3 Approved decisions

| Topic | Decision |
| --- | --- |
| Release scope | G11 includes G12 and R8 |
| Backup scope | Full application plus single-project `.chessforge` ZIP |
| Single-project restore | Always ask overwrite or duplicate; overwrite requires second confirmation |
| Performance | Automated budget tests plus manual reference-device checklist |
| Accessibility | Pragmatic WCAG 2.1 AA checklist plus Playwright keyboard/focus tests; no axe dependency |
| Deployment | Docker artifacts and Coolify/basic-auth documentation; no secrets in repo |
| Error handling | Error matrix plus gap fixes; no broad taxonomy refactor |
| Documentation | README, deployment, troubleshooting, ADR index, licence inventory |
| Dependencies | No new runtime dependency |
| Release evidence | `docs/evidence/R7/gate-g11.md` |

---

## 3. Baseline audit

This section records what exists before R7 implementation. It prevents the phase from rebuilding work that is already done.

### 3.1 Existing strengths

- TypeScript strict mode, Zod boundaries, repository pattern.
- Import, replay, Stockfish, Studio, Export, and Chess Library are implemented.
- Full application `.chessforge.zip` backup and restore exist.
- Dockerfile, standalone output, healthcheck, security headers, and Route Handler rate limits exist.
- 308 unit/integration tests, 40 development E2E tests, and 7 production E2E tests pass at the start of R7.
- R8 stores are included in the full application backup.
- README, ADR index, and third-party notices exist.

### 3.2 Known gaps

| Area | Gap |
| --- | --- |
| Single-project backup | No project-only export/import |
| Restore rollback | Full-app restore atomicity not covered by an explicit failing transaction test |
| Error matrix | No complete mapping from PRD §12 to UI, recovery, and tests |
| Migration blocked | No user-facing recovery beyond console warning |
| Corrupt project/asset | Some paths skip records; no dedicated recovery flow |
| Performance | No budgets or reference-device evidence |
| Accessibility | No keyboard/focus/contrast audit or regression tests |
| Deployment | Coolify/basic-auth/troubleshooting documentation incomplete |
| E2E | Backup restore is not in the seven-scenario release suite |
| Release | AC-01–AC-09 matrix and G11 evidence not recorded |
| R8 sign-off | Human content spot-check still pending in G12 |

---

## 4. Error handling

### 4.1 Error principles

- Every user-visible failure states what happened and what to do next.
- No silent data loss.
- A failed write must leave the previous valid state intact.
- Errors are grouped by domain: import, engine, studio, persistence, backup, export.
- Existing `AppError` and `toErrorMessage` remain the base.
- Add specific error codes only where recovery differs.
- Imported text is never injected as HTML.
- Error messages do not expose stack traces or internal file paths.

### 4.2 Error matrix

The spec implementation must maintain this matrix in code/tests and reflect the final status in `docs/evidence/R7/gate-g11.md`.

Status values: `covered`, `partial`, `missing`.

#### Import and game data

| Case | Baseline | R7 target |
| --- | --- | --- |
| Empty PGN | covered | Keep |
| Invalid PGN syntax | covered | Keep |
| Illegal SAN move | covered | Keep |
| Unsupported variant | covered | Keep |
| Multiple games | covered | Keep |
| Very long game | partial | Document limit and keep UI responsive |
| Missing player metadata | covered | Keep |
| Incomplete game | partial | Add explicit warning/recovery |
| Network timeout/offline | covered | Keep |
| Unknown external username | covered | Keep |
| Rate-limited external API | covered | Keep |
| Private/unavailable game | covered | Keep |
| API response format change | partial | Add validation error recovery |

#### Engine

| Case | Baseline | R7 target |
| --- | --- | --- |
| Stockfish asset fails | covered | Keep |
| Worker cannot start | covered | Keep |
| Browser memory insufficient | partial | Add recovery message |
| Unsupported engine option | partial | Clamp already handled; add explanation |
| User stops analysis | covered | Keep |
| Mate score | covered | Keep |
| Incomplete analysis | covered | Keep |
| Invalid position | covered | Keep |
| Cache configuration mismatch | covered | Keep |

#### Studio and animation

| Case | Baseline | R7 target |
| --- | --- | --- |
| Source game missing | covered by snapshot | Keep |
| Scene references invalid ply | partial | Add validation and skip/recover |
| Unsupported move/position | covered | Keep |
| Zero/negative duration | covered by schema | Add UI feedback |
| Audio asset unavailable | partial | Add warning and recovery |
| Text exceeds safe area | covered | Keep |
| Aspect ratio layout fails | covered | Keep |
| Preview frame fails | partial | Add error boundary/retry |

#### Persistence and backup

| Case | Baseline | R7 target |
| --- | --- | --- |
| IndexedDB unavailable | covered | Keep |
| Quota exceeded | covered | Keep |
| Migration fails | partial | Add recovery screen and backup instruction |
| Project data corrupted | partial | Skip with warning and recovery |
| Backup unsupported version | partial | Add explicit message |
| Backup missing asset | partial | Reject before write |
| Restore overwrite | partial | Add confirmation and rollback |
| Restore rollback | missing | Add failing-transaction test and UI recovery |

#### Export

| Case | Baseline | R7 target |
| --- | --- | --- |
| WebCodecs unavailable | covered | Keep |
| Codec unsupported | covered | Keep |
| Container cannot mux | covered | Keep |
| Rendering OOM | partial | Add cleanup/recovery |
| User cancels | covered | Keep |
| Audio encoding fails | partial | Add recovery |
| Empty/invalid output | covered | Keep |
| Page closed during export | covered | Keep |

### 4.3 Recovery actions

Each error row must define:
- user-facing message;
- recovery action;
- retry behaviour;
- whether local data is preserved;
- test level (unit, integration, E2E, manual).

---

## 5. Backup and restore

### 5.1 Current state

The application already exports and imports a full application backup as `.chessforge.zip`.

Current full-app manifest:

```ts
interface ApplicationBackupManifest {
  format: "chessforge-backup";
  version: 1;
  schemaVersion: number;
  createdAt: string;
  counts: Record<string, number>;
}
```

The backup includes:
`games`, `positionAnalyses`, `moveAssessments`, `projects`, `templates`, `assets`, `settings`, `meta`, `libraryNotes`, `repertoireLines`, `learningProgress`.

### 5.2 Full application backup

R7 hardens the existing flow:

- One IndexedDB transaction for restore.
- Validate manifest, version, data arrays, and asset files before writing.
- Abort the transaction on any failure.
- Preserve the previous database if the transaction aborts.
- Show a summary after restore.
- Warn that restore overwrites local data.
- Add a failing-transaction test.
- Add an E2E restore scenario.

File name:
`chessforge-backup-YYYY-MM-DD.chessforge.zip`.

ZIP layout:

```text
manifest.json
data.json
assets/<asset-id>
```

### 5.3 Single-project backup

New export format:

```text
manifest.json
project.json
assets/<asset-id>
```

Manifest:

```ts
interface ProjectBackupManifest {
  format: "chessforge-project";
  version: 1;
  schemaVersion: number;
  createdAt: string;
  projectId: string;
  projectName: string;
}
```

Contents:
- one `VideoProject`;
- its game snapshot (already inside the project);
- audio assets referenced by the project;
- no global games or analysis history;
- no unrelated templates or Library data.

File name:
`<project-slug>.chessforge`.

### 5.4 Single-project restore

Rules:
1. Validate ZIP, manifest, project schema, and asset metadata.
2. Verify each asset hash and file presence.
3. If project ID is new, restore normally.
4. If project ID exists, show:
   - **Restore as copy** — new project UUID; reuse matching assets by hash.
   - **Overwrite** — second confirmation; replace the project record and referenced assets.
5. Write project and assets in one transaction.
6. On failure, abort and show recovery.
7. Do not silently overwrite, delete, or duplicate.

### 5.5 Rollback

- Restore uses a single IndexedDB transaction across `projects` and `assets`.
- A failed write must leave the database unchanged.
- Add a test that injects a failure after the first write and asserts the original project still exists.
- UI shows: what failed, that old data is intact, and what to try next.

---

## 6. Performance

### 6.1 Reference device

- Linux mid-range desktop.
- 16 GB RAM.
- Integrated GPU.
- Current Chrome or Edge stable.

### 6.2 Automated budgets

Create a Playwright performance spec with tolerant CI thresholds:

| Measurement | Target |
| --- | --- |
| Initial shell usable without Stockfish | under 2 seconds |
| Open typical local project | under 2 seconds |
| Move navigation | under 100 ms |
| Scene/timeline switch | visibly responsive |
| No main-thread freeze during engine/export | no long task over 200 ms |

Rules:
- Measure with `performance.now()` around user actions.
- Use seeded local fixtures.
- Run against the production build where possible.
- CI tolerance may be 2× the reference target; the reference-device checklist records the real value.
- Do not assert FPS in CI.

### 6.3 Manual checklist

`docs/evidence/R7/performance.md` records:
- hardware and browser;
- initial shell time;
- project open time;
- move navigation time;
- preview FPS;
- 60-second 1080p 30 FPS export time;
- memory/thermal observations;
- pass/fail against PRD §8.1.

### 6.4 Optimisation rules

- Do not add performance complexity without a measured problem.
- Keep Stockfish outside the main thread.
- Keep opening/puzzle/reference data lazy-loaded.
- Keep large project snapshots out of React state where possible.
- Re-measure after each optimisation.

---

## 7. Accessibility

### 7.1 Target

Pragmatic WCAG 2.1 AA:
- accessible names for controls;
- keyboard navigation for replay, playback, timeline, dialogs, and Library practice;
- visible focus;
- text contrast 4.5:1 and non-text UI contrast 3:1 where applicable;
- reduced-motion preference respected;
- colour is not the only indicator of move quality or state;
- live regions announce asynchronous errors and progress.

### 7.2 Automated checks

Playwright tests:
- tab through Analysis controls;
- move with keyboard;
- operate playback and timeline;
- open/close dialogs with keyboard;
- verify focus visibility;
- verify accessible names on primary actions;
- verify reduced-motion preference does not break layout.

### 7.3 Manual checklist

`docs/evidence/R7/accessibility.md` records:
- contrast sample results;
- keyboard-only walkthrough;
- screen-reader smoke check for primary flows;
- reduced-motion check;
- any accepted exceptions.

### 7.4 No new dependency

Do not add `@axe-core/playwright` in R7. The approved scope is checklist plus Playwright regression.

---

## 8. Deployment and operations

### 8.1 Docker

Required checks:
- `docker build -t chessforge .`
- `docker run --rm -p 3000:3000 chessforge`
- `/api/health` returns 200.
- Static assets and engine files load.
- The app starts with `node server.js` under standalone output.
- Do not use `next start` with `output: standalone`.

### 8.2 Coolify

Document:
- application creation;
- port 3000;
- healthcheck `/api/health`;
- reverse-proxy basic auth;
- TLS;
- rate-limit expectations;
- security headers;
- persistent browser data warning;
- backup/restore operating procedure.

Basic auth is not implemented in application code. No secrets belong in the repository.

### 8.3 Security headers

Current headers must remain:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy`

Review whether COOP/COEP is required. Stockfish is single-threaded, so cross-origin isolation is not a requirement for v1.

### 8.4 Route Handler limits

- Chess.com: 30 requests per minute.
- Lichess: 20 requests per minute.
- 10-second timeout.
- Validate query input with Zod.
- Do not proxy private data.

### 8.5 Health

`/api/health` must return service name, version, phase, and timestamp.

---

## 9. Documentation

Required:
- `README.md`: current status, setup, commands, Library, backup, deployment summary.
- `docs/deployment.md`: Docker, Coolify, basic auth, headers, health, standalone start.
- `docs/troubleshooting.md`: storage, migration, backup, restore, engine, export, browser/codec.
- `docs/adr/README.md`: complete index including R8 decision if a new ADR is added.
- `docs/THIRD_PARTY_NOTICES.md`: complete licence inventory.
- `docs/evidence/R7/gate-g11.md`: final evidence.
- `docs/evidence/R7/performance.md`: manual performance record.
- `docs/evidence/R7/accessibility.md`: manual accessibility record.

Documentation must use real commands and real paths. Do not document features that are not implemented.

---

## 10. E2E and release validation

### 10.1 Seven PRD scenarios

1. Import a PGN and replay the game.
2. Analyse a game and inspect a selected move.
3. Create a video from a selected moment.
4. Apply and customise a template.
5. Save, reload, and reopen a project.
6. Export a short video in the primary browser.
7. Restore a project from a backup.

### 10.2 Additional R7 scenarios

- Full application backup export/import.
- Single-project backup export.
- Single-project restore as copy.
- Single-project overwrite with second confirmation.
- Unsupported backup version rejected.
- Restore rollback after injected failure.
- Keyboard-only Analysis flow.
- Migration blocked recovery.
- Invalid project/asset recovery.

### 10.3 Production

- Run the seven-scenario suite against the production build.
- Run the backup restore scenario against production.
- Confirm no external network is required for local workflows.
- Confirm no critical console errors.

---

## 11. Acceptance criteria and Gate G11

### 11.1 AC coverage

| Criterion | R7 evidence |
| --- | --- |
| AC-01 PGN import | R2 E2E plus R7 regression |
| AC-02 External import | R2 E2E plus error matrix |
| AC-03 Replay | R2/R7 keyboard tests |
| AC-04 Stockfish | R3 E2E plus error states |
| AC-05 Video project | R5 E2E plus template scenario |
| AC-06 Timeline/preview | R5 E2E plus performance check |
| AC-07 Export | R6 E2E plus production export |
| AC-08 Persistence | backup/restore, migration, corrupt data |
| AC-09 Product constraints | no accounts, local-first, deployment review |

### 11.2 G11

G11 passes only when:
- AC-01–AC-09 pass.
- G0–G12 pass.
- R8 human content sign-off is recorded.
- Full application backup and restore pass.
- Single-project export, copy restore, and overwrite restore pass.
- Restore rollback test passes.
- Error matrix has no `missing` rows.
- Performance budgets and manual checklist are recorded.
- Accessibility checklist and keyboard tests pass.
- Docker build and healthcheck pass.
- Documentation and licence inventory are complete.
- Production E2E passes.
- Release checklist is complete.
- Evidence is recorded in `docs/evidence/R7/gate-g11.md`.

---

## 12. Task order

### 12.1 Wave 0 — Baseline

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T00 Complete error/backup/performance/accessibility/deployment audit | none | Baseline matrix recorded |

### 12.2 Wave 1 — Backup and restore

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T02 Add single-project backup export | T00 | `.chessforge` ZIP validates and opens |
| R7-T03 Add single-project restore with copy/overwrite | T02 | Both paths tested |
| R7-T04 Harden full-app restore and rollback | T02 | Injected failure leaves old data intact |
| R7-T03a Add backup E2E | T02–T04 | Export, copy, overwrite, invalid version |

### 12.3 Wave 2 — Error states

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T01 Close error matrix gaps | T00 | No `missing` rows |
| R7-T01a Migration blocked recovery | R7-T01 | User sees recovery screen |
| R7-T01b Corrupt project/asset handling | R7-T01 | Skip with warning, app remains usable |
| R7-T01c Export OOM/audio failure recovery | R7-T01 | Cleanup and retry |
| R7-T01d Error-state tests | R7-T01 | Unit/integration coverage |

### 12.4 Wave 3 — Performance and accessibility

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T05 Add performance budgets | T00 | Playwright budgets pass |
| R7-T05a Record reference-device checklist | R7-T05 | Performance evidence |
| R7-T06 Add keyboard/focus/name tests | T00 | Playwright accessibility suite |
| R7-T06a Complete contrast/reduced-motion checklist | R7-T06 | Accessibility evidence |
| R7-T06b Fix accessibility gaps | R7-T06 | No critical exceptions |

### 12.5 Wave 4 — Deployment and documentation

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T07 Verify Docker and document Coolify | T00 | Build, run, health, auth notes |
| R7-T08 Complete licence inventory | T00 | No missing runtime asset |
| R7-T10 Write deployment/troubleshooting docs | R7-T07 | Docs match real commands |
| R7-T10a Update README and ADR index | R7-T10 | Links and status current |

### 12.6 Wave 5 — Release

| Task | Depends on | Acceptance |
| --- | --- | --- |
| R7-T09 Add seven-scenario E2E | R7-T01–T06 | All scenarios pass |
| R7-T09a Add production E2E | R7-T09 | Production suite passes |
| R7-T11 Run acceptance matrix | R7-T09 | AC-01–AC-09 pass |
| R7-T11a Record G11 evidence and checklist | R7-T11 | Gate closed |

---

## 13. File structure

### 13.1 Documentation

```text
docs/specs/R7-hardening-and-release.md
docs/evidence/R7/gate-g11.md
docs/evidence/R7/performance.md
docs/evidence/R7/accessibility.md
docs/deployment.md
docs/troubleshooting.md
```

### 13.2 Code

```text
src/features/storage/backup.ts
src/features/storage/project-backup.ts
src/features/storage/backup.test.ts
src/features/storage/project-backup.test.ts
src/features/settings/settings-workspace.tsx
src/lib/errors.ts
src/app/error.tsx
src/app/(app)/analysis/[gameId]/page.tsx
src/app/(app)/studio/[projectId]/page.tsx
src/features/studio/components/export-panel.tsx
```

### 13.3 Tests

```text
e2e/r7-release.spec.ts
e2e/r7-performance.spec.ts
e2e/r7-accessibility.spec.ts
e2e/r7-production.spec.ts
```

---

## 14. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Single-project asset conflicts | Broken project after restore | Reuse by hash; remap duplicate asset IDs |
| Restore partial write | Data loss | One IndexedDB transaction; injected-failure test |
| CI performance variance | False failures | Tolerant budgets; manual reference-device evidence |
| Accessibility scope creep | Delay | Pragmatic WCAG 2.1 AA checklist |
| Coolify secrets in repo | Security | Document proxy auth only; no secrets |
| R8 content sign-off blocks release | Gate delay | Explicit G11/G12 check |
| Large backup size | Slow export | Include only referenced project assets |
| Browser codec differences | False E2E failures | WebM in CI; Chrome/Edge for MP4 |

---

## 15. Definition of Done

R7 is done when:
- Error matrix has no missing entries.
- Full and single-project backup/restore work.
- Restore rollback is tested.
- Performance budgets pass and manual checklist is recorded.
- Accessibility checklist and keyboard tests pass.
- Docker build and healthcheck pass.
- Deployment and troubleshooting docs are complete.
- Licence inventory is complete.
- Seven-scenario E2E passes in development and production.
- AC-01–AC-09 pass.
- G0–G12 pass, including R8 content sign-off.
- Gate G11 evidence is recorded.
- No new runtime dependency was added.
- No unrelated architecture complexity was introduced.

---

## 16. Handoff

After G11:
- the application is release-ready for the approved single-user environment;
- the `.chessforge` full-app and single-project backup formats are documented;
- known limitations are recorded in the release evidence;
- any deferred items are listed in `docs/ROADMAP.md` and the G11 evidence.
