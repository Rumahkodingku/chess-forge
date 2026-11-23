# ADR 0017: Export Pipeline

- Status: Accepted
- Date: 2026-11-23

## Context

R0 proved browser export. R5 produced real projects but export settings were limited and the renderer wrote directly to an in-memory Blob without validating the result. R6 needs configurable output, large-project handling, cancellation, and evidence that the file is playable.

## Decision

- Keep project aspect ratio and frame rate as project-level values. Export may change them through undoable project operations.
- Resolution and quality are export-only. 720p and 1080p use fixed per-aspect dimensions; quality maps to Remotion bitrate presets.
- Use three format options: MP4 H.264/AAC, WebM VP9/Opus, and WebM VP8/Opus. Detect capability per format and auto-select the first supported option.
- Render a frozen project snapshot while the editor stays usable.
- Use OPFS `web-fs` output for projects at least 60 seconds long when supported, with arraybuffer fallback.
- Validate the rendered file with Mediabunny before exposing a download.
- Preserve the R1 export flow and labels.
- Keep export configuration in component state, initialized from application settings.

## Consequences

Long exports avoid a single large in-memory buffer on supported browsers. Validation can fail an export that renders but has the wrong container, dimensions, duration, codec, or missing audio. FPS changes alter duration in seconds because scene frame counts are not resampled. The project schema does not change. MP4 support remains browser-dependent and is validated manually in Chrome stable.

## Alternatives considered

- Export-only aspect/FPS overrides: preview and export would drift or require a second timing model.
- Always arraybuffer: simpler, but risks memory pressure on long 1080p exports.
- File System Access picker: good streaming path, but difficult to exercise in Playwright and adds picker cancellation states.
- Trust the renderer without validation: cheaper, but fails AC-07 evidence for dimensions, duration, and audio.
