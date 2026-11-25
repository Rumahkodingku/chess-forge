# ChessForge

ChessForge is a single-user, local-first chess analysis and video creation studio. It imports games, replays and analyses them with Stockfish, builds chess videos in a browser studio, and exports the result without a cloud rendering service.

The application has no accounts, no cloud project storage, and no server-side user data. Games, analysis, projects, templates, audio, settings, and Chess Library data live in the browser.

## Status

Feature-complete through R8 (Chess Library). R7 release hardening covers the error matrix, full and single-project backup and restore, performance and accessibility checks, deployment documentation, and troubleshooting.

The seven-scenario release E2E suite and the Gate G11 evidence record are the remaining release steps. See `docs/ROADMAP.md` and `docs/specs/R7-hardening-and-release.md`.

## Requirements

- Node.js 24 LTS for development, CI, and Docker.
- npm with the committed `package-lock.json`.
- Current stable desktop Chrome or Edge for video export.
- `ffprobe` is optional and used by `npm run validate:video`.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build with standalone output |
| `npm run start` | Run `next start`; not used for the standalone deployment path |
| `npm run lint` | Biome lint and formatting check |
| `npm run format` | Format files with Biome |
| `npm run typecheck` | TypeScript strict check |
| `npm run test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright development suite |
| `npm run test:e2e:prod` | Build and run the production E2E suite |
| `npm run validate:video` | Validate an exported file with `ffprobe` |
| `npm run check:all` | Lint, typecheck, unit tests, and build |

## Workflow

1. **Import** a pasted PGN, a PGN file, or a public Chess.com or Lichess game.
2. **Replay** the game move by move and inspect the board, clocks, and move list.
3. **Analyse** with Stockfish, review classifications, critical moments, and the deterministic game summary.
4. **Create** a video project from a selected moment and apply a built-in or custom template.
5. **Edit** scenes, overlays, camera moves, audio, and the timeline in the Studio.
6. **Export** MP4 H.264/AAC where supported, or WebM VP9/VP8 with Opus.
7. **Save** the project locally and reopen it after a reload.

Projects store a game snapshot, so a project still renders after the source game is removed.

## Chess Library

`/library` is a local study workspace:

- **Openings** uses the bundled CC0 `chess-openings` move tree.
- **Repertoire** stores lines, notes, filters, and due reviews.
- **Practice** uses 5,000 CC0 Lichess puzzles with a due-first review queue.
- **My Games** filters local games, resolves the player side from Settings, and runs mistake drills.
- **Reference** contains 30 original strategy, tactics, middlegame, and endgame articles.

Library data is stored in IndexedDB v2 and works offline.

## Local data and backup

Browser storage can be cleared by the browser, by a profile reset, or by the user. Export a backup before clearing site data or changing devices.

- **Full application:** Settings → Storage → **Export backup** creates `chessforge-backup-YYYY-MM-DD.chessforge.zip`. **Import backup** validates the archive, replaces the local database in one transaction, and reloads.
- **Single project:** Studio → open a project → **Export project backup** creates `<project-slug>.chessforge`. Studio → **Import project backup** restores it. If the project ID already exists, choose **Restore as copy** or **Overwrite**. Overwrite requires a second confirmation.

The server keeps no copy of either archive. Browser data is scoped to the origin, so a domain, protocol, or port change creates an empty database. See `docs/deployment.md` for the archive layouts and the operating procedure.

## Deployment

The repository includes a multi-stage Dockerfile with Next.js standalone output, a non-root runtime user, and a healthcheck at `/api/health`.

```bash
docker build -t chessforge .
docker run --rm -p 3000:3000 chessforge
curl -fsS http://localhost:3000/api/health
```

Basic auth is configured at the reverse proxy, not in the application. No secret belongs in the repository.

For Coolify, standalone Node startup, TLS, basic auth, security headers, rate limits, and backup operations, read `docs/deployment.md`. For failure recovery, read `docs/troubleshooting.md`.

## Browser support

- Current stable desktop Chrome or Edge is the release target.
- MP4 H.264/AAC is used where the browser exposes the codecs.
- WebM VP9/VP8 with Opus is the portable fallback.
- Firefox and Safari are not release targets for video export.
- Export is capped at 15 minutes with a warning from 5 minutes. PGN files are capped at 5 MB, audio at 50 MB or 10 minutes per file, and project media at 250 MB.

The export panel detects codecs at runtime, disables unsupported formats, and shows the reason.

## Documentation

- `docs/PRD.md`: product requirements.
- `docs/ROADMAP.md`: phase plan, gates, and traceability.
- `docs/DESIGN.md`: design direction and tokens.
- `docs/deployment.md`: Docker, Coolify, proxy auth, TLS, headers, rate limits, health, and backup operations.
- `docs/troubleshooting.md`: storage, migration, backup, restore, engine, export, and deployment failures.
- `docs/specs/`: phase specifications, including R7 hardening and release.
- `docs/adr/`: architecture decisions and index.
- `docs/evidence/R7/`: error matrix, performance, and accessibility evidence.
- `docs/THIRD_PARTY_NOTICES.md`: licences and attribution.

## Licences

Stockfish is GPL-3.0. Chessground is GPL-3.0-or-later. Remotion is used under the Remotion Licence. The cburnett pieces are CC BY-SA 3.0 with attribution. See `docs/THIRD_PARTY_NOTICES.md` before distributing a build.
