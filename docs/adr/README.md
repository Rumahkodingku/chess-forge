# Architecture Decision Records

| ADR | Decision |
| --- | --- |
| [0001](0001-nextjs-version-and-runtime.md) | Next.js version and runtime |
| [0002](0002-rendering-architecture.md) | Remotion preview and browser renderer |
| [0003](0003-stockfish-build.md) | Stockfish package and variant |
| [0004](0004-pgn-parser.md) | PGN parser and validation |
| [0005](0005-storage-schema.md) | IndexedDB schema and repositories |
| [0006](0006-licensing.md) | Licensing and attribution |
| [0007](0007-deployment.md) | Docker and Coolify |
| [0008](0008-design-tokens.md) | Dark-first design tokens |
| [0009](0009-external-import-adapters.md) | Chess.com and Lichess proxies |
| [0010](0010-testing-and-ci.md) | Vitest, Playwright, and CI |
| [0011](0011-project-game-snapshot.md) | Project game snapshot |
| [0012](0012-production-e2e-gate.md) | Production E2E gate |
| [0013](0013-game-import-and-replay.md) | Game import and replay |
| [0014](0014-analysis-pipeline.md) | Analysis pipeline and heuristics |
| [0015](0015-animation-core.md) | Animation core |
| [0016](0016-video-studio.md) | Video studio |
| [0017](0017-export-pipeline.md) | Export pipeline |

## R7 decisions

R7 did not add a new architecture decision record. It extends accepted decisions
in ADR 0005 (storage and repositories) and ADR 0007 (deployment):

- Full application backup uses the `chessforge-backup` format version 1:
  `manifest.json`, `data.json`, and `assets/<asset-id>` in a ZIP.
- Single-project backup uses the `chessforge-project` format version 1:
  `manifest.json`, `project.json`, and referenced assets in a ZIP.
- Full-app restore validates every record before one write transaction.
- When the project ID already exists, single-project restore always asks
  **Restore as copy** or **Overwrite**; overwrite requires a second confirmation.
- The restore path uses one IndexedDB transaction and keeps the previous data if
  the transaction aborts.
- Basic auth remains a reverse-proxy control. The application adds no accounts
  or credentials.
- Stockfish stays single-threaded, so COOP/COEP remain disabled.
- Accessibility uses a pragmatic WCAG 2.1 AA checklist and Playwright tests; no
  axe dependency is added.

R8 added no ADR. The Chess Library reuses the existing storage, routing, and UI
patterns. Add a new ADR before changing an accepted decision. Keep the status
line current.
