# ADR 0014: Analysis Pipeline and Heuristics

- Status: Accepted
- Date: 2026-11-23

## Context

R3 adds full-game Stockfish analysis, cached position results, move classifications, opening and phase labels, threats, and a deterministic summary. The engine must stay responsive, results must survive reload, and heuristic labels must not read as objective truth.

## Decision

- Keep one browser worker and run full-game positions sequentially.
- Persist one `PositionAnalysis` per exact cache key and one `MoveAssessment` per game and ply.
- Keep IndexedDB at version 1; the stores already exist.
- Store evaluations in White perspective. Convert only for display.
- Use the documented 20/50/100/200 centipawn thresholds.
- Handle mate transitions separately; never convert mate distance to centipawn loss.
- Label Candidate Brilliant conservatively and require an explicit accept or reject.
- Vendor the CC0 opening dataset as generated JSON, index it by EPD, and lazy-load it.
- Use a heuristic phase boundary with a visible caveat.
- Build threats from one engine PV reply plus legal-move heuristics. Never claim exhaustive tactics.
- Derive the summary from persisted assessments; never call an engine to render it.

## Consequences

Full-game analysis can pause and resume without losing completed positions. Reload restores assessments and summary without engine work. The UI carries classification caveats. Opening data adds a lazy-loaded asset but no runtime network dependency.

## Alternatives considered

- Parse and analyse every position in parallel: faster on paper, but one worker cannot run parallel searches safely.
- Store only the final game summary: loses move evidence and cache reuse.
- Use chess.com or Lichess classifications: not local, not documented, and not reproducible.
- Treat mate scores as large centipawn values: distorts CPL and move labels.
