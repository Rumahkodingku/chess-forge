# ADR 0004: PGN Parser

- Status: Accepted, subject to Gate G3
- Date: 2026-11-22

## Context

PGN support must preserve headers, comments, NAGs, variations, and non-standard starting FEN. The parser also needs to validate SAN and produce FEN snapshots for every move.

## Decision

- Use `@mliebelt/pgn-parser` for the PGN syntax tree.
- Use `chess.js` for legal move validation, SAN normalization, UCI conversion, and FEN generation.
- Convert parser output into the internal `Game` model at the import boundary.
- Preserve the original PGN text.
- Reject unsupported variants with a clear error.

## Consequences

The app has two focused libraries instead of one overloaded parser. The adapter must map parser fields (`notation.notation`, `commentAfter`, `nag`, `variations`) into the internal model. Failed imports report game, ply, and SAN where available.

## Alternatives considered

- `chess.js` alone: insufficient for variations and rich PGN annotations.
- A custom parser: unnecessary risk for a solved format.
