# R7 — Gate G11 Evidence

**Date:** 2026-11-25
**Gate:** G11
**Status:** **OPEN** — local automated gates pass; performance coverage is partial. R8 human content sign-off is not recorded, and live Coolify basic auth is unexercised (G4).
**Branch:** `main`
**Commit under test:** `1b76cd4` (`test: harden release restore coverage`)
**Spec:** `docs/specs/R7-hardening-and-release.md` §11
**Includes:** G0–G12, including R8 / G12.

This record covers the R7 acceptance matrix, the full gate run, backup and restore,
performance, accessibility, Docker, documentation, licences, and the R8 sign-off
check. It does not close G11. Gate G11 closes only when the R8 human content
sign-off is recorded in `docs/evidence/R8/gate-g12.md`.

## 1. Why G11 is open

G11 requires the R8 human content spot-check (spec §11.2 and §15). `docs/evidence/R8/gate-g12.md`
still says:

> Code gates passed; human content spot-check pending

Its "Manual review required" items have no recorded result, and no sign-off was
found elsewhere in the repository. Task 10 did not perform the content review
and did not modify the G12 record. Therefore G11 stays open.

A second external item is recorded for release: live Coolify basic auth has not
been exercised. Gate G4 is `PASS (local build), BLOCKED (live Coolify basic auth)`.
The Docker image, headers, health endpoint, and standalone start were verified
locally. The proxy configuration is documented but was not run against a live
Coolify instance.

The remaining gate items are recorded below, including the partial performance
coverage.

## 2. Environment

| Item | Value |
| --- | --- |
| Machine | WSL2 Linux, 8 GB assigned (host 16 GB) |
| OS | Linux 6.6.87.2-microsoft-standard-WSL2 |
| Node.js | v26.9.0 local; `node:24-bookworm-slim` in Docker |
| npm | 11.19.1 |
| Playwright | 1.65.1, Chromium 159.0.8154.6, headless |
| Docker | 29.9.3, Ubuntu 24.04.5 LTS |
| Next.js | 16.4.6, standalone output |

The spec's reference device is a Linux mid-range desktop with 16 GB RAM and an
integrated GPU. This run is a conservative proxy: a laptop-class WSL2 guest with
8 GB. Results are recorded honestly against that environment.

## 3. Commands and results

All commands ran on `1b76cd4` before the evidence-only commit.

| Command | Result |
| --- | --- |
| `npm run check:all` | PASS: lint 288 files, 11 pre-existing warnings, 0 errors; typecheck clean; 67 test files, 344 tests passed; production build completed, 27/27 static pages generated |
| `npx playwright test` | PASS: 49 development E2E tests in 4.5 min |
| `npm run test:e2e:prod` | PASS: production build plus 11 production E2E tests across 9 spec files in 2.9 min |
| `docker build -t chessforge .` | PASS: multi-stage build, image `chessforge:latest` |
| Container health check | PASS: `healthy`, `/api/health` HTTP 200, security headers present, Stockfish JS 200 |

The production suite includes the three R7 performance budgets. These are the
automated G11 rerun values, not the manual checklist:

| Measurement | Target | Automated G11 rerun (2026-11-25, `1b76cd4`) |
| --- | --- | --- |
| Initial shell usable without Stockfish | under 2000 ms | 460.7 ms, PASS |
| Open typical local project | under 2000 ms | 146.0 ms, PASS |
| Move navigation, worst adjusted step | under 100 ms | 7.1 ms after a 16.3 ms baseline, PASS |
| Main-thread long task in measured flows | under 200 ms | none, PASS |

The first automated production run recorded 431.9 / 114.0 / 8.6 ms. Both runs
are automated; `docs/evidence/R7/performance.md` labels them by date. Neither
run measures scene/timeline switch latency or engine/export long tasks.

The build prints a pre-existing Mediabunny duplicate-load warning. It does not
fail the build or the export tests; it is listed under known limitations.

