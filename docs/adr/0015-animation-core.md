# ADR 0015: Animation Core

- Status: Accepted
- Date: 2026-11-23

## Context

R4 needs deterministic preview and export from the same scene model. R1 stored one fixed scene and rendered one SVG board. R5 will add project creation, templates, and timeline editing, so R4 must provide stable animation primitives without absorbing the editor.

## Decision

- Version the scene model at v2 with contiguous multi-move ranges and frame timing.
- Store project audio at project level and semantic move SFX at scene level.
- Derive every visual state from frame numbers. No wall-clock or random animation.
- Use one SVG board renderer for preview and export.
- Use camera keyframes with normalised focus offsets, easing, and safe clamping.
- Use curated text tokens: Geist display/body, Geist Mono, and a small colour palette.
- Use one `ProjectComposition` for Remotion Player preview and `@remotion/web-renderer` export.
- Normalise v1 projects to v2 at the repository boundary without changing the IndexedDB version.
- Keep timeline editing, templates, and audio upload in R5.

## Consequences

R1 projects remain openable. Scene timing and board state are unit-testable without React. R5 can edit scenes and audio without introducing a second renderer. The scene schema is larger than R1 and requires migration tests.

## Alternatives considered

- One move per scene: simpler renderer, but fails multi-move analysis/recap scenes and the scene `moveRange` model.
- Separate preview and export renderers: faster to build, but visual drift and duplicate fixes.
- Store audio only on scenes: simple, but music and timeline audio need project-level timing.
- Bump IndexedDB: unnecessary because normalisation can run at the repository boundary.
