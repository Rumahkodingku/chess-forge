---
title: ChessForge — Phase R2 Game Import and Replay Specification
product: ChessForge
spec_version: "1.0"
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Implemented
last_updated: 2026-11-22
language: en
---

# ChessForge — Phase R2 Specification

R2 completes game import, validation, source integration, persistence, and replay. It builds on R1 without replacing the R1 end-to-end path.

The R1 skeleton remains the proof that a game can become a video. R2 makes game acquisition real: paste, file upload, Chess.com, Lichess, multi-game selection, and a Chessground replay board.

---

## 1. Purpose

R2 exists to deliver:

1. PGN paste import with headers, comments, NAGs, variations, and multi-game selection.
2. PGN file import with encoding and size handling.
3. Chess.com public game import.
4. Lichess public game import.
5. A reusable internal game model.
6. Game persistence and dashboard recent games.
7. Chessground replay with orientation, themes, check, last move, and annotations.
8. Move list, captured pieces, comment, NAG, and variation display.
9. Keyboard replay navigation.
10. Gate G6 evidence.

R2 passes only when Gate G6 passes.

---

## 2. Scope

### 2.1 In scope

- Tabs on `/analysis`: Paste, File, Chess.com, Lichess.
- Import preview and confirmation.
- Multi-game candidate list with search and a 200-game cap.
- File size, type, and encoding handling.
- Chess.com archive and monthly game adapters.
- Lichess username and game reference adapters.
- `Game.importWarnings`.
- Per-game `originalPgn`.
- Chessground integration.
- Board orientation toggle.
- Board themes: Forge and Classic.
- Move list, direct selection, and keyboard navigation.
- Captured pieces.
- Ephemeral arrow and square annotations.
- NAG, comment, and variation display.
- Dashboard recent games and import entry points.
- Unit, integration, and E2E tests.
- Gate G6 evidence.

### 2.2 Out of scope

- Chessground dragging and free-play variations.
- PGN file upload of multiple files.
- Chess.com and Lichess account authentication.
- Full Stockfish analysis UI.
- Move classifications, opening, phase, threat, and summary.
- Analysis cache and full-game analysis queue.
- Templates, timeline, scene editing, and audio track editor.
- Autosave.
- Backup and restore.
- Full game library pages.
- Universal browser support.

---

## 3. Approved decisions

| Topic | Decision |
| --- | --- |
| Import flow | Preview plus Confirm |
| Replay board | Chessground, read-only |
| Annotations | Ephemeral, cleared on ply or orientation change |
| Comments and variations | Show detail, read-only variation text |
| File encoding | UTF-8, BOM support, Windows-1252 fallback with warning |
| Multi-game list | Search plus 200-game cap |
| Board themes | cburnett pieces, Forge and Classic themes |
| Import UI | Tabs on `/analysis` |
| Dashboard | 5 recent games plus source entry points |
| Parser performance | Measure first, worker only if needed |
| Original PGN | Per game, from `split()` |
| External games | No credentials, attribution required |

---

## 4. User flow

```text
/analysis
  choose source tab
  paste, upload, or fetch
  -> candidate games
  -> search/select
  -> preview game
  -> confirm
  -> save to IndexedDB
  -> /analysis/[gameId]
  replay, navigate, annotate
  -> analyse or create scene
```

The flow must work without an account, cloud service, or external credential.

---

## 5. Import architecture

### 5.1 Shared import state

`/analysis` uses a client workspace with these states:

- `idle`
- `fetching`
- `ready`
- `previewing`
- `importing`
- `error`

The workspace holds:

- selected source
- candidate games
- selected candidate
- preview game
- search query
- warnings
- error

### 5.2 Source tabs

Tabs:

1. Paste
2. File
3. Chess.com
4. Lichess

Each tab feeds the same candidate list and preview panel.

### 5.3 Candidate model

```ts
export interface ImportCandidate {
  id: string;
  source: GameSource;
  sourceReference: string;
  pgn: string;
  metadata: GameMetadata;
  plyCount: number;
  warnings: string[];
  status: "valid" | "valid-with-warnings" | "invalid";
  error?: string;
}
```

Rules:

- A valid candidate can be selected and previewed.
- An invalid candidate is visible but cannot be selected.
- Candidate IDs are local to the import session.
- Candidates are not persisted until confirmation.
- The list is sorted by date, then event, then player names.

### 5.4 Candidate list

