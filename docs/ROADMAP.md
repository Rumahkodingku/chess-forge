---
title: ChessForge — Implementation Roadmap
product: ChessForge
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Approved for implementation
last_updated: 2026-11-22
language: en
---

# ChessForge — Implementation Roadmap

This roadmap turns the approved PRD decisions into an executable sequence for AI coding agents and human engineers. It preserves PRD requirement IDs, acceptance criteria, and Definition of Done, while adding implementation sequencing, technical gates, and risk controls.

The MVP remains the PRD end-to-end workflow. By explicit user decision, v1 also commits to the full §6.3 analysis scope, the full §6.5 animation/audio scope, and all seven built-in templates.

---

## 1. Purpose and How to Use

**Audience:** AI coding agents, maintainers, and reviewers.

**How to execute a task:**

1. Read the task's `Depends on` column before starting.
2. Read the cited PRD section and the relevant subsection of this roadmap.
3. For code tasks, read the bundled Next.js 16 documentation in `node_modules/next/dist/docs` first; this version has breaking changes.
4. Implement only the scoped task. Do not add dependencies, abstractions, or features without an ADR.
5. Add or update tests for domain logic.
6. Run `npm run lint`, `npm run build`, and the relevant tests before marking a task complete.
7. Update the task status from `TODO` to `DONE` or `BLOCKED` in this file when the task is finished.

