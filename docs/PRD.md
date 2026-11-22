---
title: ChessForge — Product Requirements Document
product: ChessForge
version: "1.0"
doc_revision: "1.1"
status: Draft for implementation
last_updated: 2026-11-22
language: en
product_type: Single-user, local-first chess analysis and video creation studio
---

# ChessForge — Product Requirements Document (PRD)

> **TL;DR:** ChessForge is a single-user, local-first, browser-based app for chess game analysis (Stockfish) and video creation (timeline editor + templates). No accounts, no separate backend, no cloud rendering. The MVP is one end-to-end workflow: **Import → Replay → Analyse → Select moments → Create scenes → Edit timeline → Preview → Export → Save locally.**

## Table of Contents

- [ChessForge — Product Requirements Document (PRD)](#chessforge--product-requirements-document-prd)
  - [Table of Contents](#table-of-contents)
  - [Document Guide](#document-guide)
    - [Reading order](#reading-order)
    - [Conventions](#conventions)
    - [ID index](#id-index)
    - [Traceability: goals to requirements and acceptance criteria](#traceability-goals-to-requirements-and-acceptance-criteria)
    - [Glossary](#glossary)
  - [1. Executive Summary](#1-executive-summary)
    - [1.1 Overview](#11-overview)
    - [1.2 Product vision](#12-product-vision)
    - [1.3 Product principles](#13-product-principles)
  - [2. Product Goals and Non-Goals](#2-product-goals-and-non-goals)
    - [2.1 Goals](#21-goals)
    - [2.2 Non-goals for the initial release](#22-non-goals-for-the-initial-release)
  - [3. Target User and Primary Use Cases](#3-target-user-and-primary-use-cases)
    - [3.1 Target user](#31-target-user)
    - [3.2 Primary use cases](#32-primary-use-cases)
      - [UC-01 — Import and review a game](#uc-01--import-and-review-a-game)
      - [UC-02 — Analyse a game](#uc-02--analyse-a-game)
      - [UC-03 — Create a video from a game](#uc-03--create-a-video-from-a-game)
      - [UC-04 — Create a video from selected moments](#uc-04--create-a-video-from-selected-moments)
      - [UC-05 — Save and reuse a template](#uc-05--save-and-reuse-a-template)
      - [UC-06 — Back up local work](#uc-06--back-up-local-work)
  - [4. Scope and Release Strategy](#4-scope-and-release-strategy)
    - [4.1 MVP definition](#41-mvp-definition)
    - [4.2 Release phases](#42-release-phases)
    - [4.3 Priority levels](#43-priority-levels)
  - [5. Information Architecture](#5-information-architecture)
    - [5.1 Main navigation](#51-main-navigation)
    - [5.2 Dashboard](#52-dashboard)
    - [5.3 Game Analysis](#53-game-analysis)
    - [5.4 Video Studio](#54-video-studio)
    - [5.5 Templates](#55-templates)
    - [5.6 Settings](#56-settings)
  - [6. Functional Requirements](#6-functional-requirements)
    - [6.1 Game Import and Source Integration](#61-game-import-and-source-integration)
      - [6.1.1 PGN text import](#611-pgn-text-import)
      - [6.1.2 PGN file upload](#612-pgn-file-upload)
      - [6.1.3 Chess.com import](#613-chesscom-import)
      - [6.1.4 Lichess import](#614-lichess-import)
      - [6.1.5 Internal game model](#615-internal-game-model)
    - [6.2 Chessboard and Game Replay](#62-chessboard-and-game-replay)
      - [6.2.1 Requirements](#621-requirements)
      - [6.2.2 Additional behaviour](#622-additional-behaviour)
    - [6.3 Stockfish Analysis](#63-stockfish-analysis)
      - [6.3.1 Engine execution](#631-engine-execution)
      - [6.3.2 Engine settings](#632-engine-settings)
      - [6.3.3 Evaluation and principal variations](#633-evaluation-and-principal-variations)
      - [6.3.4 Move classification](#634-move-classification)
      - [6.3.5 Centipawn loss](#635-centipawn-loss)
      - [6.3.6 Opening identification](#636-opening-identification)
      - [6.3.7 Middlegame and endgame analysis](#637-middlegame-and-endgame-analysis)
      - [6.3.8 Threat detection](#638-threat-detection)
      - [6.3.9 Game summary and critical moments](#639-game-summary-and-critical-moments)
    - [6.4 Video Project Creation](#64-video-project-creation)
      - [6.4.1 Requirements](#641-requirements)
      - [6.4.2 Project data independence](#642-project-data-independence)
    - [6.5 Animation Engine](#65-animation-engine)
      - [6.5.1 Chess move animation](#651-chess-move-animation)
      - [6.5.2 Board annotations and effects](#652-board-annotations-and-effects)
      - [6.5.3 Camera movement](#653-camera-movement)
      - [6.5.4 Text and subtitles](#654-text-and-subtitles)
      - [6.5.5 Sound](#655-sound)
    - [6.6 Timeline and Editing](#66-timeline-and-editing)
      - [6.6.1 Timeline requirements](#661-timeline-requirements)
      - [6.6.2 Editing behaviour](#662-editing-behaviour)
    - [6.7 Templates](#67-templates)
      - [6.7.1 Built-in template categories](#671-built-in-template-categories)
      - [6.7.2 Template configuration](#672-template-configuration)
      - [6.7.3 Template behaviour](#673-template-behaviour)
    - [6.8 Video Formats and Export](#68-video-formats-and-export)
      - [6.8.1 Supported aspect ratios](#681-supported-aspect-ratios)
      - [6.8.2 Export configuration](#682-export-configuration)
      - [6.8.3 Rendering requirements](#683-rendering-requirements)
      - [6.8.4 Export acceptance](#684-export-acceptance)
    - [6.9 Local Persistence and Backup](#69-local-persistence-and-backup)
      - [6.9.1 IndexedDB](#691-indexeddb)
      - [6.9.2 Persistence requirements](#692-persistence-requirements)
      - [6.9.3 Backup and restore](#693-backup-and-restore)
  - [7. UX and Design Requirements](#7-ux-and-design-requirements)
    - [7.1 Visual direction](#71-visual-direction)
    - [7.2 Design principles](#72-design-principles)
    - [7.3 Interaction requirements](#73-interaction-requirements)
    - [7.4 Accessibility](#74-accessibility)
  - [8. Non-Functional Requirements](#8-non-functional-requirements)
    - [8.1 Performance](#81-performance)
    - [8.2 Reliability](#82-reliability)
    - [8.3 Privacy and security](#83-privacy-and-security)
    - [8.4 Compatibility](#84-compatibility)
    - [8.5 Maintainability](#85-maintainability)
  - [9. Proposed Technical Direction](#9-proposed-technical-direction)
    - [9.1 Application architecture](#91-application-architecture)
    - [9.2 Proposed technology stack](#92-proposed-technology-stack)
    - [9.3 Architectural boundaries](#93-architectural-boundaries)
    - [9.4 Suggested project structure](#94-suggested-project-structure)
    - [9.5 Rendering architecture constraint](#95-rendering-architecture-constraint)
  - [10. Core Data Concepts](#10-core-data-concepts)
    - [10.1 Game](#101-game)
    - [10.2 Move](#102-move)
    - [10.3 PositionAnalysis](#103-positionanalysis)
    - [10.4 MoveAssessment](#104-moveassessment)
    - [10.5 VideoProject](#105-videoproject)
    - [10.6 Scene](#106-scene)
    - [10.7 Template](#107-template)
    - [10.8 ApplicationSettings](#108-applicationsettings)
  - [11. Important User Flows](#11-important-user-flows)
    - [11.1 Import a game](#111-import-a-game)
    - [11.2 Analyse a game](#112-analyse-a-game)
    - [11.3 Create and export a video](#113-create-and-export-a-video)
    - [11.4 Save a custom template](#114-save-a-custom-template)
  - [12. Error Handling and Edge Cases](#12-error-handling-and-edge-cases)
    - [12.1 Import and game data](#121-import-and-game-data)
    - [12.2 Engine](#122-engine)
    - [12.3 Studio and animation](#123-studio-and-animation)
    - [12.4 Persistence](#124-persistence)
    - [12.5 Export](#125-export)
  - [13. Acceptance Criteria](#13-acceptance-criteria)
    - [AC-01 — PGN import](#ac-01--pgn-import)
    - [AC-02 — External game import](#ac-02--external-game-import)
    - [AC-03 — Game replay](#ac-03--game-replay)
    - [AC-04 — Stockfish](#ac-04--stockfish)
    - [AC-05 — Video project](#ac-05--video-project)
    - [AC-06 — Timeline and preview](#ac-06--timeline-and-preview)
    - [AC-07 — Export](#ac-07--export)
    - [AC-08 — Local persistence](#ac-08--local-persistence)
    - [AC-09 — Product constraints](#ac-09--product-constraints)
  - [14. Testing Strategy](#14-testing-strategy)
    - [14.1 Unit tests](#141-unit-tests)
    - [14.2 Integration tests](#142-integration-tests)
    - [14.3 End-to-end tests](#143-end-to-end-tests)
  - [15. Risks and Mitigations](#15-risks-and-mitigations)
  - [16. Product Decisions and Constraints](#16-product-decisions-and-constraints)
    - [16.1 Agreed product decisions](#161-agreed-product-decisions)
    - [16.2 Explicit constraints](#162-explicit-constraints)
  - [17. Open Technical Questions for Implementation Planning](#17-open-technical-questions-for-implementation-planning)
    - [Resolution status (roadmap v1.0)](#resolution-status-roadmap-v10)
  - [18. Definition of Done](#18-definition-of-done)
  - [19. Final Product Statement](#19-final-product-statement)
  - [Document History](#document-history)

---

## Document Guide

### Reading order

| If you are…                                 | Read first                                                             | Then                                                                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An AI agent starting an implementation task | [§16 Decisions and Constraints](#16-product-decisions-and-constraints) | [§4 Scope](#4-scope-and-release-strategy) → the relevant subsection of [§6](#6-functional-requirements) → [§13 Acceptance Criteria](#13-acceptance-criteria) → [§18 Definition of Done](#18-definition-of-done) |
| A product owner or reviewer                 | §1, §2, §3                                                             | §4, §13, §15, §17                                                                                                                                                                                               |
| A designer                                  | §5, §7                                                                 | §6.5–§6.8, §11                                                                                                                                                                                                  |
| An engineer planning architecture           | §8, §9, §10                                                            | §12, §14, §17                                                                                                                                                                                                   |

### Conventions

- **Priority levels:** P0 (Must), P1 (Should), P2 (Could). Defined in [§4.3](#43-priority-levels).
- **Release phases:** PH-0 to PH-6, defined in [§4.2](#42-release-phases). Not the same as priority levels.
- **Normative wording:** "must" / "must not" is mandatory. "should" is a strong recommendation; deviate only with a documented reason. "can" / "may" is optional.
- **Requirement IDs:** requirements in tables carry stable IDs (see index below). Requirements written as bullet lists have no ID; cite them by section number, for example "§6.1.3".
- **Non-binding content:** "Suggested fields" ([§10](#10-core-data-concepts)) and "Suggested project structure" ([§9.4](#94-suggested-project-structure)) are conceptual. Exact schemas are defined during implementation.
- **Hard constraints:** [§2.2 Non-goals](#22-non-goals-for-the-initial-release) and [§16.2 Explicit constraints](#162-explicit-constraints) must not be violated without an explicit product decision.
- **Cross-references:** "§6.3.4" means section 6.3.4 of this document.

### ID index

| Prefix | Meaning                           | Defined in | Range             |
| ------ | --------------------------------- | ---------- | ----------------- |
| G      | Product goal                      | §2.1       | G-01 – G-08       |
| UC     | Use case                          | §3.2       | UC-01 – UC-06     |
| PH     | Release phase                     | §4.2       | PH-0 – PH-6       |
| IMP    | PGN text import requirement       | §6.1.1     | IMP-001 – IMP-007 |
| BRD    | Chessboard and replay requirement | §6.2.1     | BRD-001 – BRD-010 |
| ENG    | Engine analysis requirement       | §6.3.3     | ENG-001 – ENG-009 |
| VID    | Video project requirement         | §6.4.1     | VID-001 – VID-008 |
| TML    | Timeline requirement              | §6.6.1     | TML-001 – TML-011 |
| AC     | Acceptance criteria group         | §13        | AC-01 – AC-09     |

### Traceability: goals to requirements and acceptance criteria

| Goal                         | Requirements                 | Acceptance criteria |
| ---------------------------- | ---------------------------- | ------------------- |
| G-01 Import games            | §6.1 (IMP), §6.2 (BRD)       | AC-01, AC-02, AC-03 |
| G-02 Analyse with Stockfish  | §6.3.1–§6.3.3 (ENG)          | AC-04               |
| G-03 Understand game quality | §6.3.4–§6.3.9                | AC-04               |
| G-04 Create animated videos  | §6.4 (VID), §6.5, §6.6 (TML) | AC-05, AC-06        |
| G-05 Editable templates      | §6.7                         | AC-05               |
| G-06 Export videos           | §6.8                         | AC-07               |
| G-07 Simple, personal use    | §8.3, §16.2                  | AC-09               |
| G-08 Preserve local work     | §6.9                         | AC-08               |

### Glossary

| Term           | Meaning                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| PGN            | Portable Game Notation: text format for chess games (headers plus movetext).                                         |
| FEN            | Forsyth–Edwards Notation: text description of a single board position.                                               |
| SAN            | Standard Algebraic Notation: human-readable move text, for example `Nf3`.                                            |
| UCI            | Universal Chess Interface: protocol for talking to chess engines; also a coordinate move format, for example `g1f3`. |
| NAG            | Numeric Annotation Glyph: numeric code for move annotations in PGN.                                                  |
| PV             | Principal variation: the engine's best line of play from a position.                                                 |
| ECO            | Encyclopaedia of Chess Openings code (A00–E99).                                                                      |
| Ply            | One half-move (a single move by one player).                                                                         |
| Centipawn (cp) | Evaluation unit equal to 1/100 of a pawn.                                                                            |
| Scene          | One timed segment of a video project ([§10.6](#106-scene)).                                                          |
| Template       | Reusable set of scene and style defaults ([§10.7](#107-template)).                                                   |
| Local-first    | User data stays in the browser by default; no account or cloud sync.                                                 |

---

## 1. Executive Summary

### 1.1 Overview

ChessForge is a personal, browser-based chess analysis and video creation application. It combines two equally important workflows:

1. **Game Analysis** — import chess games, replay moves, analyse positions with Stockfish, and understand important moments in a game.
2. **Video Studio** — turn a complete game or selected moments into polished chess animations using reusable templates and an editable timeline.

The application is intended for one person. It does not require user registration, authentication, subscriptions, multi-user collaboration, or a dedicated backend service.

ChessForge will use Next.js as a full-stack application. Most computationally intensive chess and media work should happen in the browser through Web Workers, WebAssembly, Remotion-related rendering components, and browser media APIs. Next.js Route Handlers may be used for external data retrieval or other server-side tasks that cannot be performed reliably from the browser.

Projects, imported games, templates, and preferences will be stored locally in IndexedDB. Users should be able to export and re-import project data for backup and portability.

### 1.2 Product vision

Make it easy to understand a chess game deeply and transform its most interesting moments into high-quality, social-media-ready videos without switching between multiple applications.

### 1.3 Product principles

- **Local-first:** user projects and preferences remain in the user's browser by default.
- **Analysis and creation are connected:** findings from analysis can be used directly in video projects.
- **Performance-conscious:** expensive work must not freeze the interface.
- **Type-safe and modular:** features should have clear boundaries and explicit data contracts.
- **Editor-first:** video output should be controllable, not limited to one-click presets.
- **Honest analysis:** engine evaluations and move classifications must be presented with appropriate context and must not imply certainty beyond the engine's search.

---

## 2. Product Goals and Non-Goals

### 2.1 Goals

| ID   | Goal                                              | Success condition                                                                              |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| G-01 | Import games from common chess sources            | Valid PGN can be imported from pasted text, files, Chess.com, and Lichess                      |
| G-02 | Analyse games with Stockfish                      | User can run, pause, and inspect engine analysis without blocking the UI                       |
| G-03 | Understand game quality and critical moments      | User can inspect evaluations, candidate moves, move classifications, and a game summary        |
| G-04 | Create animated chess videos                      | User can create an animation from a full game or selected moves                                |
| G-05 | Provide editable templates                        | User can select, customise, save, and reuse video templates                                    |
| G-06 | Export social-media-ready videos                  | User can configure supported aspect ratios, resolution, frame rate, and export a video locally |
| G-07 | Keep the application simple to operate personally | No account, authentication, or multi-user workflow is required                                 |
| G-08 | Preserve local work                               | Projects and settings persist locally and can be backed up through file export                 |

### 2.2 Non-goals for the initial release

The following are explicitly outside the initial product scope:

- User accounts, login, registration, password reset, and role management.
- Multi-user collaboration, sharing permissions, or team workspaces.
- Subscription, billing, payment, or usage quota systems.
- Cloud project synchronisation.
- Cloud rendering queues or distributed rendering workers.
- Native desktop or mobile applications.
- Live online chess gameplay.
- A chess-playing bot or opponent matchmaking.
- A guarantee that Stockfish classifications match Chess.com or Lichess labels.
- Full video post-production capabilities comparable to professional nonlinear editors.
- Automatic generation of human commentary or voice-over using an AI service.
- Public template marketplace.
- Automatic publishing to TikTok, Instagram, or YouTube.
- Support for every possible browser, codec, or media container.

These may be considered later, but must not complicate the initial architecture.

---

## 3. Target User and Primary Use Cases

### 3.1 Target user

A single chess enthusiast who wants to:

- Review personal games.
- Understand mistakes and tactical opportunities.
- Study openings, middlegames, and endgames.
- Identify interesting moves worth explaining.
- Produce chess videos for social media and personal learning.

The interface language is English.

### 3.2 Primary use cases

#### UC-01 — Import and review a game

1. User opens Game Analysis.
2. User pastes PGN, uploads a PGN file, or retrieves a public game from Chess.com or Lichess.
3. ChessForge validates the game and displays its metadata.
4. User navigates through the moves on the board.

#### UC-02 — Analyse a game

1. User opens an imported game.
2. User starts Stockfish analysis.
3. ChessForge evaluates positions and principal variations.
4. User reviews move classifications and critical moments.
5. User opens a move to inspect the best move and alternative lines.

#### UC-03 — Create a video from a game

1. User selects a game or an analysed game.
2. User chooses a video template.
3. ChessForge creates an editable video project.
4. User edits the sequence, board appearance, highlights, camera movement, text, and audio.
5. User previews the result.
6. User exports the video locally.

#### UC-04 — Create a video from selected moments

1. User selects one or more moves from a game.
2. User creates a video from those moments.
3. ChessForge creates scenes around the selected moves, including configurable lead-in and follow-through moves.
4. User edits and exports the result.

#### UC-05 — Save and reuse a template

1. User customises a template.
2. User saves the configuration as a custom template.
3. The template becomes available for future video projects.

#### UC-06 — Back up local work

1. User exports a project or application backup.
2. ChessForge creates a downloadable data file.
3. User can later import that file to restore the project or settings.

---

## 4. Scope and Release Strategy

### 4.1 MVP definition

The MVP must deliver one complete end-to-end workflow:

**Import PGN → Replay game → Analyse with Stockfish → Select moments → Apply template → Edit animation → Preview → Export video → Save project locally.**

A feature should not be considered complete merely because its screen exists. The underlying workflow must work with real PGN data and a real browser export.

### 4.2 Release phases

Phases are labelled **PH-0 to PH-6** so they are not confused with priority levels (P0/P1/P2, see §4.3).

| Phase                         | Scope                                                                                      | Exit criteria                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| PH-0 — Foundation             | Next.js application shell, design system, local persistence foundation, chess domain types | Application runs, navigation works, core types and storage boundaries are established |
| PH-1 — Game Import and Replay | PGN paste/upload, Chess.com and Lichess import, validation, board replay, move navigation  | User can import and replay supported games                                            |
| PH-2 — Engine Analysis        | Stockfish Web Worker, evaluation, PV, move classification, game summary                    | User can analyse a game and inspect results                                           |
| PH-3 — Animation Core         | Scene model, move animation, highlights, camera effects, playback controls                 | A game can be previewed as an animation                                               |
| PH-4 — Video Studio           | Timeline, scene editing, text, sound, templates, aspect ratios                             | User can customise and save an editable video project                                 |
| PH-5 — Export                 | Browser rendering pipeline, progress, cancellation, output validation                      | User can export a playable video in supported browser configurations                  |
| PH-6 — Polish                 | Error states, performance, accessibility, backup/restore, documentation                    | MVP acceptance criteria are met                                                       |

### 4.3 Priority levels

- **P0 — Must:** required for the MVP to be usable.
- **P1 — Should:** important for a complete first release but may follow the core workflow.
- **P2 — Could:** useful enhancement that must not delay the MVP.
- **Out of scope:** not planned for the initial release.

---

## 5. Information Architecture

### 5.1 Main navigation

The application should provide the following primary destinations:

1. **Dashboard**
2. **Game Analysis**
3. **Video Studio**
4. **Templates**
5. **Settings**

### 5.2 Dashboard

The dashboard is the starting point and should provide:

- A clear action to import a game.
- A clear action to create a video.
- Recently opened games.
- Recently edited video projects.
- Quick access to saved templates.
- Local storage usage or a simple storage status indicator.
- Helpful empty states for a new installation.

The dashboard must not imply cloud synchronisation or account-based activity.

### 5.3 Game Analysis

The Game Analysis workspace should contain:

- Game metadata and player information.
- Chessboard.
- Move list.
- Navigation controls.
- Engine evaluation bar.
- Engine analysis panel.
- Move classification indicators.
- Game summary and critical moments.
- A clear action to create a video from the game or selected moves.

### 5.4 Video Studio

The Video Studio workspace should contain:

- Preview canvas.
- Chessboard scene.
- Timeline.
- Scene and move sequence list.
- Template and style controls.
- Board and piece appearance controls.
- Highlight and annotation controls.
- Camera and animation controls.
- Text and subtitle controls.
- Audio controls.
- Export settings and export action.

The editor should prioritise a usable canvas and timeline. Advanced settings may be placed in contextual side panels rather than shown all at once.

### 5.5 Templates

The Templates area should provide:

- Built-in templates.
- User-created templates.
- Template preview.
- Template details.
- Apply-to-project action.
- Duplicate, rename, and delete actions for custom templates.
- Reset-to-default action where applicable.

### 5.6 Settings

Settings should include:

- Default board theme.
- Default piece set.
- Default video aspect ratio.
- Default export resolution and frame rate.
- Default animation speed.
- Stockfish configuration, subject to browser capability.
- Storage and backup controls.
- Application information and supported-browser status.

---

## 6. Functional Requirements

This section defines what the product must do, grouped by capability. Tables hold ID-tracked requirements; lists hold behavioural rules that apply to the capability. Priority levels (P0/P1/P2) are defined in [§4.3](#43-priority-levels).

| Section | Capability                         | ID prefix |
| ------- | ---------------------------------- | --------- |
| 6.1     | Game Import and Source Integration | IMP       |
| 6.2     | Chessboard and Game Replay         | BRD       |
| 6.3     | Stockfish Analysis                 | ENG       |
| 6.4     | Video Project Creation             | VID       |
| 6.5     | Animation Engine                   | —         |
| 6.6     | Timeline and Editing               | TML       |
| 6.7     | Templates                          | —         |
| 6.8     | Video Formats and Export           | —         |
| 6.9     | Local Persistence and Backup       | —         |

### 6.1 Game Import and Source Integration

#### 6.1.1 PGN text import

| ID      | Priority | Requirement                                                                                                      |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| IMP-001 | P0       | User can paste PGN text into an import interface                                                                 |
| IMP-002 | P0       | Application parses PGN and validates the move sequence                                                           |
| IMP-003 | P0       | Application displays a useful error when PGN is invalid                                                          |
| IMP-004 | P0       | Application supports standard PGN headers and movetext                                                           |
| IMP-005 | P1       | Application supports multiple games in one PGN input and lets the user choose a game                             |
| IMP-006 | P1       | Application preserves comments, NAGs, and variations when supported by the chosen parser and internal data model |
| IMP-007 | P0       | Application stores the imported game locally after successful import                                             |

#### 6.1.2 PGN file upload

- User can select a `.pgn` file from the local device.
- The application validates file type and readable content.
- The application must handle empty files, malformed PGN, unsupported encodings, and unusually large files gracefully.
- The original PGN text should be preserved when possible so the user can export it again.
- File size limits should be configurable and documented; do not silently truncate input.

#### 6.1.3 Chess.com import

- User can enter a public Chess.com username.
- The application can retrieve available public game archives and let the user choose a month or game.
- The selected game's PGN is imported into the same internal game model as manual PGN import.
- Use documented public endpoints where possible.
- Do not request or store the user's Chess.com password, session cookie, or private credentials.
- Handle unknown usernames, private/unavailable games, rate limiting, network errors, and empty archives.
- External requests may use a Next.js Route Handler as a same-origin proxy when browser CORS restrictions or request reliability require it.
- The application must identify Chess.com as an external service and must not imply official affiliation.

#### 6.1.4 Lichess import

- User can enter a public Lichess username or provide a supported public game reference.
- The application retrieves public games using documented Lichess API capabilities.
- The user can select a game and import its PGN.
- Handle unavailable games, rate limits, network errors, and unsupported references.
- Do not request or store private Lichess credentials.
- The application must identify Lichess as an external service and must not imply official affiliation.

#### 6.1.5 Internal game model

All import methods must produce a consistent internal representation containing, where available:

- Unique local game ID.
- Source type and source reference.
- White and Black player names.
- Result.
- Event, site, date, round, and time control.
- Starting position / FEN.
- Ordered moves.
- SAN and UCI move representations where available.
- Comments, annotations, and variations where supported.
- Original PGN text.
- Import timestamp.
- Parsing and validation status.

A source-specific response must not leak into UI components. Convert external data into the internal game model at the import boundary.

---

### 6.2 Chessboard and Game Replay

#### 6.2.1 Requirements

| ID      | Priority | Requirement                                                          |
| ------- | -------- | -------------------------------------------------------------------- |
| BRD-001 | P0       | Display a legal chess position from the internal game state          |
| BRD-002 | P0       | Navigate to the first move, previous move, next move, and final move |
| BRD-003 | P0       | Allow direct selection of a move from the move list                  |
| BRD-004 | P0       | Highlight the last move                                              |
| BRD-005 | P0       | Display check and checkmate states                                   |
| BRD-006 | P1       | Allow board orientation to switch between White and Black            |
| BRD-007 | P1       | Support board and piece themes                                       |
| BRD-008 | P1       | Support arrow and square annotations                                 |
| BRD-009 | P1       | Display captured pieces where useful                                 |
| BRD-010 | P1       | Support keyboard navigation for move replay                          |

#### 6.2.2 Additional behaviour

- The board position must always match the currently selected move.
- Invalid positions must not crash the workspace.
- Move navigation should remain responsive for long games.
- The user should be able to jump to a critical moment from the analysis summary.

---

### 6.3 Stockfish Analysis

#### 6.3.1 Engine execution

- Stockfish must run in a Web Worker or equivalent isolated worker context.
- Engine execution must not block the main UI thread.
- The application must expose engine states: idle, loading, ready, analysing, stopping, completed, and error.
- The user can start, stop, and restart analysis.
- The UI must show that analysis is in progress.
- Worker failures must be recoverable without requiring a full page reload where possible.
- Engine assets and worker code must be loaded in a way compatible with the production build and deployment environment.

#### 6.3.2 Engine settings

The initial engine settings should include:

- Analysis depth or time limit.
- Number of principal variations, subject to engine and performance constraints.
- Threads, where supported by the selected Stockfish build and browser isolation capabilities.
- Hash size, within safe browser memory limits.
- Side-to-move perspective for evaluation display.

Defaults should favour responsiveness and safe memory use over maximum engine strength. The application must not assume that every browser supports the same engine capabilities.

#### 6.3.3 Evaluation and principal variations

| ID      | Priority | Requirement                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------ |
| ENG-001 | P0       | Analyse a selected position using Stockfish                                    |
| ENG-002 | P0       | Display numerical evaluation in a consistent perspective                       |
| ENG-003 | P0       | Display an evaluation bar                                                      |
| ENG-004 | P0       | Display the best move                                                          |
| ENG-005 | P1       | Display one or more principal variations                                       |
| ENG-006 | P1       | Allow the user to step through a principal variation on the board              |
| ENG-007 | P1       | Display depth and/or search information when available                         |
| ENG-008 | P1       | Allow analysis to be stopped and resumed                                       |
| ENG-009 | P1       | Cache completed analysis locally using a position and engine-configuration key |

**Evaluation display rules:**

- Clearly distinguish centipawn evaluations from mate scores.
- Use a consistent side-to-move or White-perspective convention throughout the product.
- Document the selected convention in the UI or help text.
- Do not compare raw evaluations from different engine configurations as if they were identical.
- Display an appropriate loading or incomplete state while an evaluation is being calculated.

#### 6.3.4 Move classification

The application should classify moves into:

- Best / engine-preferred move.
- Excellent.
- Good.
- Inaccuracy.
- Mistake.
- Blunder.
- Candidate brilliant move.

Classification should be based on configurable evaluation change thresholds and contextual heuristics. The thresholds must be documented and centralised rather than scattered through UI components.

**Important constraints:**

- A "brilliant" label is an application-generated candidate, not an official Chess.com or Lichess classification.
- The UI should label it as **Candidate Brilliant** or equivalent until the user accepts or edits the annotation.
- Classification can be affected by engine depth, position complexity, forced moves, and evaluation volatility.
- The application must avoid presenting heuristic classifications as objective truth.
- Users should be able to inspect the evaluation before and after a move.
- Initial classification thresholds are implementation-defined and documented in `docs/ROADMAP.md`; they must remain centralised and must not be scattered through UI components.

#### 6.3.5 Centipawn loss

- Calculate centipawn loss using comparable evaluations before and after the played move.
- Normalise evaluation perspective before calculating loss.
- Handle mate scores separately; do not treat mate scores as ordinary centipawn values.
- Show the value at move level and optionally in the game summary.
- Document that centipawn loss is engine- and depth-dependent.

#### 6.3.6 Opening identification

- Identify an opening using a local opening database or a clearly defined opening lookup source.
- Show the opening name and ECO code when available.
- If no reliable match exists, show "Unknown opening" rather than guessing.
- Opening identification must not prevent game import or analysis if the opening database is unavailable.

#### 6.3.7 Middlegame and endgame analysis

- Provide phase labels for opening, middlegame, and endgame where the classification method can support them.
- Phase classification should be described as heuristic unless a verified chess-position classifier is used.
- Allow the user to navigate to the first move of each detected phase.
- Do not claim that a phase boundary is universally definitive.

#### 6.3.8 Threat detection

- Use engine principal variations and legal position analysis to surface relevant threats.
- Examples include threats to material, checkmate threats, hanging pieces, and tactical continuations when they can be inferred reliably.
- Each threat should reference the position and line that supports it.
- Distinguish a forced engine line from a heuristic warning.
- Do not claim exhaustive tactical detection.

#### 6.3.9 Game summary and critical moments

The game summary should include, when available:

- Game result and player names.
- Opening identification.
- Move count.
- Move classification counts.
- Major evaluation swings.
- Candidate critical moments.
- Notable tactical opportunities.
- Candidate brilliant moves.
- Checkmate or resignation context when present.
- A concise engine-generated factual summary based on computed analysis.

The summary must not invent player intentions or claim to know why a player made a move.

---

### 6.4 Video Project Creation

#### 6.4.1 Requirements

| ID      | Priority | Requirement                                                                 |
| ------- | -------- | --------------------------------------------------------------------------- |
| VID-001 | P0       | Create a video project from an imported game                                |
| VID-002 | P0       | Create a video project from selected moves or moments                       |
| VID-003 | P0       | Select a built-in template during project creation                          |
| VID-004 | P0       | Generate an editable scene sequence from the selected game moves            |
| VID-005 | P1       | Configure how many moves appear before and after a selected critical moment |
| VID-006 | P1       | Reorder, duplicate, and delete scenes                                       |
| VID-007 | P1       | Save the project locally                                                    |
| VID-008 | P1       | Reopen and continue editing a saved project                                 |

#### 6.4.2 Project data independence

A video project must be independent from the source game after creation in the sense that the project stores the data needed to reproduce its scenes. It may also retain a reference to the source game for navigation and traceability.

---

### 6.5 Animation Engine

#### 6.5.1 Chess move animation

- Animate pieces from source square to destination square.
- Support configurable movement duration and easing.
- Support capture animation.
- Support castling, en passant, and promotion.
- Maintain legal position state across the sequence.
- Keep the board and move sequence synchronised.
- Provide deterministic playback so the same project produces the same scene timing and positions.

#### 6.5.2 Board annotations and effects

The animation system should support:

- Last-move highlight.
- Arrow annotations.
- Square highlights.
- Check indicator.
- Checkmate emphasis.
- Capture emphasis.
- Glow effect.
- Optional focus on selected squares or pieces.

Effects must be configurable per scene and through template defaults.

#### 6.5.3 Camera movement

Support:

- Zoom in and zoom out.
- Pan / reposition.
- Focus on a region of the board.
- Smooth transitions between camera states.
- Reset to the default board framing.

Camera effects must not make the board confusing or obscure relevant pieces.

#### 6.5.4 Text and subtitles

Support:

- Scene title.
- Move label.
- Short explanation.
- Subtitle / caption.
- Optional player and game metadata.
- Configurable font, size, colour, alignment, position, and duration.

Text must remain within the selected output safe area. The editor should warn when text may be clipped.

#### 6.5.5 Sound

Support:

- Optional background music.
- Optional move sound.
- Optional capture sound.
- Optional check / checkmate sound.
- Per-track volume.
- Mute and preview controls.
- Audio start time and duration.

Only user-provided or appropriately licensed audio assets should be used. Built-in audio assets must have clear usage rights.

---

### 6.6 Timeline and Editing

The editor must provide a timeline-based workflow.

#### 6.6.1 Timeline requirements

| ID      | Priority | Requirement                                            |
| ------- | -------- | ------------------------------------------------------ |
| TML-001 | P0       | Display the project's scenes in timeline order         |
| TML-002 | P0       | Display scene duration                                 |
| TML-003 | P0       | Allow scene selection                                  |
| TML-004 | P0       | Allow scene duration changes                           |
| TML-005 | P0       | Preview the selected scene and full sequence           |
| TML-006 | P1       | Allow scene reordering                                 |
| TML-007 | P1       | Allow adding and removing scenes                       |
| TML-008 | P1       | Support text and annotation tracks                     |
| TML-009 | P1       | Support audio tracks                                   |
| TML-010 | P1       | Show total project duration                            |
| TML-011 | P2       | Support timeline zoom and more detailed track controls |

#### 6.6.2 Editing behaviour

- Changes should update the preview.
- The editor should distinguish template defaults from project-specific overrides.
- The user should be able to reset a property to its template default.
- Destructive actions such as deleting a scene should be reversible where practical or require confirmation.
- The editor should avoid losing changes when the user navigates between panels.
- Autosave should be debounced and should provide a visible save state.

---

### 6.7 Templates

#### 6.7.1 Built-in template categories

The initial template collection should include:

1. Cinematic Chess
2. Tactical Breakdown
3. Brilliant Move
4. Checkmate Sequence
5. Minimalist Analysis
6. Opening Tutorial
7. Game Recap

A **Custom Template** is a user-created template, not a fixed built-in category.

#### 6.7.2 Template configuration

A template should be able to define:

- Template name and description.
- Preview thumbnail or representative frame.
- Default aspect ratio.
- Board theme and piece set.
- Scene sequence rules.
- Move animation settings.
- Camera movement presets.
- Highlight and annotation styles.
- Text styles and layout.
- Default sound settings.
- Default frame rate and resolution.
- Optional opening and ending scenes.

#### 6.7.3 Template behaviour

- Applying a template must not permanently overwrite the original template.
- Applying a template should create project-level settings or overrides.
- Custom templates must be stored locally.
- User can duplicate, rename, update, and delete custom templates.
- Built-in templates should be treated as read-only defaults.
- A template must declare a version so future schema changes can be migrated.

---

### 6.8 Video Formats and Export

#### 6.8.1 Supported aspect ratios

| Format        | Aspect ratio | Primary use                   |
| ------------- | ------------ | ----------------------------- |
| Portrait      | 9:16         | Reels, TikTok, YouTube Shorts |
| Landscape     | 16:9         | YouTube                       |
| Square        | 1:1          | Instagram                     |
| Portrait feed | 4:5          | Instagram feed                |

#### 6.8.2 Export configuration

The export interface should allow the user to configure:

- Aspect ratio.
- Resolution, subject to browser and rendering capability.
- Frame rate.
- Output quality or bitrate where supported.
- Audio inclusion.
- Output file name.

Suggested initial presets:

- 720p preview / lightweight export.
- 1080p final export.
- 30 FPS default.
- 60 FPS as an optional setting where performance and codec support permit.

Implementation limits for v1:

- Maximum project duration: 15 minutes, with a warning at 5 minutes.
- Default media limits: PGN 5 MB; audio 50 MB or 10 minutes per file; 250 MB total media per project.
- Portable project and backup format: versioned `.chessforge` ZIP.

The exact supported combinations must be validated in the target browsers. Do not promise a format or codec that the active browser cannot produce.

#### 6.8.3 Rendering requirements

- Browser rendering is the primary export strategy.
- Remotion may be used for composition and preview, with a compatible browser rendering/export pipeline.
- WebCodecs can be used where supported for encoding.
- Remotion Player alone must not be treated as a complete MP4 encoder.
- The implementation must verify codec and container support rather than assuming WebCodecs directly creates a universally compatible MP4 file.
- If MP4 muxing is required, use a compatible client-side muxing implementation or another verified browser-compatible approach.
- If the selected browser cannot export the requested format, show a clear explanation and available alternatives.
- The UI must display rendering progress.
- The user can cancel an export.
- Failed exports must show a useful error and must not corrupt the editable project.
- Export should not block normal navigation more than necessary.
- The application should release temporary media resources after export.

#### 6.8.4 Export acceptance

An export is complete only when:

- A file is produced.
- The file has a valid container and playable video stream.
- Duration is within an acceptable tolerance of the project timeline.
- Audio is present when enabled and supported.
- The output dimensions match the selected aspect ratio and resolution.
- The final file can be opened by common media players.

---

### 6.9 Local Persistence and Backup

#### 6.9.1 IndexedDB

IndexedDB is the primary persistence layer for:

- Imported games.
- Original PGN text.
- Analysis results and cache metadata.
- Video projects.
- Custom templates.
- Application preferences.
- Optional local media asset metadata.

Do not store large binary media unnecessarily in ordinary application state or localStorage.

#### 6.9.2 Persistence requirements

- Projects should autosave after meaningful edits.
- Autosave should be debounced to avoid excessive writes.
- The UI should indicate saving, saved, and save-error states.
- Data access should be isolated behind repository or storage service interfaces.
- Database schema changes must use explicit versioned migrations.
- Corrupted or unavailable storage must produce a recoverable error state.
- The application should handle browser storage quota limits.
- The application must not claim that browser storage is permanent or immune to browser-data clearing.

#### 6.9.3 Backup and restore

At minimum, provide:

- Export one project as a portable project file.
- Import a previously exported project.
- Export all application data as a backup archive or documented bundle.
- Restore from a backup.
- Validate imported backup structure and version before writing to IndexedDB.
- Warn before a restore operation that could overwrite existing local data.

The exact portable file format should be defined during technical design. It should be versioned and documented.

For v1, the portable format is a versioned `.chessforge` ZIP containing a manifest, project data, and referenced media assets.

---

## 7. UX and Design Requirements

### 7.1 Visual direction

**Modern dark professional**, inspired by the clarity and restraint of products such as Vercel and Linear. The design must be original and must not copy their exact interface.

For implementation, `docs/DESIGN.md` is a structural reference only: use its spacing, border, typography, density, and component discipline, but adapt the palette to ChessForge's dark-first visual direction.

### 7.2 Design principles

- Dark-first interface.
- Clear hierarchy and restrained use of colour.
- High information density in analysis views without visual clutter.
- Consistent spacing, typography, borders, and component states.
- Chessboard remains visually prominent.
- Engine evaluation and move classifications are easy to scan.
- Timeline controls remain discoverable.
- Avoid excessive gradients, glow effects, and decorative elements in the application UI.
- Use motion to communicate state and position changes, not as decoration.
- Provide empty, loading, success, warning, and error states.

### 7.3 Interaction requirements

- Keyboard-friendly navigation for common replay and playback actions.
- Visible focus states.
- Tooltips for unfamiliar chess and editor controls.
- Confirmation for destructive actions.
- Clear progress and cancellation for long-running work.
- Useful error messages with a recovery action where possible.
- Avoid modal dialogs for routine settings that can be handled contextually.

### 7.4 Accessibility

- Controls must have accessible names.
- Colour must not be the only indicator of move quality or engine state.
- Text and controls should meet reasonable contrast requirements.
- Keyboard navigation must work for primary application flows.
- Respect reduced-motion preferences where practical.
- Timeline controls should expose meaningful labels and states.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Main-thread UI interactions should remain responsive during engine analysis and export.
- Stockfish must run outside the main UI thread.
- Large PGN parsing should not freeze the interface; use a worker when measurements justify it.
- Avoid unnecessary re-rendering of the chessboard and timeline.
- Cache expensive derived data where correctness allows.
- Provide a low-resource default engine configuration.
- Rendering performance must be measured on a documented reference device and browser.
- Reference device for v1: Linux mid-range desktop, 16 GB RAM, integrated GPU, current Chrome or Edge.

Performance targets should be treated as initial engineering targets, not universal guarantees:

| Area                      | Initial target                                               |
| ------------------------- | ------------------------------------------------------------ |
| Initial application shell | Usable without waiting for Stockfish to load                 |
| Local project open        | Under 2 seconds for typical projects on the reference device |
| Move navigation           | Visually responsive, target under 100 ms for typical games   |
| Autosave                  | Debounced; no noticeable interaction blocking                |
| Engine analysis           | Progress visible immediately; no main-thread freeze          |
| Preview playback          | Target 30 FPS for ordinary scenes on the reference device    |

### 8.2 Reliability

- A failed import must not corrupt existing games.
- A failed engine run must not corrupt the source game.
- A failed export must not corrupt the editable project.
- Autosave failures must be visible.
- Local storage migrations must be tested against previous schema versions.
- Worker errors must be surfaced and recoverable where possible.

### 8.3 Privacy and security

- No user account or authentication is required.
- Personal game and project data should remain local by default.
- External requests should be limited to the services explicitly used for game import.
- Do not send PGNs, analysis, or projects to third-party services unless a future feature explicitly requires it and the user is informed.
- Do not store external account passwords or private access tokens.
- Validate imported text and file content.
- Treat PGN comments and external API responses as untrusted input.
- Avoid injecting imported PGN text as HTML.
- Use safe handling for file names and downloaded output names.
- Do not expose unnecessary server endpoints.
- Apply appropriate request validation and error handling to any Next.js Route Handler.

### 8.4 Compatibility

The initial supported environment should be current desktop versions of:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox, subject to media API capability.
- Safari, subject to media API capability.

Because WebCodecs and browser media support vary, the application must feature-detect capabilities at runtime. The export UI must communicate supported and unsupported options. Mobile browsers are not a primary target for the initial release.

### 8.5 Maintainability

- Use TypeScript strict mode.
- Avoid `any`; use explicit domain types and runtime validation at external boundaries.
- Keep chess domain logic independent from React components.
- Keep engine communication behind a dedicated adapter.
- Keep storage behind repository interfaces.
- Keep animation scene data separate from the visual editor.
- Keep templates data-driven and versioned.
- Use small, cohesive modules and avoid unnecessary abstraction.
- Add automated tests for chess rules integration, PGN parsing, analysis normalisation, project persistence, timeline calculations, and export configuration.

---

## 9. Proposed Technical Direction

This section records the product-level technical direction. Exact package versions and implementation details should be verified during technical planning.

### 9.1 Application architecture

**Next.js App Router as a single full-stack application.**

The MVP does not require a separate Go, Node, or other backend service.

Use:

- Next.js for routing, UI, and limited server-side Route Handlers.
- Browser Web Workers for Stockfish and other CPU-intensive tasks.
- IndexedDB for local persistence.
- Browser media APIs for local preview and export.
- Next.js Route Handlers only when external API proxying or server-side access is necessary.

### 9.2 Proposed technology stack

| Layer                 | Technology                                        | Responsibility                                    |
| --------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Framework             | Next.js App Router                                | Application shell, routing, Route Handlers        |
| Language              | TypeScript                                        | Type-safe application and domain logic            |
| Styling               | Tailwind CSS v4                                   | Styling system                                    |
| UI components         | shadcn/ui                                         | Accessible interface primitives                   |
| State                 | Zustand                                           | Client-side UI and workflow state                 |
| Chess rules and PGN   | chess.js or a verified PGN parser                 | Move validation, positions, game state            |
| Chessboard            | Chessground or another compatible board component | Interactive board display                         |
| Engine                | Stockfish WebAssembly                             | Position evaluation and principal variations      |
| Worker                | Web Worker                                        | Isolated engine execution                         |
| Animation composition | Remotion components / Player                      | Scene composition and preview                     |
| Encoding              | WebCodecs where supported                         | Browser-side media encoding                       |
| Persistence           | IndexedDB                                         | Games, projects, templates, preferences           |
| Validation            | Zod or equivalent                                 | Runtime validation of external and persisted data |
| Testing               | Vitest and Playwright                             | Unit, integration, and end-to-end tests           |

Package licensing, compatibility, maintenance status, and production bundling requirements must be reviewed before final adoption.

### 9.3 Architectural boundaries

Suggested feature modules:

- `games` — import, source adapters, PGN, game metadata.
- `chess` — board state, move navigation, chess domain types.
- `analysis` — Stockfish adapter, evaluations, classifications, summaries.
- `studio` — project creation and editor workflow.
- `animation` — scene model, timing, transitions, camera, effects.
- `templates` — built-in and custom template definitions.
- `rendering` — preview, encoding, export capability detection.
- `storage` — IndexedDB schema, repositories, migrations, backup.
- `settings` — application preferences.

UI components should not directly issue UCI commands, perform raw IndexedDB transactions, or parse external source responses.

### 9.4 Suggested project structure

```text
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── analysis/
│   │   ├── studio/
│   │   ├── templates/
│   │   └── settings/
│   ├── api/
│   │   ├── chesscom/
│   │   └── lichess/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── features/
│   ├── games/
│   ├── chess/
│   ├── analysis/
│   ├── studio/
│   ├── animation/
│   ├── templates/
│   ├── rendering/
│   ├── storage/
│   └── settings/
│
├── workers/
│   └── stockfish.worker.ts
│
├── lib/
│   ├── validation/
│   ├── browser-capabilities/
│   └── utils/
│
└── types/
```

This is a suggested starting structure, not a requirement to create every folder before the corresponding feature exists.

### 9.5 Rendering architecture constraint

The rendering implementation is a major technical risk and must be validated early.

Before building the complete editor, create a technical proof of concept that:

1. Renders a chessboard scene.
2. Animates a legal move.
3. Produces a deterministic frame sequence.
4. Encodes a short video in the target browser.
5. Muxes the encoded video into a playable output container.
6. Produces a file that can be opened in common media players.
7. Reports unsupported codecs and browser capabilities.

Do not assume that Remotion Player alone exports MP4. The selected Remotion and WebCodecs integration must be verified against actual browser behaviour and package support.

If a reliable MP4 export cannot be achieved in the target browser, document a fallback decision before expanding the editor. Do not silently introduce a cloud backend, account system, or paid rendering service.

---

## 10. Core Data Concepts

The following are conceptual entities. Exact TypeScript schemas should be defined during implementation.

### 10.1 Game

Represents an imported chess game.

**Suggested fields:**

- `id`
- `source`
- `sourceReference`
- `metadata`
- `initialFen`
- `moves`
- `originalPgn`
- `createdAt`
- `updatedAt`

### 10.2 Move

Represents one ply in a game.

**Suggested fields:**

- `ply`
- `fullMoveNumber`
- `color`
- `san`
- `uci`
- `fenBefore`
- `fenAfter`
- `comment`
- `annotations`

### 10.3 PositionAnalysis

Represents an engine result for a position.

**Suggested fields:**

- `id`
- `gameId`
- `ply`
- `fen`
- `engineVersion`
- `engineConfiguration`
- `depth`
- `evaluation`
- `mate`
- `principalVariations`
- `bestMove`
- `createdAt`

### 10.4 MoveAssessment

Represents the application's interpretation of a played move.

**Suggested fields:**

- `gameId`
- `ply`
- `evaluationBefore`
- `evaluationAfter`
- `centipawnLoss`
- `classification`
- `candidateBrilliant`
- `explanationData`
- `confidenceOrCaveat`

### 10.5 VideoProject

Represents an editable video composition.

**Suggested fields:**

- `id`
- `name`
- `sourceGameId`
- `templateId`
- `projectVersion`
- `canvas`
- `frameRate`
- `scenes`
- `tracks`
- `assets`
- `createdAt`
- `updatedAt`

### 10.6 Scene

Represents one timed segment in a video project.

**Suggested fields:**

- `id`
- `type`
- `startTime`
- `duration`
- `moveRange`
- `boardState`
- `camera`
- `annotations`
- `textOverlays`
- `effects`
- `audioReferences`
- `overrides`

### 10.7 Template

Represents a reusable set of scene and style defaults.

**Suggested fields:**

- `id`
- `name`
- `description`
- `version`
- `isBuiltIn`
- `preview`
- `defaultCanvas`
- `defaultStyle`
- `sceneRules`
- `createdAt`
- `updatedAt`

### 10.8 ApplicationSettings

**Suggested fields:**

- `boardTheme`
- `pieceTheme`
- `defaultAspectRatio`
- `defaultResolution`
- `defaultFrameRate`
- `enginePreferences`
- `motionPreferences`

All persisted entities must include an explicit schema or migration version where needed.

---

## 11. Important User Flows

### 11.1 Import a game

```text
Dashboard
  → Import Game
  → Select source
  → Paste PGN / Upload file / Fetch public game
  → Validate PGN
  → Show import preview
  → Confirm import
  → Game Analysis
```

### 11.2 Analyse a game

```text
Game Analysis
  → Select analysis settings
  → Start Stockfish
  → Analyse positions
  → Review evaluation and variations
  → Review move classifications
  → Inspect critical moments
  → Create video
```

### 11.3 Create and export a video

```text
Game Analysis
  → Select full game or key moments
  → Create Video
  → Select template
  → Generate scenes
  → Open Video Studio
  → Edit timeline and scene properties
  → Preview
  → Select output format
  → Check browser export capability
  → Render
  → Download video
  → Save project
```

### 11.4 Save a custom template

```text
Video Studio
  → Customise project appearance
  → Save as Template
  → Enter template name
  → Save locally
  → Template appears in Templates
```

---

## 12. Error Handling and Edge Cases

The application must explicitly handle the following cases.

### 12.1 Import and game data

- Empty PGN input.
- Invalid PGN syntax.
- Illegal move in the sequence.
- Unsupported variant or non-standard starting position.
- Multiple games in one file.
- Very long game.
- Missing player names or metadata.
- Incomplete game.
- Network timeout or offline state.
- Unknown Chess.com or Lichess username.
- Rate-limited external API.
- Game unavailable or private.
- External API response format changes.

### 12.2 Engine

- Stockfish asset fails to load.
- Worker cannot start.
- Browser memory is insufficient.
- Unsupported engine option.
- User stops analysis.
- Engine returns a mate score.
- Analysis is incomplete.
- Position is invalid.
- Cached analysis was created with a different engine version or configuration.

### 12.3 Studio and animation

- Source game is missing or deleted.
- Scene references an invalid ply.
- Unsupported move or position.
- Timeline contains zero or negative duration.
- Audio asset is unavailable.
- Text exceeds safe area.
- User changes aspect ratio and existing layout no longer fits.
- Preview frame fails to render.

### 12.4 Persistence

- IndexedDB is unavailable.
- Browser storage quota is exceeded.
- Migration fails.
- Project data is corrupted.
- Backup file has an unsupported version.
- Restore would overwrite existing projects.

### 12.5 Export

- WebCodecs is unavailable.
- Requested codec is unsupported.
- Browser cannot mux the selected output container.
- Rendering runs out of memory.
- User cancels export.
- Audio encoding fails.
- Output file is empty or invalid.
- Page is closed during export.

For each error, provide a human-readable explanation and a practical recovery action where possible.

---

## 13. Acceptance Criteria

The MVP is acceptable when all P0 requirements and the following end-to-end criteria are satisfied.

### AC-01 — PGN import

- User can paste a valid PGN.
- User can upload a valid `.pgn` file.
- A valid game appears in the local game library.
- Invalid PGN produces a clear error without corrupting existing data.

### AC-02 — External game import

- User can retrieve and import a supported public game from Chess.com.
- User can retrieve and import a supported public game from Lichess.
- External service failures are displayed clearly.
- No private account credential is requested.

### AC-03 — Game replay

- The board shows the correct initial position.
- Next, previous, first, last, and direct move navigation work.
- Board state matches the selected ply.
- Check, checkmate, capture, castling, en passant, and promotion are represented correctly.

### AC-04 — Stockfish

- Stockfish loads in a worker.
- Analysis does not freeze the main interface.
- Evaluation and best move are displayed.
- Analysis can be stopped.
- Mate scores are represented separately from centipawn scores.
- Candidate classifications include appropriate caveats.

### AC-05 — Video project

- A project can be created from a complete game.
- A project can be created from selected moments.
- A built-in template can be applied.
- Generated scenes represent the intended moves and positions.
- Project changes can be saved and reopened locally.

### AC-06 — Timeline and preview

- User can select scenes.
- User can change scene duration.
- User can preview the sequence.
- Move animation and highlights match the underlying game state.
- Preview and export use the same scene model and timing rules.

### AC-07 — Export

- User can select each supported aspect ratio.
- Unsupported browser capabilities are detected and explained.
- A valid playable output file is produced for at least the primary supported browser configuration.
- Output dimensions and duration match the project settings within documented tolerances.
- Export cancellation and failure do not corrupt the project.

### AC-08 — Local persistence

- Games, projects, templates, and settings survive a normal page reload.
- Backup export and restore work.
- Storage errors are visible and do not silently discard user changes.

### AC-09 — Product constraints

- No authentication or account flow exists.
- No external database is required for the MVP.
- No cloud rendering service is required for the MVP.
- The main analysis and editing workflows work locally after the application has loaded, except when fetching external games or loading assets not yet cached.

---

## 14. Testing Strategy

### 14.1 Unit tests

**Cover:**

- PGN parsing and normalisation.
- Move sequence and FEN generation.
- Evaluation perspective conversion.
- Centipawn loss calculation.
- Move classification thresholds.
- Mate score handling.
- Timeline duration calculations.
- Scene generation from move ranges.
- Template application and overrides.
- Project serialization and migration.
- Export configuration validation.

### 14.2 Integration tests

**Cover:**

- Stockfish worker lifecycle and UCI communication.
- Game import adapters.
- IndexedDB repositories.
- Template persistence.
- Scene preview synchronisation.
- Browser capability detection.
- Encoding and container muxing.

### 14.3 End-to-end tests

At minimum:

1. Import a PGN and replay the game.
2. Analyse a game and inspect a selected move.
3. Create a video from a selected moment.
4. Apply and customise a template.
5. Save, reload, and reopen a project.
6. Export a short video in the primary supported browser.
7. Restore a project from a backup file.

Use deterministic fixture PGNs for automated tests. Avoid depending on live Chess.com or Lichess availability in routine CI tests.

---

## 15. Risks and Mitigations

| Risk                                              | Impact                                      | Mitigation                                                                            |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Browser video encoding and MP4 muxing limitations | Export may fail or vary by browser          | Build an export proof of concept in PH-0/PH-1; feature-detect and document support    |
| High Stockfish CPU and memory usage               | UI becomes slow or device overheats         | Use Web Worker, conservative defaults, cancellation, and configurable analysis limits |
| Large PGN or project data                         | Slow parsing and storage pressure           | Validate input, measure performance, use worker parsing if needed, and handle quotas  |
| External API changes or rate limits               | Chess.com/Lichess import becomes unreliable | Isolate source adapters, validate responses, handle retries and errors                |
| Move classification is subjective                 | Misleading analysis                         | Use documented heuristics and candidate labels; expose engine evidence                |
| Template schema changes                           | Old projects may fail to load               | Version templates and projects; implement migrations                                  |
| Browser storage can be cleared                    | User may lose local work                    | Provide backup and restore, plus clear local-storage warnings                         |
| Licensing of chess assets and media               | Legal or distribution risk                  | Review licences for Stockfish, board components, piece sets, fonts, and audio assets  |
| Remotion integration assumptions                  | Rendering architecture may be invalid       | Validate exact package capabilities before committing to the full editor              |

---

## 16. Product Decisions and Constraints

### 16.1 Agreed product decisions

The following decisions are considered agreed for this PRD:

| Topic                  | Decision                                                                          |
| ---------------------- | --------------------------------------------------------------------------------- |
| Product name           | ChessForge                                                                        |
| Primary purpose        | Game analysis and video creation are equally important                            |
| User model             | Single user                                                                       |
| Authentication         | Not required                                                                      |
| Backend                | No separate backend service for MVP                                               |
| Application framework  | Next.js                                                                           |
| Application language   | English                                                                           |
| Chess analysis         | Stockfish                                                                         |
| Import sources         | Manual PGN, PGN file, Chess.com, Lichess                                          |
| Video editor           | Full timeline-based editor                                                        |
| Templates              | Built-in templates plus custom templates                                          |
| Rendering direction    | Browser-based                                                                     |
| Rendering technologies | Remotion-related composition/preview and WebCodecs-based encoding where supported |
| Persistence            | IndexedDB                                                                         |
| UI direction           | Modern dark professional                                                          |
| Primary output formats | 9:16, 16:9, 1:1, 4:5                                                              |
| Deployment             | Docker/VPS with Coolify; basic auth at reverse proxy only                         |
| Reference browser      | Chrome/Edge on Linux desktop                                                      |
| Analysis board         | Chessground                                                                       |
| Studio board           | SVG renderer                                                                      |
| Audio assets           | CC0 SFX plus user-uploaded music                                                  |
| Backup format          | Versioned `.chessforge` ZIP                                                       |

### 16.2 Explicit constraints

- Do not introduce authentication.
- Do not introduce multi-user architecture.
- Do not add a separate backend unless a validated requirement makes it necessary.
- Do not add a cloud database for the MVP.
- Do not make cloud rendering a dependency.
- Do not treat Stockfish move labels as official Chess.com or Lichess labels.
- Do not promise universal MP4 export support before the browser pipeline has been validated.
- Do not over-engineer the architecture ahead of actual feature requirements.
- Coolify basic auth is an infrastructure protection, not an application account system.
- GPL-licensed dependencies are accepted only with documented licence obligations.
- Export must not exceed the documented duration and media limits.

---

## 17. Open Technical Questions for Implementation Planning

These questions do not block this product-level PRD, but must be resolved before or during the relevant implementation phase:

1. Which Stockfish WASM distribution and build configuration best balance strength, memory use, licensing, and browser compatibility?
2. Which PGN parser provides the required support for comments, NAGs, variations, and non-standard starting positions?
3. Which board component and piece assets meet the desired interaction, rendering, and licensing requirements?
4. What exact Remotion version and browser rendering approach will be used?
5. Which WebCodecs codecs and muxing library can reliably produce the required output container in target browsers?
6. What are the initial move-classification thresholds, and how will they be calibrated?
7. Which opening database will be bundled or queried, and what are its licensing and size implications?
8. What portable project and backup file format will be used?
9. What reference desktop hardware and browser versions will define performance testing?
10. Which audio and visual assets can be included with clear redistribution rights?

Each question should be resolved with a short technical decision record when it materially affects architecture or product behaviour.

### Resolution status (roadmap v1.0)

All ten questions are resolved or assigned to implementation ADRs in `docs/ROADMAP.md`:

1. Stockfish package: `stockfish` npm v19, single-thread default.
2. PGN parser: `@mliebelt/pgn-parser` plus `chess.js`.
3. Board component and assets: Chessground for analysis, SVG renderer for studio, cburnett piece set.
4. Remotion: Player plus `@remotion/web-renderer`, validated in R0 gate G1.
5. WebCodecs: MP4 H.264/AAC where supported, WebM fallback.
6. Classification thresholds: centralised documented configuration.
7. Opening database: bundled CC0 `lichess-org/chess-openings`.
8. Portable format: versioned `.chessforge` ZIP.
9. Reference hardware: Linux mid-range desktop, 16 GB RAM, integrated GPU.
10. Audio and visual assets: CC0 SFX, cburnett pieces, Geist fonts, user-provided music.

---

## 18. Definition of Done

A feature is complete only when:

- Its acceptance criteria are met.
- Types and runtime validation are in place at relevant boundaries.
- Loading, empty, success, and error states are implemented.
- Keyboard and accessibility basics are considered.
- Unit or integration tests cover important logic.
- No critical console errors remain in the relevant workflow.
- The feature works in a production build, not only in development mode.
- Documentation is updated where behaviour or setup has changed.
- No unrelated architecture or dependency complexity has been introduced.

---

## 19. Final Product Statement

ChessForge is a local-first chess analysis and video creation studio for a single user. Its core value is the connection between understanding a game and communicating its most interesting moments through polished chess animations.

The MVP should prioritise a reliable end-to-end workflow over a large collection of disconnected features:

**Import → Replay → Analyse → Select moments → Create scenes → Edit timeline → Preview → Export → Save locally.**

All implementation decisions should support that workflow while preserving performance, type safety, modularity, and a straightforward development experience.

---

## Document History

| Revision | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0      | Initial draft for implementation.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 1.1      | Structure revision: added front matter, table of contents, document guide, ID index, traceability and glossary; normalised heading hierarchy and numbering (all of §6, §12, §14, §16 subsections numbered); converted tables to standard Markdown (repaired misaligned rows G-08, BRD-010, ENG-009, PH-6, risk table, decisions table); renamed release phases P0–P6 to PH-0–PH-6 to avoid clashing with priority levels. No scope or requirement changes. |
