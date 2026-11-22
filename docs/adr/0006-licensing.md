# ADR 0006: Licensing

- Status: Accepted
- Date: 2026-11-22

## Context

The project uses copyleft software, third-party chess assets, fonts, and a source-available video framework. The application is single-user and may be deployed behind basic auth.

## Decision

- Accept Stockfish GPL-3.0 and document the source offer.
- Accept Chessground GPL-3.0-or-later for R2.
- Use Remotion under the free individual licence with `licenseKey: "free-license"`.
- Use cburnett pieces under CC BY-SA 3.0 with attribution.
- Use the CC0 `chess-openings` dataset.
- Use generated CC0 SFX.
- Keep the licence inventory in `docs/THIRD_PARTY_NOTICES.md`.

## Consequences

The project must not be shared beyond the single-user owner without a licence review. Copyleft obligations travel with distributed builds. Attribution is part of the release checklist.

## Alternatives considered

- MIT-only board and engine: not possible for Stockfish. MIT board alternatives exist but were rejected by the user.
- Commercial Remotion licence: not needed for the current single-user use.
