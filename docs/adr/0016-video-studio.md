# ADR 0016: Video Studio

- Status: Accepted
- Date: 2026-11-23

## Context

R4 delivered a deterministic scene renderer, but projects were created one move at a time and the studio could only preview an existing sequence. R5 needs project creation, templates, timeline editing, scene editing, audio upload, autosave, and persistence without splitting preview and export.

## Decision

- Bump the project model to v3 with a template snapshot, source selection, and source context.
- Keep scenes at v2 and keep IndexedDB at version 1.
- Normalise R1 v1 and R4 v2 projects to project v3 on read.
- Store a full template snapshot on the project so later template edits or deletes cannot rewrite existing videos.
- Define seven built-in templates in code and custom templates in the existing template store.
- Generate scenes from one of three source selections: full game, critical moments, or a contiguous range.
- Use three-ply grouping for full-game projects and moment blocks with configurable lead/trail plies.
- Apply templates in two explicit modes: style-only and scene regeneration.
- Keep timeline tracks as projections of scene-owned overlays, annotations, and project audio.
- Autosave with an 800 ms debounce; retain 20 undo snapshots.
- Preview and export continue to use `ProjectComposition`.

## Consequences

R5 projects can be regenerated from their stored source selection. R4 projects remain readable but have no template reset until a template is applied. Custom template edits do not alter existing projects. Scene edits need override keys so style application can preserve user changes. Autosave must clear pending timers and flush on unmount.

## Alternatives considered

- Store only `templateId` and resolve it at open time: smaller projects, but custom template edits or deletion would break reproducible reset.
- Bump IndexedDB: unnecessary because all required stores already exist.
- Regenerate template application only: simpler UI, but silently loses scene edits.
- Full NLE timeline: out of scope for R5; scene strip plus track rows meets TML-001 to TML-010.