- Show up to 200 candidates.
- If there are more, show a warning and a search box.
- Search matches White, Black, event, site, result, round, and date.
- Selected candidate is visually marked and announced for screen readers.
- Multi-game selection is one game at a time.
- Empty candidate lists show a clear empty state.

### 5.5 Import preview

Preview shows:

- White and Black
- Result
- Event
- Site
- Date
- Round
- Time control
- ECO and opening, if available
- Ply count
- Warnings
- First 12 move SAN
- Confirm button
- Cancel button

Single valid candidate skips the list and shows preview immediately.

### 5.6 Confirm import

On confirm:

1. Parse the selected candidate if it has not already been parsed.
2. Validate with `gameSchema`.
3. Save with `GameRepository`.
4. Navigate to `/analysis/{game.id}`.

A failed save does not overwrite an existing game.

---

## 6. PGN paste

Rules:

- Uses the existing `parseSinglePgn` and `parsePgn` paths.
- Empty input shows inline validation.
- Invalid PGN shows parser error with game, ply, and SAN where available.
- Parser warnings set `importStatus: "valid-with-warnings"` and populate `importWarnings`.
- Valid PGN is converted before saving.
- Original PGN is preserved per game.

Multi-game input:

- Use `parseGames` and `split`.
- Each game retains its own original PGN.
- Invalid games appear in the candidate list as invalid.
- If no valid game exists, show one clear error.

---

## 7. PGN file import

### 7.1 File rules

- One file per import.
- Maximum size: 5 MB.
- Accepted type: `.pgn` or `text/plain`.
- Empty file: clear error.
- Binary content: clear error.
- No silent truncation.

### 7.2 Encoding

Decode in this order:

1. Strip UTF-8 BOM if present.
2. Try UTF-8 with fatal decoding.
3. If that fails, try Windows-1252.
4. If Windows-1252 decoding is used, add a warning to the imported game.
5. If neither decode succeeds, show a clear error.

### 7.3 Multi-game file

- Split the file into candidate games.
- Preserve original PGN per game.
- Show invalid games as invalid candidates.
- If all games are invalid, show one clear error.
- Candidate list uses the same search and 200-game cap.

---

## 8. Chess.com import

### 8.1 Route handlers

Existing routes remain:

- `GET /api/chesscom/archives?username={username}`
- `GET /api/chesscom/games?username={username}&year={year}&month={month}`

R2 adds a summary response from the monthly games route. It returns raw game summaries instead of parsing every game immediately.

Each summary contains:

- `url`
- `uuid`
- `rules`
- `white.username`
- `black.username`
- `white.result`
- `black.result`
- `time_class`
- `end_time`
- `pgn`

### 8.2 UI flow

1. Enter a public Chess.com username.
2. Load archives.
3. Select a month. Default to the latest archive.
4. Load games.
5. Search or select a game.
6. Preview the selected game.
7. Confirm import.

### 8.3 Validation and errors

- Username is validated.
- Archive month is validated.
- Only `rules: "chess"` games can be imported.
- Variants are excluded with a warning.
- Unknown username shows a clear error.
- Private or unavailable games show a clear error.
- Rate limits show retry guidance.
- Network timeout shows a retry action.
- Empty archive shows a clear empty state.

### 8.4 Attribution

The UI must identify Chess.com as an external service and must not imply official affiliation.

---

## 9. Lichess import

### 9.1 Route handlers

Existing routes remain:

- `GET /api/lichess/games?username={username}&max={max}`
- `GET /api/lichess/game/{id}`

### 9.2 UI flow for username

1. Enter a public Lichess username.
2. Set max games, default 20, range 1 to 50.
3. Load games.
4. Search or select a game.
5. Preview the selected game.
6. Confirm import.

### 9.3 UI flow for game reference

1. Enter a Lichess game ID or URL.
2. Load the game.
3. Preview it.
4. Confirm import.

### 9.4 Validation and errors

- Username and game ID are validated.
- `application/x-chess-pgn` is accepted.
- Unknown username shows a clear error.
- Unavailable or private game shows a clear error.
- Rate limits show retry guidance.
- Network timeout shows a retry action.
- Attribution identifies Lichess as an external service.

---

## 10. Data model changes

### 10.1 Game import warnings

Add an optional field to `Game`:

```ts
importWarnings?: string[];
```

Rules:

- Warnings are user-facing and persisted.
- `importStatus` becomes `valid-with-warnings` when warnings exist.
- Invalid games are not saved.
- Existing R0/R1 records remain valid because the field is optional.
- No IndexedDB version bump is required.

