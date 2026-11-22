# Gate G4 Evidence: Deployment and Licensing

- Date: 2026-11-22
- Environment: Docker 29.9.3, Linux
- Status: PASS for local build, live Coolify deployment pending access

## Docker

```text
docker build -t chessforge:r0 .
```

Result: build completed successfully. The image exposes port 3000 and runs as the non-root `nextjs` user.

## Container smoke test

| Check | Result |
| --- | --- |
| Container starts | PASS |
| `/api/health` | HTTP 200 |
| `/dashboard` | HTTP 200 |
| Docker healthcheck | `healthy` after the start period |

## Rate limiting

The Chess.com archives route returned:

- 30 responses with HTTP 400 for an invalid username
- 1 response with HTTP 429 on the 31st request

## Coolify

The deployment is documented in `README.md`, `docs/adr/0007-deployment.md`, and `docs/specs/R0-foundation.md`.

Basic auth is configured at the Coolify reverse proxy, not in the application. It was not applied live because no Coolify instance or domain was connected in this environment.

## Licences

`docs/THIRD_PARTY_NOTICES.md` records:

- Stockfish GPL-3.0 and source offer
- Chessground GPL-3.0-or-later
- Remotion licence and free individual use
- cburnett CC BY-SA 3.0
- chess-openings CC0 1.0
- generated SFX CC0 1.0
- Geist OFL

## Notes

Before a public deployment, apply Coolify basic auth and re-check the licence position for any user other than the single owner.
