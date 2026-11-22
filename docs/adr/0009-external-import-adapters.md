# ADR 0009: External Import Adapters

- Status: Accepted
- Date: 2026-11-22

## Context

Chess.com and Lichess expose public game data. Browser CORS behaviour and API changes make a same-origin proxy safer than direct browser calls. The MVP must not request credentials.

## Decision

- Use Next.js Route Handlers as same-origin adapters.
- Chess.com endpoints:
  - `/pub/player/{username}/games/archives`
  - monthly archive URL
- Lichess endpoints:
  - `/api/games/user/{username}?max={max}` with PGN accept header
  - `/game/export/{id}` with PGN accept header
- Validate requests with Zod.
- Apply a 10 second timeout.
- Rate limit: 30 requests per minute for Chess.com, 20 for Lichess.
- Cache successful responses for 5 minutes.
- Convert to the internal `Game` model at the adapter boundary.
- Use fixtures in CI; live smoke is manual only.

## Consequences

The server is a thin proxy, not a data store. API changes are isolated to adapters. No credential or cookie is collected.

## Alternatives considered

- Direct browser requests: rejected because of CORS and rate-limit visibility.
- Storing external games server-side: conflicts with local-first.