## 4. Acceptance matrix AC-01 – AC-09

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC-01 PGN import | PASS | `e2e/r7-release.spec.ts` scenario 1 (paste, confirm, replay); `e2e/r2-import-and-replay.spec.ts`; `src/features/games/pgn.test.ts`; `src/features/games/file-import.test.ts`; development E2E 49 passed |
| AC-02 External import | PASS | `e2e/r2-import-and-replay.spec.ts` route-mocked Chess.com and Lichess flows; `src/features/games/adapters/chesscom.test.ts`, `lichess.test.ts`, `api-response.test.ts`; R2 live screenshots in `docs/evidence/R2/live-*.png`. Task 10 did not re-run a live provider fetch. |
| AC-03 Replay | PASS | `e2e/r7-release.spec.ts` scenario 1 (32 pieces, Home/End, arrow keys); `e2e/r7-accessibility.spec.ts` keyboard replay and position announcement; R2 E2E |
| AC-04 Stockfish | PASS | `e2e/r7-release.spec.ts` scenario 2 runs full-game depth-6 analysis and checks evaluation, Move detail, and confidence; `e2e/r3-analysis.spec.ts`; engine unit tests. Stockfish runs in a worker. |
| AC-05 Video project | PASS | `e2e/r7-release.spec.ts` scenarios 3–5 (create from selected move, apply and customise template, save, reload, reopen); `e2e/r5-studio.spec.ts` |
| AC-06 Timeline and preview | PASS | `e2e/r7-release.spec.ts` scene creation; `e2e/r7-accessibility.spec.ts` keyboard playback, seek, scene duration, and reorder; `docs/evidence/R7/performance.md` preview measurement 29.78 composition FPS against a 30 FPS target, within headless noise |
| AC-07 Export | PASS | `e2e/r7-release.spec.ts` scenario 6 exports a 720p WebM and validates it with `scripts/validate-video.mjs`; `e2e/r6-export.spec.ts`; `e2e/r6-production.spec.ts` and `e2e/r7-production.spec.ts` export against the production build; capability unit tests |
| AC-08 Local persistence | PASS | `src/features/storage/backup.test.ts` full-app round-trip, invalid-record rejection, unsupported version, and injected-write rollback; `src/features/storage/project-backup.test.ts` export, copy, overwrite, missing asset, checksum, and invalid project; `src/features/storage/db.test.ts` v1→v2 migration, blocked upgrade, corrupt project skip, and corrupt asset recovery; `e2e/r7-release.spec.ts` full backup, clean restore, copy, overwrite; `e2e/r7-production.spec.ts` restore against production. Nine partial error-matrix rows remain documented in §6. |
| AC-09 Product constraints | PASS | No account, login, auth, or credential files are tracked (`git ls-files` check); no external database or cloud renderer is installed; `e2e/r7-production.spec.ts` blocks every external HTTP(S) host and still completes the seven-scenario journey; security headers verified in the container. One optional Remotion telemetry request is attempted and blocked; see §10. |

No acceptance criterion failed.

## 5. Gate status G0 – G12

| Gate | Status | Evidence |
| --- | --- | --- |
| G0 | PASS | `docs/evidence/R0/gate-g0.md` |
| G1 | PASS | `docs/evidence/R0/gate-g1.md` |
| G2 | PASS | `docs/evidence/R0/gate-g2.md` |
| G3 | PASS | `docs/evidence/R0/gate-g3.md` |
| G4 | PASS local build; live Coolify basic auth not exercised | `docs/evidence/R0/gate-g4.md`; Docker and headers re-verified in §9 |
| G5 | PASS | `docs/evidence/R1/gate-g5.md` |
| G6 | PASS | `docs/evidence/R2/gate-g6.md` |
| G7 | PASS | `docs/evidence/R3/gate-g7.md` |
| G8 | PASS | `docs/evidence/R4/gate-g8.md` |
| G9 | PASS | `docs/evidence/R5/gate-g9.md` |
| G10 | PASS | `docs/evidence/R6/gate-g10.md` |
| G11 | **OPEN** | This record. R8 sign-off is missing; live Coolify auth is also unexercised (G4). |
| G12 | Code gates pass; human content spot-check pending | `docs/evidence/R8/gate-g12.md` |