### 10.2 Per-game original PGN

`parsePgn` must use `split()` to preserve each game's original PGN. The whole input is never stored as every game's `originalPgn`.

### 10.3 Source reference

- File import: file name.
- Chess.com import: game URL.
- Lichess import: username and game URL or game ID.
- Paste import: `"paste"`.

### 10.4 Comments, NAGs, and variations

`Move` already stores:

- `comment?: string`
- `nags?: number[]`
- `variations?: string[]`

R2 must populate these from the parser. Variations remain read-only text in R2. Variation navigation is deferred to R4/R5.

---

## 11. Replay with Chessground

### 11.1 Dependency

- Package: `chessground` 9.2.1.
- Licence: GPL-3.0-or-later.
- Document the licence in `docs/THIRD_PARTY_NOTICES.md`.
- Chessground is client-only and must be loaded without SSR.

### 11.2 Board behaviour

- The board always matches the selected ply.
- Orientation can be White or Black.
- Last move is highlighted.
- Check and checkmate are indicated.
- Coordinates are shown.
- The board is read-only. Pieces cannot be moved by dragging.
- Arrow and square annotations are drawn by the user and cleared when the ply or orientation changes.

### 11.3 Themes

Two board themes:

| Theme | Light square | Dark square |
| --- | --- | --- |
| Forge | `#c9b28a` | `#5f4b39` |
| Classic | `#f0d9b5` | `#b58863` |

Piece set:

- cburnett from `public/pieces/cburnett`.
- No additional piece set is added in R2.

The board reads the selected theme from application settings. A theme change applies immediately without reloading the page.

### 11.4 Keyboard navigation

- Left arrow: previous move.
- Right arrow: next move.
- Home: first position.
- End: last position.
- Enter or Space activates the focused control.
- Escape closes dialogs and menus.

### 11.5 Move list

The move list shows:

- Move number.
- SAN.
- NAG badge.
- Comment indicator.
- Selected move.
- Direct selection.

Comments and NAGs are shown in a move detail panel, not in every row.

### 11.6 Captured pieces

Captured pieces are computed from the game moves up to the selected ply. They are displayed next to the player names using cburnett SVGs.

Rules:

- Standard captures are detected from the move history.
- En passant is handled.
- Promotion does not count as a capture.
- If the game starts from a non-standard FEN, captured pieces are computed relative to that FEN.
- No schema field is added for captured pieces.

### 11.7 Move detail

The selected move detail shows:

- SAN and UCI.
- Comment.
- NAG list with short labels.
- Variation lines as read-only text.
- FEN before and after.

Variation lines are not navigable in R2.

---

## 12. Dashboard

### 12.1 Recent games

- Show up to 5 recent games.
- Sort by `updatedAt`.
- Each row links to `/analysis/{game.id}`.
- Empty state links to `/analysis`.
- Loading and error states are visible.

### 12.2 Import entry points

Dashboard links to:

- `/analysis?source=paste`
- `/analysis?source=file`
- `/analysis?source=chesscom`
- `/analysis?source=lichess`

The `/analysis` page reads the `source` query parameter and selects the matching tab.

### 12.3 Recent project

Keep the existing recent project behaviour from R1.

---

## 13. Error handling

| Case | Required behaviour |
| --- | --- |
| Empty PGN | Inline validation, no candidate |
| Invalid PGN | Clear parser error, no candidate |
| Invalid single move | Game shown as invalid candidate, not selectable |
| Unsupported variant | Game shown as invalid or valid-with-warning per parser result |
| Empty file | Clear file error |
| Oversized file | Clear size error |
| Unsupported encoding | Clear encoding error |
| Binary file | Clear type error |
| Multi-game partial parse | Show valid and invalid candidates |
| Unknown Chess.com username | Clear error, retry action |
| Unknown Lichess username | Clear error, retry action |
| Private or unavailable game | Clear error, no credential requested |
| Rate limit | Clear error with retry guidance |
| Network timeout | Clear error with retry action |
| Empty archive | Clear empty state |
| Invalid game ID | Not-found state |
| Missing game | Not-found state |
| Chessground load failure | Recoverable error state |
| Invalid FEN | Clear error, no board crash |
| Storage failure | Visible storage error |

---

## 14. Testing

### 14.1 Unit tests

