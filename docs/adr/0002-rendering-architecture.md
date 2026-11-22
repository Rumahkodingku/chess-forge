# ADR 0002: Rendering Architecture

- Status: Accepted, subject to Gate G1
- Date: 2026-11-22

## Context

The product needs a deterministic preview and a real browser export. Remotion Player alone is not an MP4 encoder. Remotion now publishes `@remotion/web-renderer`, which renders a React composition in the browser with WebCodecs and Mediabunny.

## Decision

- Use Remotion Player for preview.
- Use `@remotion/web-renderer` for export.
- Use SVG for the studio board so the renderer captures geometry natively.
- Use a separate Chessground board for interactive analysis in R2.
- Treat the renderer as the same composition model for preview and export.
- Validate the path in Gate G1 before expanding the editor.

## Consequences

Preview and export share one composition. The composition must stay within the client renderer's supported DOM/CSS subset. The project depends on Remotion licensing and the browser media stack.

## Alternatives considered

- Custom canvas renderer: more control, but significantly more video primitives to build.
- Remotion preview plus custom export: higher preview fidelity, but two render paths to keep aligned.
- Server-side Remotion: rejected because the product is local-first and has no cloud rendering dependency.