Because G12 is not fully closed, G11 cannot close. The automated part of G12 is
covered by this run: 344 unit/integration tests, 49 development E2E, 11
production E2E, migration tests, and data validation tests all pass.

## 6. Error matrix

`docs/evidence/R7/error-matrix.md` records 46 rows from PRD §12 plus the R7
backup and restore cases.

| Status | Rows |
| --- | ---: |
| `covered` | 37 |
| `partial` | 9 |
| `missing` | 0 |
| **Total** | **46** |

The G11 condition "no `missing` rows" is met. The nine partial rows are:

1. Very long game: no documented ply or duration limit; a 200-ply fixture imports and replays.
2. Incomplete game: `Result "*"` imports, but the import review has no explicit warning.
3. Browser memory insufficient: engine failures use the generic engine error, not a memory-specific message.
4. Unsupported engine option: values are clamped without an explanation.
5. Scene references invalid ply: normalisation corrects or drops bad data without a scene-level warning.
6. Zero/negative duration: clamped silently in the UI.
7. Preview frame fails: no dedicated preview error boundary or retry.
8. Migration fails: page-level load errors show the message but not the full recovery sentence; the global error screen shows both.
9. Full-app backup missing asset: rejected before any write, but there is no dedicated full-app missing-asset test.

The single-project overwrite and unsupported-version rows moved to `covered`
after R7-T03 and R7-T04 landed; Task 10 corrected those two statuses. All partial
rows are user-experience or test-coverage gaps, not silent data loss or broken
acceptance criteria.

## 7. Backup and restore

| Path | Evidence | Result |
| --- | --- | --- |
| Full application export and import | `src/features/storage/backup.test.ts` "exports and restores games, library data, settings, and assets"; `e2e/r7-release.spec.ts` "restores a full application backup from Settings" | PASS |
| Full application restore validates every record before writing | `src/features/storage/backup.test.ts` "rejects a backup with an invalid store record and keeps existing data" | PASS |
| Unsupported full-app version | `src/features/storage/backup.test.ts` "rejects an unsupported manifest version before writing"; development E2E rejects `chessforge-backup` v99 | PASS |
| Restore rollback after an injected write failure | `src/features/storage/backup.test.ts` "rolls back the restore when a write fails"; original game and project remain | PASS |
| Single-project export | `src/features/storage/project-backup.test.ts` "exports a project ZIP with a manifest and only referenced assets" | PASS |
| Single-project restore as copy | `src/features/storage/project-backup.test.ts` "restores a project as a copy with a new ID when the original exists"; development E2E copy test opens the copy and checks its content | PASS |
| Single-project overwrite with second confirmation | `src/features/storage/project-backup.test.ts` "overwrites an existing project"; development E2E dismisses and then accepts the confirmation and checks the backed-up content | PASS |
| Missing asset or checksum mismatch | `src/features/storage/project-backup.test.ts` "rejects a missing asset file before writing" and "rejects an asset file that does not match its checksum" | PASS |
| Clean-workspace project restore | `e2e/r7-release.spec.ts` "restores a project into a clean workspace" | PASS |
| Production restore | `e2e/r7-production.spec.ts` restores a project copy against the standalone build | PASS |

Full application restore uses one `readwrite` transaction over all stores. Any
write failure aborts the transaction and leaves the previous database intact.
Single-project restore uses one transaction over `projects` and `assets`, reuses
matching assets by hash, and remaps colliding asset IDs.

## 8. Performance and accessibility

Performance evidence is in `docs/evidence/R7/performance.md`. The automated
budgets passed in the G11 production rerun (§3). The manual checklist covers the
remaining measured checks:

| Check | Type | Result |
| --- | --- | --- |
| Initial shell | Automated | PASS, 460.7 ms in the G11 rerun (431.9 ms first run) |
| Project open | Automated | PASS, 146.0 ms in the G11 rerun (114.0 ms first run) |
| Move navigation | Automated | PASS, 7.1 ms worst adjusted step in the G11 rerun (8.6 ms first run) |
| Preview FPS | Manual | PASS with caveat, 29.78 composition FPS against a 30 FPS target |
| 60-second 1080p 30 FPS export | Manual | PASS, 82.4 s wall time, validated 60.02 s WebM |
| Memory | Manual | No visible JS heap growth; no out-of-memory failure |
| Thermal | Manual | Not measurable in WSL2; no throttling observed over the run |
| Scene/timeline switch | Not measured | GAP: studio E2E covers behaviour, not latency |
| Engine/export long tasks | Not measured | GAP: only shell, project-open, and move flows assert long tasks |

Performance is **PARTIAL** against spec §6.2. Three of the five automated targets
are covered; scene/timeline switch responsiveness and engine/export main-thread
freeze checks remain unmeasured. This is recorded as a known gap, not a pass.

Accessibility evidence is in `docs/evidence/R7/accessibility.md`. The four
Playwright tests passed in the 49-test development suite:

1. Analysis replay is keyboard operable and announces the position.
2. The create-video dialog traps and restores keyboard focus.
3. Studio timeline and export controls are keyboard operable.
4. Reduced motion keeps the workspace usable and still.

Contrast samples pass the 4.5:1 text target and the 3:1 focus-ring target. The
card and input border exception (1.32:1) is accepted and mitigated by labels,
filled surfaces, and a 10.47:1 focus ring. No physical screen reader is installed
in the container; accessibility-tree names, live regions, focus behaviour, and
keyboard paths were checked instead.

## 9. Docker

```bash
docker build -t chessforge .
docker run -d --name chessforge-g11 -p 3101:3000 chessforge
docker inspect --format '{{.State.Health.Status}}' chessforge-g11
curl -fsS http://127.0.0.1:3101/api/health
```

Results:

- Build completed and produced `chessforge:latest`.
- Container health changed from `starting` to `healthy`.
- `/api/health` returned HTTP 200 with `status: "ok"`, `service: "chessforge"`,
  `version: "0.1.0"`, `phase: "R7"`, and a timestamp.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, and the expected `Permissions-Policy` were present.
- `/engine/stockfish/stockfish-19-lite-single.js` returned HTTP 200 as
  `application/javascript`.
- The image CMD is `node server.js`, so the run also proves the standalone start
  path. The test container was removed.

Coolify itself was not deployed. Proxy basic auth, TLS, and rate-limit
expectations are documented in `docs/deployment.md` but were not exercised
against a live proxy.

## 10. Documentation and licence checklist

| Item | Status | Notes |
| --- | --- | --- |
| `README.md` | PASS | Current R0–R8 status, setup, commands, Library, backup, deployment, browser limits, and G11 link |
| `docs/deployment.md` | PASS | Docker, standalone start, Coolify, basic auth, TLS, headers, rate limits, health, backups |
| `docs/troubleshooting.md` | PASS | Storage, migration, backup, restore, engine, export, and deployment failures |
| `docs/adr/README.md` | PASS | ADR 0001–0017 index plus the R7 decisions section; no new ADR was needed |
| `docs/THIRD_PARTY_NOTICES.md` | PASS | Runtime, development, data, font, and asset licences, including the transitive Mediabunny encoders |
| `docs/evidence/R7/error-matrix.md` | PASS | 46 rows, 37 covered, 9 partial, 0 missing |
| `docs/evidence/R7/performance.md` | PASS | Automated budgets and manual reference-device checklist |
| `docs/evidence/R7/accessibility.md` | PASS | Keyboard/focus/name/contrast/reduced-motion checklist |
| `docs/evidence/R7/gate-g11.md` | PASS | This record |
| No secrets in repository | PASS | `git ls-files` found no `.env`, credential, key, or auth file |
| No new runtime dependency | PASS | `package.json` and `package-lock.json` are unchanged across the R7 task commits |