- Multi-game PGN produces one candidate per game.
- Each candidate retains its own original PGN.
- Invalid game is marked invalid.
- UTF-8 BOM is stripped.
- Windows-1252 fallback is detected and warned.
- Binary content is rejected.
- Empty file is rejected.
- NAG codes map to display labels.
- Captured pieces are correct for normal captures and en passant.
- Chess.com summary conversion.
- Lichess game conversion.
- Forge and Classic theme mapping.
- `importWarnings` persistence.

### 14.2 Integration tests

- File input produces candidates.
- Invalid file does not write to IndexedDB.
- External adapters parse fixtures.
- Rate-limit and timeout errors map correctly.
- Repository save and load round trip.
- Dashboard latest-game selector.

### 14.3 E2E tests

Dev suite:

- Paste one PGN and import.
- Paste multi-game PGN, select the second game, preview, confirm.
- File upload with a fixture.
- Chess.com mocked archives and games.
- Lichess mocked username and game reference.
- Invalid file.
- Chessground navigation.
- Orientation toggle.
- Arrow and square annotation.
- Captured pieces.
- R1 scene creation still works.

Production suite:

- Add an R2 production E2E test to `playwright.production.config.ts`.
- Run it in CI after the production build.
- Assert no horizontal overflow at 390 px.

Live smoke:

- One manual Chess.com import.
- One manual Lichess import.
- No credentials requested.

---

## 15. Gate G6 acceptance criteria

G6 passes only when:

- AC-01, AC-02, and AC-03 pass.
- Valid PGN can be pasted or uploaded.
- Chess.com and Lichess public games can be imported.
- Invalid input produces clear errors without corrupting existing data.
- Board position always matches the selected ply.
- Check, checkmate, capture, castling, en passant, and promotion display correctly.
- R1 E2E remains green after the import flow changes.
- Production E2E passes.
- No critical console errors.
- `npm run check:all` passes.

---

## 16. Task order

### 16.1 Wave 1: data and parsing

1. Add `importWarnings` to `Game`.
2. Split multi-game PGN and store per-game original PGN.
3. Implement file decoder and validation.
4. Add Chess.com summary conversion.
5. Keep Lichess PGN conversion.
6. Add parser and adapter unit tests.

### 16.2 Wave 2: import UI

1. Build tabs on `/analysis`.
2. Build candidate list and search.
3. Build import preview.
4. Build file upload.
5. Build Chess.com import flow.
6. Build Lichess import flow.
7. Add integration tests.

### 16.3 Wave 3: replay

1. Install and configure Chessground.
2. Build read-only Chessground board.
3. Add orientation toggle.
4. Add Forge and Classic themes.
5. Add move list, direct selection, and keyboard navigation.
6. Add captured pieces.
7. Add ephemeral annotations.
8. Add move detail with comment, NAG, and variations.
9. Add dashboard recent games and entry points.

### 16.4 Wave 4: gate

1. Update R1 E2E for preview/confirm.
2. Add R2 E2E tests.
3. Add production E2E.
4. Record Gate G6 evidence.
5. Update ADRs and ROADMAP R2 status.

---

## 17. Risks

| Risk | Mitigation |
| --- | --- |
| Chessground GPL implications | Licence notice and accepted decision |
| Chessground SSR issues | Client-only loading |
| Large PGN freezes UI | Measure first, worker if needed |
| Multi-game list performance | Search plus 200-game cap |
| External API changes | Isolated adapters, fixtures, retries |
| Per-game parse failure | Candidate status and warnings |
| Encoding false positives | UTF-8 fatal first, then Windows-1252 |
| R1 regression | Keep R1 E2E, update for preview |
| Chessground assets | cburnett files in `public` |
| Variant games | Filter and warn |

---

## 18. Definition of Done

R2 is done when:

- All R2 tasks are complete.
- Gate G6 passes.
- `npm run check:all` passes.
- `npm run test:e2e` passes.
- `npm run test:e2e:prod` passes.
- R1 walking skeleton remains green.
- Evidence is recorded.
- Documentation and roadmap status are updated.
- No R3 or R5 feature has been pulled into R2 without approval.

---

## 19. Handoff to R3

R2 hands R3:

- A real import pipeline.
- Persisted games with comments, NAGs, variations, and warnings.
- A Chessground replay board with orientation, themes, annotations, and captured pieces.
- A documented external adapter contract.
- A production E2E harness extended beyond R1.
- Evidence that import and replay work end to end.

R3 adds full Stockfish analysis, classifications, opening, phase, threat detection, and game summary.

---

*Generated from `docs/ROADMAP.md` v1.0 and approved user decisions on 2026-11-22.*
