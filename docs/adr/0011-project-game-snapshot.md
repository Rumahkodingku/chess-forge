# ADR 0011: Project Game Snapshot

- Status: Accepted
- Date: 2026-11-22

## Context

A video project must be able to reproduce its scenes after the source game changes or is deleted. The PRD §6.4.2 requires project data independence. A `sourceGameId` alone is not enough.

## Decision

- Add an optional `gameSnapshot` to `VideoProject`.
- The snapshot contains metadata, initial FEN, and the ordered move list.
- R1 project creation always writes a snapshot.
- The scene references the selected move by ply and stores the FEN before the move.
- The composition reads the snapshot, never IndexedDB, during render.

## Consequences

Projects are slightly larger, but they are portable and independent. A missing source game no longer breaks preview or export. The field is optional, so existing projects remain valid.

## Alternatives considered

- Scene-only move fields: smaller, but insufficient for future multi-scene projects.
- Source game lookup: smallest, but violates project independence.