Open-source obligations remain: Stockfish GPL-3.0 with the source offer,
Chessground GPL-3.0-or-later, Remotion under the Remotion Licence, cburnett
pieces CC BY-SA 3.0, and the CC0 data and SFX notices.

## 11. Release checklist

| Item | Status |
| --- | --- |
| AC-01 to AC-09 pass | PASS |
| All phase gates G0 to G12 pass | **OPEN** — G11/G12 content sign-off and G4 live basic auth |
| Unit, integration, and E2E tests pass | PASS |
| Production build passes | PASS |
| Backup export and restore pass | PASS |
| Docker build and Coolify deployment pass | Docker PASS; live Coolify not exercised |
| Accessibility review passes | PASS for the pragmatic WCAG 2.1 AA target |
| Performance review passes | **PARTIAL** — budgets pass; scene/timeline switch and engine/export long tasks unmeasured |
| Licence inventory is complete | PASS |
| Documentation is complete | PASS, with G11 deliberately recorded as open |
| No unrelated complexity was introduced | PASS: no runtime dependency added; Task 10 changed documentation only |

## 12. Known limitations

1. **R8 human content sign-off is missing.** This is the remaining
   product-content blocker. The G12 record must be updated by a human after
   reading at least one article per category and confirming tone and accuracy.
2. **Live Coolify basic auth was not exercised.** G4 remains local PASS / live
   BLOCKED. Apply proxy auth and TLS before a public deployment.
3. **Nine error-matrix rows are partial.** They are listed in §6. Some clamp
   silently or omit an explanation. None causes silent data loss.
4. **Full-app restore does not hash asset bytes.** It validates asset metadata
   and file presence. Single-project restore verifies hashes. A tampered asset in
   a full backup would be restored as-is.
5. **Remotion telemetry.** `@remotion/web-renderer` attempts one optional request
   to `https://www.remotion.pro/api/track/register-usage-point`. It is blocked in
   the production E2E and export still succeeds. No supported disable switch was
   found in the installed version.
6. **Mediabunny is bundled twice.** The build and runtime print a duplicate-load
   warning. Exports pass, but this deserves a separate dependency investigation.
7. **Performance is partial and its reference is a proxy.** The run used WSL2
   with 8 GB and headless Chromium, not a 16 GB bare-metal desktop. Preview
   composition measured 29.78 FPS against a 30 FPS target. Scene/timeline switch
   latency and engine/export long tasks were not measured.
8. **Accessibility has accepted exceptions.** No physical screen-reader run, the
   board is one labelled image, timeline drag reorder is pointer-only, and the
   card border contrast exception is documented in `accessibility.md`.
9. **Quota recovery does not garbage-collect unreferenced assets.** Deleting a
   project or track may not free space. The project-backup/clear/restore
   workaround is documented in `troubleshooting.md`.
10. **Development hydration warning.** `BoardSvg` absolute versus relative piece
    `href` values differ in development. Production tests are unaffected.
11. **No universal browser or codec support.** Current desktop Chrome or Edge is
    the release target; Firefox and Safari are not export targets.

## 13. R8 sign-off state

`docs/evidence/R8/gate-g12.md` (2026-11-24) remains:

- **Status:** Code gates passed; human content spot-check pending.
- **Manual review required:** read at least one article per category and confirm
  tone and accuracy; check the player-name alias flow with a real imported game;
  confirm the 5,000-puzzle bundle feels acceptable on the reference device.
- **Recorded outcome:** none.

The R8 automated gates pass on this commit: 344 unit/integration tests, 49
development E2E, 11 production E2E, migration tests, and opening/puzzle/reference
data validation. The content sign-off is a human review and was not performed by
this task.

**G11 therefore remains OPEN.** Record the human sign-off in
`docs/evidence/R8/gate-g12.md`, exercise or explicitly accept live Coolify basic
auth for G4, then re-run this gate checklist and change the status in this file.
Do not close G11 before both records exist.