**Status values:** `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

**Complexity values:** `S` (1–2 days), `M` (3–5 days), `L` (1–2 weeks). These are engineering sizing values, not calendar promises.

---

## 2. Scope Baseline

### 2.1 MVP definition (PRD §4.1)

**Import PGN → Replay game → Analyse with Stockfish → Select moments → Apply template → Edit animation → Preview → Export video → Save project locally.**

A feature is not complete until the underlying workflow works with real PGN data and a real browser export.

### 2.2 v1 scope approved by user

- All PRD P0 requirements.
- All P1 requirements needed by the workflows above.
- Full §6.3 Stockfish analysis, including opening identification, phase labels, threat detection, game summary, critical moments, and candidate brilliant.
- Full §6.5 animation and audio, including camera, arrows, effects, text, subtitles, music, SFX, per-track volume, and preview.
- All seven built-in templates.
- Custom templates, timeline editing, four aspect ratios, backup/restore, and local persistence.
- TML-011 timeline zoom is a P2 stretch item, not a release blocker.

### 2.3 Out of scope

- All PRD §2.2 non-goals.
- Cloud sync, cloud rendering, accounts, multi-user workspaces, billing.
- Native desktop or mobile applications.
- Automatic AI commentary or voice-over.
- Public template marketplace.
- Automatic publishing to social platforms.
- Universal browser/codec support.

### 2.4 Approved deviations from PRD

| Deviation                                            | Reason                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Export proof of concept moved to R0                  | PRD §9.5 requires validation before the editor is built                  |
| Walking skeleton phase added as R1                   | Walking-skeleton delivery strategy approved by user                      |
| Save/reopen treated as P0                            | AC-05 requires it despite VID-007/VID-008 being labelled P1              |
| Coolify basic auth allowed                           | Approved as infrastructure protection, not an application account system |
| Full §6.3, §6.5, and seven templates committed to v1 | Explicit user scope decision                                             |
| 15-minute export hard cap                            | Required for realistic mid-range browser export                          |
| Single-thread Stockfish default                      | Compatibility-first decision                                             |
| WebM fallback required                               | Browser codec support varies                                             |
| Dark-first UI with `DESIGN.md` structure             | Approved design direction                                                |

### 2.5 Decision log

| ID   | Decision                                                                                        | Source             |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------ |
| D-01 | Chrome/Edge desktop on Linux is the primary export target                                       | User decision      |
| D-02 | MP4 H.264/AAC is required where supported; WebM VP8/VP9 + Opus is the fallback                  | User decision      |
| D-03 | Deployment target is Docker/VPS + Coolify                                                       | User decision      |
| D-04 | Coolify basic auth plus Route Handler rate limiting is acceptable                               | User decision      |
| D-05 | Render architecture is Remotion Player + `@remotion/web-renderer`; studio board is SVG          | User decision      |
| D-06 | Analysis board uses Chessground; GPL-3.0 is accepted                                            | User decision      |
| D-07 | Stockfish defaults to single-thread; multi-thread is optional                                   | User decision      |
| D-08 | Templates use responsive layouts plus safe-area validation                                      | User decision      |
| D-09 | Built-in SFX uses CC0 files; background music is user-uploaded                                  | User decision      |
| D-10 | Portable format is versioned `.chessforge` ZIP                                                  | User decision      |
| D-11 | Game summary is deterministic and factual                                                       | User decision      |
| D-12 | Move classification uses documented, centralised thresholds                                     | User decision      |
| D-13 | Candidate brilliant is conservative and remains a candidate until accepted                      | User decision      |
| D-14 | UI is dark-first; `DESIGN.md` supplies structure, spacing, typography, and component discipline | User decision      |
| D-15 | Reference device is Linux mid-range, 16 GB RAM, integrated GPU                                  | User decision      |
| D-16 | Opening data uses bundled CC0 `lichess-org/chess-openings`                                      | User decision      |
| D-17 | Studio piece set uses cburnett, CC BY-SA 3.0, with attribution                                  | User decision      |
| D-18 | Application is single-user                                                                      | User decision      |
| D-19 | Roadmap is English and has no calendar estimates                                                | User decision      |
| D-20 | Export hard cap is 15 minutes with a 5-minute warning                                           | User decision      |
| D-21 | Media limits: PGN 5 MB, audio 50 MB or 10 minutes per file, 250 MB per project                  | User decision      |
| D-22 | Evaluation perspective default is White perspective with a user toggle                          | Technical decision |
| D-23 | Stockfish package is `stockfish` npm v19, single-thread by default                              | Technical decision |
| D-24 | PGN parser is `@mliebelt/pgn-parser` plus `chess.js` validation                                 | Technical decision |
| D-25 | IndexedDB access uses `idb`                                                                     | Technical decision |
| D-26 | ZIP creation uses `fflate`                                                                      | Technical decision |
| D-27 | ID generation uses `crypto.randomUUID()`                                                        | Technical decision |

---

## 3. Delivery Strategy

### 3.1 Walking skeleton

Before building the full feature set, deliver one thin vertical slice that proves every architectural layer:

1. Import a fixture PGN.
2. Replay at least five moves.
3. Analyse one position with Stockfish.
4. Create one scene from a move.
5. Render a three-second video in the target browser.
6. Save the project locally.
7. Reload and reopen the project.

The walking skeleton is allowed to be visually rough. It is a risk-reduction gate, not a release candidate.

### 3.2 Phase model and gates

Each phase has entry criteria, tasks, acceptance criteria, a Definition of Done, and an exit gate. A phase is not complete until its gate passes.

### 3.3 Phase overview

| Phase | PRD mapping | Goal                                 | Exit gate |
| ----- | ----------- | ------------------------------------ | --------- |
| R0    | PH-0        | Foundation and technical feasibility | G0–G4     |
| R1    | New         | Walking skeleton                     | G5        |
| R2    | PH-1        | Game import and replay               | G6        |
| R3    | PH-2        | Full Stockfish analysis              | G7        |
| R4    | PH-3        | Animation core                       | G8        |
| R5    | PH-4        | Video Studio                         | G9        |
| R6    | PH-5        | Export                               | G10       |
| R7    | PH-6        | Hardening and release                | G11       |

### 3.4 Dependency graph

- R0 gates must pass before R1.
- R1 must pass before R2.
- R2 game data is required by R3.
- R3 analysis is required by R4 selected-moment scenes.
- R4 scene model and board renderer are required by R5.
- R5 project model is required by R6.
- R6 must pass before R7.
- Cross-cutting testing, accessibility, security, and documentation work runs in every phase.

### 3.5 Definition of Ready and Done

**Definition of Ready for a task:**

- Dependencies are complete.
- PRD section and acceptance criteria are identified.
- Input data contracts are known.
- Test approach is stated.

**Definition of Done for every task:**

- Acceptance criteria are met.
- TypeScript strict mode passes with no `any`.
- Zod validation exists at external and persisted boundaries.
- Loading, empty, success, and error states are implemented where relevant.
- Keyboard and accessibility basics are considered.
- Unit or integration tests cover important logic.
- No critical console errors in the relevant workflow.
- The feature works in a production build.
- Documentation is updated where behaviour or setup changed.
- No unrelated architecture or dependency complexity was introduced.

---

## 4. Architecture Guardrails

### 4.1 Layer boundaries

- UI components do not issue UCI commands.
- UI components do not perform raw IndexedDB transactions.
- UI components do not parse external API responses.
- Chess domain logic is independent of React.
- Engine communication is behind an adapter interface.
- Storage is behind repository interfaces.
- Animation scene data is separate from the visual editor.
- Templates are data-driven and versioned.

### 4.2 Data flow

```text
Import source -> internal Game model -> IndexedDB
Game + analysis -> VideoProject -> IndexedDB
VideoProject -> Remotion composition -> browser export -> downloadable file
```

### 4.3 Rendering pipeline

- Remotion Player is used for preview.
- `@remotion/web-renderer` is used for export.
- Composition components must use only client-renderer-compatible primitives.
- All assets must be loaded before rendering.
- Camera, text, effects, and audio must be frame-deterministic.
- SVG is the preferred board representation for deterministic export.

### 4.4 Storage and backup

- IndexedDB is the primary persistence layer.
- Large binary media is stored in dedicated asset stores, not ordinary application state.
- Autosave is debounced and exposes saving, saved, and error states.
- Schema changes use explicit versioned migrations.
- Backup and restore use versioned `.chessforge` ZIP files.
- Restore validates structure and version before writing.

### 4.5 Security and privacy

- No user accounts or authentication flows in the application.
- External requests are limited to Chess.com and Lichess import.
- PGN and external API responses are treated as untrusted input.
- Imported text is never injected as HTML.
- Route Handlers validate input and apply rate limits.
- File names and downloaded output names are sanitised.
- Basic auth is applied at the Coolify reverse proxy, not in application code.

### 4.6 Licensing and asset compliance

| Asset           | Licence           | Requirement                                                  |
| --------------- | ----------------- | ------------------------------------------------------------ |
| Stockfish       | GPL-3.0           | Include licence, source offer, and unmodified engine         |
| Chessground     | GPL-3.0-or-later  | Document licence and distribution limits                     |
| Remotion        | Remotion licence  | Use `licenseKey: "free-license"` for eligible individual use |
| cburnett pieces | CC BY-SA 3.0      | Attribution and share-alike for assets                       |
| chess-openings  | CC0 1.0           | No attribution required                                      |
| SFX             | CC0 or equivalent | Document source and licence                                  |
| Geist fonts     | OFL               | Include font licence                                         |

---

## 5. Phase R0 — Foundation and Technical Gates

**PRD mapping:** PH-0 plus §9.5 and §15 mitigations.

**Goal:** Establish the application shell, design system, domain model, storage foundation, and all technical proof-of-concepts required before feature work.

**Entry criteria:** Repository is at the initial Next.js scaffold.

### 5.1 Milestones

**Execution status (2026-11-22):** gates G0–G4 passed in the local build. Evidence is in `docs/evidence/R0/`. Live Coolify basic auth remains a deployment step.

- M0.1 Toolchain and documentation baseline
- M0.2 Design system and application shell
- M0.3 Domain model and storage foundation
- M0.4 Export proof of concept
- M0.5 Engine proof of concept
- M0.6 PGN proof of concept
- M0.7 External API proof of concept
- M0.8 Deployment and licensing gate

### 5.2 Tasks

| ID     | Task                                                                                                                                                                                                                  | Depends on             | Complexity | Acceptance criteria                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | ------------------------------------------------------------------------------------ |
| R0-T01 | Audit Next.js 16 docs and record breaking changes affecting App Router, Route Handlers, caching, headers, and deployment                                                                                              | None                   | S          | `README.md` or `docs/` contains version constraints and a short breaking-change note |
| R0-T02 | Configure toolchain scripts: lint, format, typecheck, unit test, E2E test, build                                                                                                                                      | R0-T01                 | S          | `npm run lint`, `npm run build`, and test scripts run successfully                   |
| R0-T03 | Install and configure Vitest, Testing Library, Playwright, Zod, Zustand, idb, Tailwind v4, shadcn/ui, lucide-react                                                                                                    | R0-T02                 | M          | Test runner executes a sample test; UI primitives render                             |
| R0-T04 | Create dark-first design tokens derived from `DESIGN.md` structure, Geist fonts, focus states, and reduced-motion handling                                                                                            | R0-T02                 | M          | Tokens are documented and applied to the root layout                                 |
| R0-T05 | Build application shell with routes for dashboard, analysis, studio, templates, and settings                                                                                                                          | R0-T04                 | M          | Navigation works on desktop and mobile widths                                        |
| R0-T06 | Define domain types and Zod schemas for Game, Move, PositionAnalysis, MoveAssessment, VideoProject, Scene, Template, and ApplicationSettings                                                                          | R0-T02                 | M          | Schemas validate sample data and reject invalid data                                 |
| R0-T07 | Implement IndexedDB schema, repository interfaces, migrations, quota handling, and an in-memory test adapter                                                                                                          | R0-T06                 | L          | Repositories pass CRUD and migration tests                                           |
| R0-T08 | Create asset pipeline for fonts, piece sets, SFX, and engine files                                                                                                                                                    | R0-T04                 | S          | Assets load from the public directory without 404s                                   |
| R0-T09 | Export proof of concept: Remotion Player plus `@remotion/web-renderer`, SVG board, text, audio, 1080p 9:16 and 16:9, MP4 and WebM, cancellation, capability detection, output validation, and performance measurement | R0-T03, R0-T04, R0-T08 | L          | Gate G1 passes                                                                       |
| R0-T10 | Engine proof of concept: select Stockfish package, worker adapter, UCI parsing, single-thread execution, MultiPV, stop, evaluation, mate handling, and cache key                                                      | R0-T03, R0-T06         | L          | Gate G2 passes                                                                       |
| R0-T11 | PGN proof of concept: parser evaluation, fixtures for comments, NAGs, variations, non-standard FEN, multiple games, and invalid input                                                                                 | R0-T03, R0-T06         | M          | Gate G3 passes                                                                       |
| R0-T12 | External API proof of concept: Chess.com and Lichess Route Handlers, validation, rate limiting, timeouts, fixtures, and attribution                                                                                   | R0-T05, R0-T06         | M          | Adapters import fixture games successfully                                           |
| R0-T13 | Deployment and licensing gate: Dockerfile, Coolify configuration, basic auth notes, COOP/COEP decision, headers, healthcheck, licence inventory, and source-offer plan                                                | R0-T01, R0-T09, R0-T10 | M          | Gate G4 passes                                                                       |
| R0-T14 | Create ADR index and document all technical decisions made during R0                                                                                                                                                  | R0-T09 to R0-T13       | S          | `docs/` contains ADRs for render, engine, PGN, storage, and licensing                |

### 5.3 Phase acceptance criteria

- Application shell runs in development and production builds.
- Design tokens and base components are usable.
- Domain types and storage repositories are tested.
- Export proof of concept passes on the reference browser.
- Engine proof of concept passes in a Web Worker.
- PGN proof of concept passes fixture tests.
- Deployment and licensing gate is approved.

### 5.4 Exit gates

- **G0:** Shell, navigation, design tokens, strict TypeScript, lint, and tests pass.
- **G1:** Export proof of concept renders a five-second 1080p video in Chrome or Edge on Linux, with MP4 where supported or WebM fallback, audio, cancellation, capability detection, and validated output.
- **G2:** Stockfish loads in a worker, analyses a position, returns MultiPV, handles mate, stops, and works in a production build.
- **G3:** PGN fixtures with comments, NAGs, variations, non-standard FEN, multiple games, and invalid input parse or fail with useful errors.
- **G4:** Docker build succeeds, Coolify deployment is documented, basic auth and rate limiting are configured, and licence obligations are documented.

---

## 6. Phase R1 — Walking Skeleton

**PRD mapping:** New phase; supports PH-1 through PH-5.

**Spec:** `docs/specs/R1-walking-skeleton.md`.

**Execution status (2026-11-22):** Gate G5 passed. Evidence is in `docs/evidence/R1/`. The R1 walking skeleton imports, replays, analyses, forges, exports, saves, reloads, and reopens locally.

**Goal:** Prove the end-to-end workflow with a thin, low-fidelity implementation.

**Entry criteria:** Gates G0–G4 pass.

### 6.1 Tasks

| ID     | Task                                                | Depends on       | Complexity | Acceptance criteria                                          |
| ------ | --------------------------------------------------- | ---------------- | ---------- | ------------------------------------------------------------ |
| R1-T01 | Import one fixture PGN through the paste interface  | R0-T11           | S          | Game appears in the local library                            |
| R1-T02 | Replay the fixture on the analysis board            | R1-T01           | S          | First, previous, next, last, and direct move navigation work |
| R1-T03 | Analyse one selected position with Stockfish        | R0-T10           | S          | Evaluation, best move, and mate distinction display          |
| R1-T04 | Create a minimal scene model and SVG board          | R0-T09           | M          | One scene renders the selected move                          |
| R1-T05 | Compose the minimal scene in Remotion Player        | R1-T04           | S          | Preview plays deterministically                              |
| R1-T06 | Export a three-second video in Chrome or Edge       | R1-T05, R0-T09   | M          | A playable file is produced and validated                    |
| R1-T07 | Save and reload the project from IndexedDB          | R0-T07           | S          | Project survives reload                                      |
| R1-T08 | Add a Playwright smoke test for the full thin slice | R1-T01 to R1-T07 | M          | Smoke test passes in CI with WebM                            |

### 6.2 Exit gate

- **G5:** The walking skeleton passes an end-to-end smoke test in a production build.

---

## 7. Phase R2 — Game Import and Replay

**PRD mapping:** PH-1; AC-01, AC-02, AC-03.

**Spec:** `docs/specs/R2-game-import-and-replay.md`.

**Execution status (2026-11-22):** Gate G6 passed. Evidence is in `docs/evidence/R2/`. R2 imports paste, file, Chess.com, and Lichess games with preview/confirm, persists warnings, replays on Chessground, and keeps the R1 walking skeleton green.

**Goal:** Complete game import, validation, source integration, and board replay.

**Entry criteria:** Gate G5 passes.

### 7.1 Tasks

| ID     | Task                                                                                                                      | Depends on             | Complexity | Acceptance criteria                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | ---------------------------------------------------- |
| R2-T01 | Implement PGN text import with headers, movetext, SAN validation, FEN generation, and error reporting                     | R0-T11, R1-T01         | M          | IMP-001 to IMP-004 pass                              |
| R2-T02 | Preserve comments, NAGs, variations, and original PGN text                                                                | R2-T01                 | M          | IMP-006 passes; original PGN is recoverable          |
| R2-T03 | Implement multiple-game PGN selection                                                                                     | R2-T01                 | S          | IMP-005 passes                                       |
| R2-T04 | Implement PGN file upload with type, encoding, empty-file, malformed-file, and size-limit handling                        | R2-T01                 | M          | AC-01 passes                                         |
| R2-T05 | Implement Chess.com import through a Route Handler with archive selection, PGN conversion, errors, and attribution        | R0-T12                 | L          | AC-02 passes for Chess.com                           |
| R2-T06 | Implement Lichess import through a Route Handler with username or game reference, PGN conversion, errors, and attribution | R0-T12                 | L          | AC-02 passes for Lichess                             |
| R2-T07 | Convert all source responses into the internal game model at the import boundary                                          | R2-T01, R2-T05, R2-T06 | M          | §6.1.5 passes; no source-specific data leaks into UI |
| R2-T08 | Persist imported games and metadata locally                                                                               | R0-T07, R2-T07         | S          | IMP-007 and AC-08 game persistence pass              |
| R2-T09 | Implement Chessground integration with orientation, themes, piece sets, last-move highlight, check, and checkmate         | R0-T08, R2-T01         | M          | BRD-001, BRD-004, BRD-005, BRD-006, BRD-007 pass     |
| R2-T10 | Implement move list, captured pieces, arrow/square annotations, and keyboard navigation                                   | R2-T09                 | M          | BRD-003, BRD-008, BRD-009, BRD-010 pass              |
| R2-T11 | Implement first, previous, next, last, and direct move navigation with responsive performance                             | R2-T09                 | M          | BRD-002 and §6.2.2 pass                              |
| R2-T12 | Implement dashboard recent games and import entry points                                                                  | R2-T08                 | S          | Dashboard matches §5.2                               |
| R2-T13 | Add unit, integration, and E2E tests for import, replay, navigation, and external import errors                           | R2-T01 to R2-T12       | M          | AC-01, AC-02, AC-03 pass                             |

### 7.2 Phase acceptance criteria

- Valid PGN can be pasted or uploaded.
- Chess.com and Lichess public games can be imported.
- Invalid input produces clear errors without corrupting existing data.
- Board position always matches the selected ply.
- Captures, castling, en passant, and promotion display correctly.

### 7.3 Exit gate

- **G6:** AC-01, AC-02, and AC-03 pass.

---

## 8. Phase R3 — Full Stockfish Analysis

**PRD mapping:** PH-2; AC-04; §6.3.1 to §6.3.9.

**Goal:** Complete engine analysis, classification, opening identification, phase labels, threats, and game summary.

**Entry criteria:** Gate G6 passes.

### 8.1 Tasks

| ID     | Task                                                                                                                                             | Depends on             | Complexity | Acceptance criteria            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------- | ------------------------------ |
| R3-T01 | Implement engine adapter interface and Web Worker lifecycle with idle, loading, ready, analysing, stopping, completed, and error states          | R0-T10                 | M          | §6.3.1 passes                  |
| R3-T02 | Implement engine settings: depth or time, MultiPV, threads, hash, and evaluation perspective                                                     | R3-T01                 | M          | §6.3.2 passes                  |
| R3-T03 | Implement UCI output parsing for evaluation, mate, depth, nodes, NPS, and principal variations                                                   | R3-T01                 | M          | ENG-002, ENG-005, ENG-007 pass |
| R3-T04 | Implement evaluation bar, numeric evaluation, best move, and PV display                                                                          | R3-T03                 | M          | ENG-001, ENG-003, ENG-004 pass |
| R3-T05 | Implement PV stepping on the board                                                                                                               | R3-T04, R2-T09         | S          | ENG-006 passes                 |
| R3-T06 | Implement stop, restart, and resume for position and full-game analysis                                                                          | R3-T01                 | M          | ENG-008 and §6.3.1 pass        |
| R3-T07 | Implement analysis cache keyed by FEN, engine version, and configuration                                                                         | R3-T01, R0-T07         | M          | ENG-009 passes                 |
| R3-T08 | Implement full-game analysis queue with progress, pause, cancel, and retry                                                                       | R3-T01, R2-T07         | L          | §6.3.1 and §8.1 pass           |
| R3-T09 | Implement centipawn loss with mate-score separation and perspective normalisation                                                                | R3-T03, R3-T08         | M          | §6.3.5 passes                  |
| R3-T10 | Implement move classification thresholds in a centralised configuration                                                                          | R3-T09                 | M          | §6.3.4 passes                  |
| R3-T11 | Implement candidate brilliant heuristic with conservative criteria and candidate label                                                           | R3-T10                 | M          | §6.3.4 passes                  |
| R3-T12 | Bundle and index the CC0 opening dataset; implement lookup with ECO and name                                                                     | R0-T08, R2-T07         | M          | §6.3.6 passes                  |
| R3-T13 | Implement heuristic phase classification with opening, middlegame, and endgame labels                                                            | R3-T08                 | S          | §6.3.7 passes                  |
| R3-T14 | Implement threat detection from engine PV and legal position analysis with forced versus heuristic distinction                                   | R3-T03, R2-T09         | M          | §6.3.8 passes                  |
| R3-T15 | Implement deterministic game summary with stats, eval swings, critical moments, tactical opportunities, brilliant candidates, and result context | R3-T08 to R3-T14       | M          | §6.3.9 passes                  |
| R3-T16 | Implement analysis UI: classification indicators, summary panel, critical moment navigation, and caveats                                         | R3-T04, R3-T10, R3-T15 | M          | AC-04 and §7.4 pass            |
| R3-T17 | Add unit, integration, and fixture tests for engine parsing, classification, CPL, mate handling, opening lookup, phase, threats, and summary     | R3-T01 to R3-T16       | M          | AC-04 and §14 pass             |

### 8.2 Phase acceptance criteria

- Stockfish runs in a worker without freezing the UI.
- Evaluation, best move, PV, depth, and mate are displayed.
- Analysis can be stopped and resumed.
- Move classifications include appropriate caveats.
- Opening, phase, threat, and summary features work offline.
- Cached analysis is reused correctly.

### 8.3 Exit gate

- **G7:** AC-04 passes and full §6.3 is implemented.

---

## 9. Phase R4 — Animation Core

**PRD mapping:** PH-3; §6.5; AC-06 preview aspects.

**Goal:** Build the deterministic scene model, SVG board, move animation, effects, camera, text, audio, and preview.

**Entry criteria:** Gate G7 passes.

### 9.1 Tasks

| ID     | Task                                                                                                                                   | Depends on       | Complexity | Acceptance criteria                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- | -------------------------------------- |
| R4-T01 | Define scene model with timing, move ranges, board state, camera, annotations, text, effects, audio references, and overrides          | R0-T06           | M          | §10.6 passes; project version included |
| R4-T02 | Implement deterministic timeline calculations in frames                                                                                | R4-T01           | S          | TML-002, TML-010 pass                  |
| R4-T03 | Implement SVG board renderer with themes, orientation, coordinates, check, and last-move highlight                                     | R0-T08, R2-T09   | L          | §6.5.1 and §6.5.2 base pass            |
| R4-T04 | Implement move animation for normal moves, captures, castling, en passant, and promotion                                               | R4-T03           | L          | §6.5.1 passes                          |
| R4-T05 | Implement board annotations and effects: arrows, square highlights, check indicator, checkmate emphasis, capture emphasis, glow, focus | R4-T03           | M          | §6.5.2 passes                          |
| R4-T06 | Implement camera zoom, pan, focus, transitions, and reset                                                                              | R4-T01, R4-T03   | M          | §6.5.3 passes                          |
| R4-T07 | Implement text and subtitle overlays with font, size, colour, alignment, position, duration, and safe-area warning                     | R4-T01           | M          | §6.5.4 passes                          |
| R4-T08 | Implement audio tracks: built-in SFX, user music, volume, mute, start time, and duration                                               | R0-T08, R4-T01   | M          | §6.5.5 passes                          |
| R4-T09 | Implement Remotion composition and Player preview with play, pause, seek, and scene selection                                          | R4-T01 to R4-T08 | L          | TML-005 passes                         |
| R4-T10 | Add determinism and performance tests for scene timing, board state, and preview                                                       | R4-T01 to R4-T09 | M          | §8.1 preview target passes             |

### 9.2 Phase acceptance criteria

- A game can be previewed as an animation.
- Move animation matches legal game state.
- Highlights, camera, text, and audio work in preview.
- Playback is deterministic.
- Preview targets 30 FPS on the reference device.

### 9.3 Exit gate

- **G8:** Deterministic preview works and AC-06 preview aspects pass.

---

## 10. Phase R5 — Video Studio

**PRD mapping:** PH-4; §6.4, §6.6, §6.7; AC-05, AC-06.

**Goal:** Complete project creation, timeline editing, templates, aspect ratios, audio, autosave, and persistence.

**Entry criteria:** Gate G8 passes.

### 10.1 Tasks

| ID     | Task                                                                                                          | Depends on               | Complexity | Acceptance criteria                              |
| ------ | ------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------- | ------------------------------------------------ |
| R5-T01 | Implement project creation from a full game with template selection                                           | R4-T01, R3-T15           | M          | VID-001, VID-003, VID-004 pass                   |
| R5-T02 | Implement project creation from selected moves with configurable lead-in and follow-through                   | R5-T01, R3-T15           | M          | VID-002, VID-005 pass                            |
| R5-T03 | Store project data independently from the source game while retaining a source reference                      | R5-T01                   | M          | §6.4.2 passes                                    |
| R5-T04 | Implement template schema, versioning, built-in read-only templates, and custom template CRUD                 | R0-T06, R0-T07           | L          | §6.7.2 and §6.7.3 pass                           |
| R5-T05 | Implement all seven built-in templates as data-driven presets                                                 | R5-T04, R4-T01           | L          | §6.7.1 passes                                    |
| R5-T06 | Implement template application with project overrides and reset-to-default                                    | R5-T04, R5-T01           | M          | §6.6.2 and §6.7.3 pass                           |
| R5-T07 | Implement timeline with scene order, duration, selection, total duration, add, remove, reorder, and duplicate | R4-T01, R4-T09           | L          | TML-001 to TML-007, TML-010 pass                 |
| R5-T08 | Implement text and annotation tracks in the timeline                                                          | R5-T07, R4-T05, R4-T07   | M          | TML-008 passes                                   |
| R5-T09 | Implement audio tracks with volume, mute, timing, and preview                                                 | R5-T07, R4-T08           | M          | TML-009 passes                                   |
| R5-T10 | Implement four aspect ratios with responsive layout rules and safe-area warnings                              | R5-T01, R4-T03           | M          | §6.8.1 and §6.8.2 layout aspects pass            |
| R5-T11 | Implement scene editing for board, camera, annotations, text, effects, audio, and overrides                   | R5-T07, R4-T03 to R4-T08 | L          | §5.4 passes                                      |
| R5-T12 | Implement autosave with debounce and saving, saved, and error states                                          | R0-T07, R5-T01           | M          | §6.6.2 and §6.9.2 pass                           |
| R5-T13 | Implement save, reopen, and migration of video projects                                                       | R5-T12                   | M          | VID-007, VID-008, AC-08 project persistence pass |
| R5-T14 | Implement destructive-action confirmation and undo where practical                                            | R5-T07, R5-T11           | S          | §6.6.2 passes                                    |
| R5-T15 | Implement dashboard recent projects and template access                                                       | R5-T13, R5-T04           | S          | §5.2 passes                                      |
| R5-T16 | Add integration and E2E tests for project creation, timeline, templates, autosave, and reopen                 | R5-T01 to R5-T15         | M          | AC-05 and AC-06 pass                             |

### 10.2 Phase acceptance criteria

- A project can be created from a complete game or selected moments.
- A built-in template can be applied.
- Generated scenes represent the intended moves and positions.
- User can select scenes, change duration, and preview the sequence.
- Project changes save and reopen locally.
- Custom templates can be saved and reused.

### 10.3 Exit gate

- **G9:** AC-05 and AC-06 pass and all seven templates work.

---

## 11. Phase R6 — Export

**PRD mapping:** PH-5; §6.8; AC-07.

**Goal:** Complete browser-based rendering, progress, cancellation, audio, format validation, and cleanup.

**Entry criteria:** Gate G9 passes.

### 11.1 Tasks

| ID     | Task                                                                                                                  | Depends on       | Complexity | Acceptance criteria           |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- | ----------------------------- |
| R6-T01 | Implement export configuration UI for aspect ratio, resolution, frame rate, quality, audio, and file name             | R5-T10           | M          | §6.8.2 passes                 |
| R6-T02 | Implement capability detection with `canRenderMediaOnWeb` and clear unsupported-option explanations                   | R0-T09, R6-T01   | M          | AC-07 capability aspects pass |
| R6-T03 | Implement render pipeline from project to Remotion composition with asset preloading                                  | R5-T13, R4-T09   | L          | §6.8.3 passes                 |
| R6-T04 | Implement progress reporting and cancellation with `AbortController`                                                  | R6-T03           | M          | §6.8.3 passes                 |
| R6-T05 | Implement MP4 and WebM output with codec fallback and audio encoding                                                  | R6-T03, R6-T02   | L          | AC-07 passes                  |
| R6-T06 | Implement large-export handling with `outputWritable` or Origin Private File System and safe fallback                 | R6-T03           | M          | §6.8.3 and §8.1 pass          |
| R6-T07 | Implement output validation for container, stream, duration, dimensions, and audio                                    | R6-T05           | M          | §6.8.4 passes                 |
| R6-T08 | Implement resource cleanup, error taxonomy, project protection on failure, and page-close warning                     | R6-T03 to R6-T07 | M          | §6.8.3 and §8.2 pass          |
| R6-T09 | Add integration and E2E tests for export configuration, capability detection, rendering, cancellation, and validation | R6-T01 to R6-T08 | M          | AC-07 passes                  |

### 11.2 Phase acceptance criteria

- User can select each supported aspect ratio.
- Unsupported capabilities are detected and explained.
- A valid playable output file is produced in Chrome or Edge.
- Output dimensions and duration match project settings within tolerance.
- Cancellation and failure do not corrupt the project.

### 11.3 Exit gate

- **G10:** AC-07 passes.

---

## 12. Phase R7 — Hardening and Release

**PRD mapping:** PH-6; AC-08, AC-09; §8, §12, §14, §18.

**Goal:** Complete error handling, performance, accessibility, backup/restore, deployment, documentation, and release validation.

**Entry criteria:** Gate G10 passes.

### 12.1 Tasks

| ID     | Task                                                                                                          | Depends on       | Complexity | Acceptance criteria                  |
| ------ | ------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- | ------------------------------------ |
| R7-T01 | Implement all error states from §12 with human-readable messages and recovery actions                         | R2 to R6         | L          | §12 passes                           |
| R7-T02 | Implement backup export for one project and full application data                                             | R0-T07, R5-T13   | M          | §6.9.3 passes                        |
| R7-T03 | Implement backup import with validation, version checks, and overwrite confirmation                           | R7-T02           | M          | §6.9.3 passes                        |
| R7-T04 | Implement restore rollback and storage error recovery                                                         | R7-T03, R0-T07   | M          | §6.9.2 and §12.4 pass                |
| R7-T05 | Optimise rendering, analysis, storage, and navigation against reference-device targets                        | R2 to R6         | L          | §8.1 passes                          |
| R7-T06 | Implement accessibility improvements: names, keyboard flows, contrast, focus, reduced motion, timeline labels | R2 to R6         | M          | §7.4 passes                          |
| R7-T07 | Complete Docker/Coolify deployment, basic auth, rate limiting, headers, and healthcheck                       | R0-T13, R6-T08   | M          | AC-09 passes                         |
| R7-T08 | Complete licence inventory, attribution, and source-offer documentation                                       | R0-T13, R2 to R6 | S          | §15 mitigation passes                |
| R7-T09 | Complete E2E suite for all seven PRD §14.3 scenarios                                                          | R2 to R7-T04     | L          | §14.3 passes                         |
| R7-T10 | Complete documentation: README, setup, deployment, troubleshooting, ADR index                                 | R0-T14, R7-T07   | M          | §18 documentation requirement passes |
| R7-T11 | Run final acceptance matrix and release checklist                                                             | R7-T01 to R7-T10 | M          | AC-01 to AC-09 pass                  |

### 12.2 Phase acceptance criteria

- Games, projects, templates, and settings survive reload.
- Backup export and restore work.
- Storage errors are visible.
- No authentication or account flow exists in the application.
- No external database or cloud rendering is required.
- Main workflows work locally after load, except external game fetch and uncached assets.

### 12.3 Exit gate

- **G11:** AC-08 and AC-09 pass and the release checklist is complete.

---

## 13. Cross-Cutting Workstreams

### 13.1 Testing strategy

- **Unit tests:** PGN parsing, FEN generation, evaluation normalisation, CPL, classification, mate handling, timeline calculations, scene generation, template overrides, serialization, migration, export configuration.
- **Integration tests:** Stockfish worker lifecycle, import adapters, IndexedDB repositories, template persistence, preview synchronisation, capability detection, encoding and muxing.
- **End-to-end tests:** import and replay, analysis, video from selected moment, template customisation, save/reload/reopen, short export in primary browser, backup restore.
- **CI browser policy:** Playwright Chromium uses WebM; installed Chrome or Edge is used for MP4 validation.

### 13.2 Performance

- Reference device: Linux mid-range, 16 GB RAM, integrated GPU, Chrome or Edge stable.
- Initial shell usable without waiting for Stockfish.
- Local project open under two seconds for typical projects.
- Move navigation visually responsive, target under 100 ms.
- Autosave debounced without interaction blocking.
- Engine progress visible immediately.
- Preview target 30 FPS.
- Export target: complete a 60-second 1080p 30 FPS export without crashing; target under five minutes.

### 13.3 Accessibility

- Controls have accessible names.
- Colour is not the only move-quality indicator.
- Keyboard navigation works for replay, playback, timeline, and dialogs.
- Focus states are visible.
- Reduced-motion preferences are respected in application UI.
- Timeline controls expose meaningful labels and states.

### 13.4 Security and privacy

- Validate PGN and external API responses.
- Avoid HTML injection from imported text.
- Sanitise file names and output names.
- Apply request validation and rate limiting to Route Handlers.
- Do not store external credentials.
- Document Coolify basic auth and network restrictions.

### 13.5 Licensing and asset compliance

- Keep licence inventory current.
- Include Stockfish GPL source offer.
- Document Chessground GPL implications.
- Use Remotion `free-license` for eligible individual use.
- Attribute cburnett pieces.
- Verify CC0 sources for openings and SFX.

---

## 14. Traceability Matrix

| PRD item                        | Roadmap phase             |
| ------------------------------- | ------------------------- |
| G-01 Import games               | R2                        |
| G-02 Analyse with Stockfish     | R3                        |
| G-03 Understand game quality    | R3                        |
| G-04 Create animated videos     | R4, R5, R6                |
| G-05 Editable templates         | R5                        |
| G-06 Export videos              | R6                        |
| G-07 Simple personal use        | R0, R7                    |
| G-08 Preserve local work        | R5, R7                    |
| UC-01 Import and review         | R2                        |
| UC-02 Analyse a game            | R3                        |
| UC-03 Create video from game    | R5, R6                    |
| UC-04 Create video from moments | R5, R6                    |
| UC-05 Save and reuse template   | R5                        |
| UC-06 Back up local work        | R7                        |
| IMP-001 to IMP-007              | R2                        |
| BRD-001 to BRD-010              | R2, R4                    |
| ENG-001 to ENG-009              | R3                        |
| VID-001 to VID-008              | R5                        |
| TML-001 to TML-010              | R4, R5                    |
| TML-011                         | R5 stretch, not a blocker |
| AC-01                           | R2                        |
| AC-02                           | R2                        |
| AC-03                           | R2                        |
| AC-04                           | R3                        |
| AC-05                           | R5                        |
| AC-06                           | R4, R5                    |
| AC-07                           | R6                        |
| AC-08                           | R5, R7                    |
| AC-09                           | R0, R7                    |
| §6.3.4 to §6.3.9                | R3                        |
| §6.5                            | R4                        |
| §6.8                            | R5, R6                    |
| §6.9                            | R0, R5, R7                |

---

## 15. Risk Register

| Risk                                  | Impact                             | Mitigation                                                           | Gate    |
| ------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- | ------- |
| Browser codec support varies          | Export fails or differs by browser | `canRenderMediaOnWeb`, WebM fallback, clear UI                       | G1, G10 |
| Remotion client renderer limitations  | Visual mismatch or unsupported CSS | POC in R0, use supported primitives, SVG board                       | G1      |
| Next.js 16 and Remotion compatibility | Build or runtime failure           | POC and dependency lock in R0                                        | G1      |
| Stockfish CPU and memory usage        | Slow UI or overheating             | Web Worker, conservative defaults, cancellation, configurable limits | G2, G7  |
| Large PGN or project data             | Slow parsing and storage pressure  | Size limits, validation, worker parsing if needed, quota handling    | R2, R7  |
| External API changes or rate limits   | Import becomes unreliable          | Isolated adapters, validation, retries, fixtures                     | R2      |
| Move classification subjectivity      | Misleading analysis                | Centralised thresholds, candidate labels, engine evidence            | R3      |
| Template schema changes               | Old projects fail                  | Versioned templates and projects, migrations                         | R5, R7  |
| Browser storage clearing              | User loses work                    | Backup/restore and clear warnings                                    | R7      |
| Asset licensing                       | Legal or distribution risk         | Licence inventory and attribution                                    | G4, R7  |
| Long project export                   | Memory failure or timeout          | 15-minute cap, `outputWritable`, cleanup                             | R6      |
| Playwright codec limitations          | False E2E failures                 | WebM in CI, Chrome/Edge for MP4                                      | R7      |

---

## 16. Deferred and Post-MVP

- PRD §2.2 non-goals remain out of scope.
- TML-011 timeline zoom is P2 and may ship after release if capacity allows.
- Multi-thread Stockfish remains optional unless performance testing justifies making it default.
- LLM-based summary generation is out of scope; summary remains deterministic.
- Cloud rendering, accounts, and marketplace remain out of scope.

---

## 17. Release Checklist

- [ ] AC-01 to AC-09 pass.
- [ ] All phase gates G0 to G11 pass.
- [ ] Unit, integration, and E2E tests pass.
- [ ] Production build passes.
- [ ] Backup export and restore pass.
- [ ] Docker build and Coolify deployment pass.
- [ ] Accessibility review passes.
- [ ] Performance review passes.
- [ ] Licence inventory is complete.
- [ ] Documentation is complete.
- [ ] No unrelated complexity was introduced.

---

## 18. Roadmap Maintenance

- Update task statuses as work progresses.
- Add an ADR for any new dependency or architectural change.
- Keep requirement IDs stable.
- Do not add features outside this roadmap without user approval.
- When scope changes, update both this roadmap and the PRD decision log.

---

*Generated from PRD revision 1.1 and approved user decisions on 2026-11-22.*
