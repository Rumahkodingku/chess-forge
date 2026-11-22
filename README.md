# ChessForge

ChessForge is a single-user, local-first chess analysis and video creation studio. It is built with Next.js, runs Stockfish in the browser, and is designed to export chess videos without a cloud rendering service.

**Current status:** Phase R1 walking skeleton verified. Gates G0–G5 pass locally. The app imports a PGN, replays it, analyses a position, creates a 3-second scene, previews and exports WebM, saves the project, and reopens it after reload. R2 adds Chessground, file upload, and external sources.

## Requirements

- Node.js 24 LTS for Docker and CI.
- npm with the committed `package-lock.json`.
- A current Chrome or Edge desktop browser for the media proof.
- `ffprobe` is optional, used to validate exported files.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Biome lint and formatting check |
| `npm run format` | Format files with Biome |
| `npm run typecheck` | TypeScript strict check |
| `npm run test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright browser smoke tests |
| `npm run test:e2e:prod` | Production walking skeleton E2E |
| `npm run validate:video` | Validate an exported file with `ffprobe` |
| `npm run check:all` | Lint, typecheck, unit tests, and build |

## R1 walking skeleton

- `/analysis` imports one pasted PGN or the built-in fixture.
- `/analysis/[gameId]` replays moves and analyses the position before the selected move.
- `/studio` lists saved projects.
- `/studio/[projectId]` previews, saves, and exports one 3-second scene.

The project stores a game snapshot, so it remains renderable after the source game is removed.

## R0 technical labs

These pages are proof-of-concepts, not the daily workflow:

- `/labs/export` renders a five-second chess scene with Remotion and the browser media stack.
- `/labs/engine` loads Stockfish in a Web Worker and returns MultiPV analysis.
- `/labs/pgn` parses fixtures with comments, NAGs, variations, and FEN starts.

## Local data

Games, projects, templates, settings, and uploaded audio are stored in IndexedDB in the browser. The application does not have accounts, cloud project storage, or cloud rendering. Browser storage can be cleared, so backups are part of the release scope.

## Documentation

- `docs/PRD.md`: product requirements.
- `docs/ROADMAP.md`: phase plan, gates, and traceability.
- `docs/specs/R0-foundation.md`: R0 technical specification.
- `docs/adr/`: architecture decisions.
- `docs/THIRD_PARTY_NOTICES.md`: licences and attribution.
- `docs/evidence/R0/`: gate evidence.

## Deployment

The project includes a multi-stage Dockerfile for Coolify or a VPS. The runtime uses Next.js standalone output, a non-root user, and a healthcheck at `/api/health`. Basic auth is configured at the reverse proxy, not in the application.

```bash
docker build -t chessforge .
docker run --rm -p 3000:3000 chessforge
```

## Licences

Stockfish is GPL-3.0. Chessground is GPL-3.0-or-later and will be added in R2. Remotion is used under the free individual licence. cburnett pieces are CC BY-SA 3.0 with attribution. See `docs/THIRD_PARTY_NOTICES.md`.
