# ADR 0013: Game Import and Replay

- Status: Accepted
- Date: 2026-11-22

## Context

R2 must import real games from paste, file, Chess.com, and Lichess without weakening the R1 walking skeleton. The import flow must validate before writing, keep each game's original PGN, and replay positions read-only with annotations.

## Decision

- Use preview plus confirm for every source. Candidates are never persisted until confirmation.
- Store each game's own PGN, produced with the parser's `split()` utility, instead of attributing the whole input to every game.
- Add optional `Game.importWarnings`; no IndexedDB version bump is required.
- Decode files as UTF-8 with BOM support, fall back to Windows-1252 with a warning, and reject binary, empty, and oversized files.
- Return lightweight Chess.com monthly summaries and parse the selected game on demand. Lichess keeps its PGN conversion path.
- Use Chessground 9.2.1 as a client-only read-only replay board. Disable dragging and selection; keep drawing enabled for ephemeral arrows and squares.
- Clear annotations whenever the ply or orientation changes.
- Load the board theme from application settings and use the cburnett pieces from `public/pieces/cburnett`.
- Keep comments, NAGs, and variations in a read-only move detail panel.
- Compute captured pieces from the move history relative to the initial FEN.

## Consequences

The import workspace is the single entry point for four source adapters. Invalid candidates remain visible but are not selectable. Chessground adds a GPL-3.0-or-later dependency, documented in `docs/THIRD_PARTY_NOTICES.md`. External services are only contacted for public data and never receive credentials.

## Alternatives considered

- Import directly from each source: writes invalid games and makes partial failures harder to recover.
- Use the existing SVG board for replay: no built-in drawing, check highlighting, or piece animation.
- Parse every Chess.com game on the monthly request: slower and repeats work for games the user never selects.
