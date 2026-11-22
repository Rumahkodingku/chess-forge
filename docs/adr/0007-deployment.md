# ADR 0007: Deployment

- Status: Accepted
- Date: 2026-11-22

## Context

The app is local-first but will be deployed to Docker/VPS with Coolify. The browser remains the data store; the server only serves the app and import proxies.

## Decision

- Use a multi-stage Docker build with `node:24-bookworm-slim`.
- Use Next.js `output: "standalone"`.
- Run as a non-root user.
- Expose port `3000`.
- Use `GET /api/health` as the healthcheck.
- Configure basic auth at Coolify.
- Apply route-level rate limits for external import proxies.
- Do not enable COOP/COEP in R0 because Stockfish is single-threaded.

## Consequences

No persistent server volume is required for user data. A public deployment should still be protected and rate-limited. Basic auth is infrastructure protection, not an application account system.

## Alternatives considered

- Vercel: viable, but the user selected Coolify.
- Static export: rejected because Route Handlers proxy external APIs.
- Live deployment in R0: deferred until access and domain are available.
