---
title: ChessForge — Phase R0 Foundation and Technical Gates Specification
product: ChessForge
spec_version: "1.0"
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Ready for implementation
last_updated: 2026-11-22
language: en
---

# ChessForge — Phase R0 Specification

This document specifies Phase R0 of the ChessForge roadmap. It defines the foundation, proof-of-concepts, gates, contracts, data schemas, and evidence required before Phase R1 (Walking Skeleton) can begin.

R0 does not implement user-facing chess features. It establishes the application shell, design system, domain model, storage foundation, technical proof-of-concepts, deployment baseline, and licensing controls.

---

## 1. Purpose

R0 exists to remove the highest-risk technical uncertainties before feature implementation:

1. Browser-based video export with Remotion and WebCodecs.
2. Stockfish execution in a Web Worker.
3. PGN parsing with comments, NAGs, variations, and non-standard FEN.
4. External game import adapters.
5. Docker/Coolify deployment and licence compliance.

R0 is complete only when gates G0–G4 pass and their evidence is recorded.

---

## 2. Scope

### 2.1 In scope

- Next.js 16 application shell and routing.
- Dark-only design system with amber accent.
- Domain types and Zod validation.
- IndexedDB storage foundation.
- Asset pipeline and licence documentation.
- Export proof-of-concept (G1).
- Engine proof-of-concept (G2).
- PGN proof-of-concept (G3).
- Chess.com and Lichess adapter proof-of-concept.
- Docker build and deployment documentation (G4).
- Unit, integration, and E2E smoke tests.
- ADR index and evidence records.

### 2.2 Out of scope

- Game import UI beyond route placeholders.
- Full game replay UI.
- Full Stockfish analysis UI.
- Scene editor, timeline, templates, and export UI.
- Cloud rendering, accounts, and multi-user features.
- Universal browser/codec support.

### 2.3 Source of truth

- Product scope: `docs/PRD.md`.
- Sequencing and gates: `docs/ROADMAP.md`.
- Implementation details: this specification.
- Technical decisions: `docs/adr/`.

---

## 3. Phase outcomes and gates

### 3.1 G0 — Foundation

Pass when:

- Application shell runs in development and production.
- Navigation works on desktop and mobile widths.
- Design tokens are applied to the root layout.
- TypeScript strict mode passes.
- Biome lint passes.
- Unit test runner executes successfully.

Evidence:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- Screenshot of shell at desktop and mobile widths.

### 3.2 G1 — Export feasibility

Pass when:

- A five-second 1080p video renders in Chrome or Edge on Linux.
- Both 9:16 and 16:9 are tested.
- WebM VP9/Opus or VP8/Opus is produced.
- MP4 H.264/AAC is produced where `canRenderMediaOnWeb` reports support.
- Audio is present.
- Cancellation works without producing a corrupt file.
- Capability matrix is recorded.
- Render time and peak memory are recorded.

### 3.3 G2 — Engine feasibility

Pass when:

- Stockfish loads in a Web Worker in a production build.
- UCI communication works.
- MultiPV of at least three is returned.
- Mate scores are distinguished from centipawn scores.
- Analysis can be stopped.
- No main-thread freeze is observed.
- Cache key format is documented and tested.

### 3.4 G3 — PGN feasibility

Pass when:

- All required fixture types parse or fail with useful errors.
- Comments, NAGs, variations, non-standard FEN, and multiple games are handled.
- Invalid SAN produces a clear error.
- Original PGN is preserved.
- No HTML injection is possible from PGN text.

### 3.5 G4 — Deployment and licensing

Pass when:

- Docker build succeeds.
- Container starts and healthcheck passes.
- Coolify deployment steps are documented.
- Basic auth and rate limiting are configured.
- Licence inventory is complete.
- Stockfish source offer is available.

---

## 4. Architecture and directory structure

### 4.1 Proposed R0 structure

```text
docs/
  PRD.md
  ROADMAP.md
  specs/
    R0-foundation.md
  adr/
    0001-nextjs-version-and-runtime.md
    0002-rendering-architecture.md
    0003-stockfish-build.md
    0004-pgn-parser.md
    0005-storage-schema.md
    0006-licensing.md
    0007-deployment.md
    0008-design-tokens.md
    0009-external-import-adapters.md
    0010-testing-and-ci.md
  evidence/
    R0/
      gate-g0.md
      gate-g1.md
      gate-g2.md
      gate-g3.md
      gate-g4.md
  THIRD_PARTY_NOTICES.md

scripts/
  validate-video.mjs

src/
  app/
    (app)/
      dashboard/page.tsx
      analysis/page.tsx
      studio/page.tsx
      templates/page.tsx
      settings/page.tsx
      layout.tsx
    api/
      health/route.ts
      chesscom/
        archives/route.ts
        games/route.ts
      lichess/
        games/route.ts
        game/[id]/route.ts
    layout.tsx
    page.tsx
    globals.css
    error.tsx
    not-found.tsx
    loading.tsx

  components/
    ui/
    layout/
      app-shell.tsx
      sidebar-nav.tsx
      topbar.tsx
      empty-state.tsx
    shared/

  features/
    games/
      types.ts
      validation.ts
      adapters/
        chesscom.ts
        lichess.ts
      fixtures/
    chess/
      types.ts
      validation.ts
    analysis/
      engine/
        stockfish-adapter.ts
        stockfish.types.ts
        uci.ts
      types.ts
      validation.ts
    studio/
      scene/
        scene.types.ts
        scene.validation.ts
      rendering/
        export-poc.tsx
        board-svg.tsx
    templates/
      types.ts
      validation.ts
    storage/
      db.ts
      repositories.ts
      migrations.ts
      quota.ts
      validation.ts
    settings/
      types.ts
      validation.ts

  lib/
    utils.ts
    navigation.ts
    http.ts
    rate-limit.ts
    browser-capabilities.ts
    validation.ts

  workers/
    stockfish.worker.ts

  types/
    index.ts

public/
  pieces/
    cburnett/
  audio/
    sfx/
  engine/
    stockfish/

.github/
  workflows/
    ci.yml

Dockerfile
.dockerignore
.nvmrc
```

### 4.2 Layer boundaries

- Route Handlers parse and validate external data, then return internal models.
- UI components never issue UCI commands.
- UI components never perform raw IndexedDB transactions.
- Engine communication is behind `StockfishEngine`.
- Storage access is behind repository interfaces.
- Scene data is separate from editor state.

---

## 5. Cross-cutting engineering requirements

### 5.1 Language and tooling

- TypeScript strict mode.
- No `any`.
- Biome formatting and linting.
- Tailwind CSS v4.
- Next.js 16.4.6.
- Node.js 24 LTS for Docker and CI.
- Local development may use Node.js 26, but lockfile and builds must remain compatible with Node 24.

### 5.2 Validation

- Zod schemas exist for all external and persisted data.
- Runtime validation occurs at import boundaries, Route Handlers, storage reads, and backup restore.
- Invalid data produces typed errors with stable error codes.

### 5.3 Error handling

- Use typed application errors, for example:
  - `ValidationError`
  - `NetworkError`
  - `RateLimitError`
  - `StorageUnavailableError`
  - `StorageQuotaError`
  - `StorageMigrationError`
  - `UnsupportedCapabilityError`
- Errors must be human-readable and actionable.
- Worker errors must be surfaced to the UI.

### 5.4 Accessibility

- Keyboard navigation for primary flows.
- Visible focus states.
- Accessible names for controls.
- Reduced-motion support in application UI.
- Colour is not the only status indicator.

### 5.5 Security and privacy

- No accounts or authentication flows.
- External requests limited to Chess.com and Lichess.
- PGN and external responses treated as untrusted.
- Imported text is never injected as HTML.
- Route Handlers validate input and apply rate limits.
- File names and output names are sanitised.
- Basic auth is configured at Coolify, not in application code.

### 5.6 Licensing

- Stockfish: GPL-3.0, include licence and source offer.
- Chessground: GPL-3.0-or-later, document implications.
- Remotion: use `licenseKey: "free-license"` for eligible individual use.
- cburnett pieces: CC BY-SA 3.0 with attribution.
- chess-openings: CC0 1.0.
- SFX: CC0 or equivalent with documented source.
- Geist fonts: OFL.

---

## 6. Design system

### 6.1 Visual direction

- Dark-only.
- Modern professional, restrained colour.
- `docs/DESIGN.md` provides structure, spacing, typography, border, and component discipline.
- Colour palette is ChessForge-specific.

### 6.2 Design tokens

```css
:root {
  color-scheme: dark;

  --background: #0a0a0b;
  --surface-1: #111113;
  --surface-2: #17171a;
  --surface-3: #1f1f23;
  --border: #2a2a30;
  --border-strong: #3a3a42;

  --text: #ededf0;
  --text-muted: #a1a1aa;
  --text-subtle: #71717a;

  --accent: #e8b45a;
  --accent-hover: #f2c46f;
  --accent-foreground: #1a1205;

  --success: #3fb950;
  --warning: #d29922;
  --error: #f85149;
  --info: #58a6ff;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
}
```

### 6.3 Typography scale

| Token       | Size | Weight | Line height |
| ----------- | ---: | -----: | ----------: |
| display     | 64px |    600 |        1.05 |
| hero        | 48px |    600 |        1.08 |
| headline-lg | 32px |    600 |        1.15 |
| title-lg    | 24px |    600 |        1.20 |
| title-md    | 20px |    600 |        1.25 |
| title-sm    | 16px |    600 |        1.35 |
| body        | 16px |    400 |        1.60 |
| label       | 14px |    500 |        1.40 |
| button      | 14px |    500 |        1.20 |
| caption     | 13px |    400 |        1.45 |
| code        | 14px |    400 |        1.55 |

### 6.4 Spacing and breakpoints

- Spacing: 4, 8, 12, 16, 24, 32, 48, 64.
- Breakpoints: 640, 768, 1024, 1280, 1440.
- Border width: 1px default, 2px for focus.
- Shadow: minimal; prefer borders and spacing.

### 6.5 Motion

- Durations: 120ms, 180ms, 240ms.
- Easing: standard cubic-bezier for UI.
- Respect `prefers-reduced-motion`.

### 6.6 Component inventory

R0 must provide:

- Button
- Input
- Textarea
- Select
- Dialog
- Sheet
- Tabs
- Tooltip
- Dropdown menu
- Progress
- Separator
- Badge
- Card
- Scroll area
- Skeleton
- Alert
- Toast via Sonner
- Empty state

### 6.7 Application shell

Routes:

- `/` redirects to `/dashboard`.
- `/dashboard`
- `/analysis`
- `/studio`
- `/templates`
- `/settings`

Shell components:

- `AppShell`
- `SidebarNav`
- `Topbar`
- `EmptyState`

Shell behaviour:

- Desktop sidebar.
- Mobile sidebar in a sheet.
- Active route highlighting.
- Storage status indicator placeholder.
- Skip link to main content.
- Error, loading, and not-found states.

---

## 7. Domain model and validation

### 7.1 Core types

```ts
export type GameSource =
  | "pgn-text"
  | "pgn-file"
  | "chesscom"
  | "lichess";

export interface GameMetadata {
  white: string;
  black: string;
  result: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  timeControl?: string;
  eco?: string;
  opening?: string;
  whiteElo?: number;
  blackElo?: number;
  termination?: string;
}

export interface Move {
  ply: number;
  fullMoveNumber: number;
  color: "w" | "b";
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  comment?: string;
  nags?: number[];
  variations?: string[];
}

export interface Game {
  id: string;
  source: GameSource;
  sourceReference?: string;
  metadata: GameMetadata;
  initialFen: string;
  moves: Move[];
  originalPgn: string;
  importStatus: "valid" | "valid-with-warnings" | "invalid";
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
```

```ts
export type Evaluation =
  | { type: "cp"; value: number; perspective: "white" }
  | { type: "mate"; value: number; perspective: "white" };

export interface PrincipalVariation {
  multipv: number;
  score: Evaluation;
  pv: string[];
  depth: number;
  nodes?: number;
  nps?: number;
}

export interface EngineConfiguration {
  depth?: number;
  movetimeMs?: number;
  multiPv: number;
  threads: number;
  hashMb: number;
  perspective: "white";
}

export interface PositionAnalysis {
  cacheKey: string;
  gameId?: string;
  ply?: number;
  fen: string;
  engineVersion: string;
  engineConfiguration: EngineConfiguration;
  depth: number;
  score: Evaluation;
  bestMoveUci?: string;
  principalVariations: PrincipalVariation[];
  createdAt: string;
  schemaVersion: number;
}
```

```ts
export type MoveClassification =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "candidate-brilliant";

export interface MoveAssessment {
  id: string;
  gameId: string;
  ply: number;
  evaluationBefore: Evaluation;
  evaluationAfter: Evaluation;
  centipawnLoss?: number;
  classification: MoveClassification;
  candidateBrilliant: boolean;
  confidence: "low" | "medium" | "high";
  caveat?: string;
  createdAt: string;
  schemaVersion: number;
}
```

```ts
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export interface CanvasSettings {
  aspectRatio: AspectRatio;
  width: number;
  height: number;
}

export type SceneType = "intro" | "move" | "analysis" | "recap" | "outro";

export interface Scene {
  id: string;
  type: SceneType;
  startFrame: number;
  durationInFrames: number;
  moveRange?: { fromPly: number; toPly: number };
  boardState: {
    fen: string;
    orientation: "w" | "b";
    lastMove?: string;
  };
  camera: {
    zoom: number;
    x: number;
    y: number;
  };
  annotations: Array<{
    type: "arrow" | "square" | "highlight";
    from?: string;
    to?: string;
    square?: string;
    color: string;
  }>;
  textOverlays: Array<{
    id: string;
    kind: "title" | "move-label" | "explanation" | "caption";
    text: string;
    position: "top" | "bottom" | "left" | "right";
    startFrame: number;
    durationInFrames: number;
  }>;
  effects: {
    lastMoveHighlight: boolean;
    checkIndicator: boolean;
    captureEmphasis: boolean;
    glow: boolean;
  };
  audioReferences: Array<{
    assetId: string;
    startFrame: number;
    durationInFrames: number;
    volume: number;
  }>;
  overrides: Record<string, unknown>;
  schemaVersion: number;
}
```

```ts
export interface VideoProject {
  id: string;
  name: string;
  sourceGameId?: string;
  templateId: string;
  projectVersion: number;
  canvas: CanvasSettings;
  frameRate: 30 | 60;
  scenes: Scene[];
  tracks: {
    text: string[];
    annotation: string[];
    audio: string[];
  };
  assets: Array<{
    id: string;
    kind: "audio" | "image";
    mimeType: string;
    size: number;
    hash: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
```

```ts
export interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  isBuiltIn: boolean;
  preview?: string;
  defaultCanvas: CanvasSettings;
  defaultStyle: Record<string, unknown>;
  sceneRules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface ApplicationSettings {
  boardTheme: string;
  pieceTheme: string;
  defaultAspectRatio: AspectRatio;
  defaultResolution: "720p" | "1080p";
  defaultFrameRate: 30 | 60;
  enginePreferences: EngineConfiguration;
  motionPreferences: {
    reducedMotion: boolean;
  };
  schemaVersion: number;
}
```

### 7.2 Validation rules

- All persisted entities include `schemaVersion`.
- Zod schemas use explicit object shapes; unknown keys are rejected where possible.
- FEN strings are validated by `chess.js`.
- UCI moves are validated by `chess.js`.
- File sizes are validated before processing.
- External API responses are validated before conversion.

---

## 8. Storage specification

### 8.1 Database

- Database name: `chessforge`.
- Version: `1`.
- Library: `idb`.
- All writes occur through repository methods.

### 8.2 Object stores

| Store              | Key path   | Indexes                                              |
| ------------------ | ---------- | ---------------------------------------------------- |
| `games`            | `id`       | `createdAt`, `updatedAt`, `source`, `white`, `black` |
| `positionAnalyses` | `cacheKey` | `gameId`, `ply`, `fen`, `createdAt`                  |
| `moveAssessments`  | `id`       | `gameId`, `ply`                                      |
| `projects`         | `id`       | `createdAt`, `updatedAt`                             |
| `templates`        | `id`       | `isBuiltIn`, `updatedAt`                             |
| `assets`           | `id`       | `hash`, `mimeType`, `createdAt`                      |
| `settings`         | `key`      | none                                                 |
| `meta`             | `key`      | none                                                 |

### 8.3 Repository interfaces

```ts
export interface GameRepository {
  getById(id: string): Promise<Game | undefined>;
  list(): Promise<Game[]>;
  save(game: Game): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProjectRepository {
  getById(id: string): Promise<VideoProject | undefined>;
  list(): Promise<VideoProject[]>;
  save(project: VideoProject): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TemplateRepository {
  getById(id: string): Promise<Template | undefined>;
  list(): Promise<Template[]>;
  save(template: Template): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AssetRepository {
  getById(id: string): Promise<AssetRecord | undefined>;
  findByHash(hash: string): Promise<AssetRecord | undefined>;
  save(asset: AssetRecord, data: Blob): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<ApplicationSettings>;
  save(settings: ApplicationSettings): Promise<void>;
}
```

### 8.4 Migration rules

- Schema version is stored in `meta` under key `schemaVersion`.
- `upgrade(db, oldVersion, newVersion, transaction)` handles all migrations.
- Migrations are additive where possible.
- Failed migrations throw `StorageMigrationError`.
- Migration tests cover previous schema versions.

### 8.5 Quota handling

- Call `navigator.storage.estimate()` when available.
- Request persistent storage with `navigator.storage.persist()` where supported.
- Display storage status in settings.
- Never claim browser storage is permanent.

---

## 9. Asset pipeline

### 9.1 Built-in assets

| Asset type | Location                   | Licence           |
| ---------- | -------------------------- | ----------------- |
| Piece set  | `public/pieces/cburnett/`  | CC BY-SA 3.0      |
| SFX        | `public/audio/sfx/`        | CC0 or equivalent |
| Engine     | `public/engine/stockfish/` | GPL-3.0           |
| Fonts      | Next.js font optimisation  | OFL               |

### 9.2 Asset requirements

- Built-in SFX must include move, capture, check, and checkmate sounds.
- SFX source URLs and licences must be recorded in `docs/THIRD_PARTY_NOTICES.md`.
- Engine files must be copied from the selected Stockfish package.
- Piece set files must be attributed.
- Assets must load without 404s in production.

### 9.3 Runtime assets

- User-uploaded audio is stored in IndexedDB `assets`.
- Audio metadata is stored in the project.
- Audio blobs are deduplicated by hash.
- Asset deletion must not corrupt projects that reference them; show a warning.

---

## 10. Export proof-of-concept (G1)

### 10.1 Composition

- Width: 1080.
- Height: 1920 for 9:16; 1080 for 16:9.
- Frame rate: 30.
- Duration: 5 seconds, 150 frames.
- Scene: SVG chessboard, start position, animated `e2e4`, title overlay, one move SFX.

### 10.2 Implementation requirements

- Use Remotion Player for preview.
- Use `@remotion/web-renderer` for export.
- Use `canRenderMediaOnWeb` before rendering.
- Use `AbortController` for cancellation.
- Use `outputWritable` or Origin Private File System for large output.
- Report progress.
- Release temporary media resources.

### 10.3 Codec matrix

| Container | Video codec | Audio codec | Requirement              |
| --------- | ----------- | ----------- | ------------------------ |
| MP4       | H.264       | AAC         | Required where supported |
| WebM      | VP9         | Opus        | Required fallback        |
| WebM      | VP8         | Opus        | Required fallback        |

### 10.4 Validation

- Mediabunny metadata inspection.
- `ffprobe` validation for duration, dimensions, codecs, and audio track.
- Manual playback in VLC or browser.
- Cancel test after approximately one second.
- Capability matrix recorded.
- Render time and memory recorded.

### 10.5 Gate G1 evidence

- Exported MP4 or WebM file.
- Capability matrix.
- Render time and memory.
- Cancel test result.
- Validation output.

---

## 11. Stockfish proof-of-concept (G2)

### 11.1 Package and variant

- Package: `stockfish` npm v19.
- Initial variant: `lite-single`.
- Compare with `single` only if strength or correctness is insufficient.

### 11.2 Worker interface

```ts
export interface StockfishEngine {
  load(): Promise<void>;
  setOption(name: string, value: string | number): void;
  analyse(request: {
    fen: string;
    depth?: number;
    movetimeMs?: number;
    multiPv?: number;
  }): Promise<PositionAnalysis>;
  stop(): void;
  quit(): void;
  onStateChange(listener: (state: EngineState) => void): () => void;
}
```

### 11.3 UCI sequence

```text
uci
isready
setoption name MultiPV value 3
position fen <fen>
go depth 14
stop
quit
```

### 11.4 Test positions

- Start position: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`
- Middlegame: `r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4`
- Mate: `7k/8/5K2/8/8/8/8/6Q1 w - - 0 1`

### 11.5 Acceptance

- Worker loads in a production build.
- MultiPV of at least three is returned.
- Mate score is distinguished from centipawn score.
- Analysis can be stopped.
- Main thread remains responsive.
- Cache key format is tested.

---

## 12. PGN proof-of-concept (G3)

### 12.1 Parser and validation

- Parser: `@mliebelt/pgn-parser`.
- Validation: `chess.js`.
- Preserve original PGN text.
- Validate SAN and FEN.
- Reject unsupported variants with a clear error.

### 12.2 Required fixtures

- Normal game.
- Headers, comments, NAGs, and variations.
- Non-standard starting FEN.
- Multiple games in one input.
- Invalid SAN.
- Empty file.
- Unsupported variant.
- Long game with at least 200 ply.

### 12.3 Error contract

Errors must include:

- Source type.
- Game index, where applicable.
- Ply, where applicable.
- SAN, where applicable.
- Human-readable message.
- Recovery suggestion.

### 12.4 Security

- PGN is parsed as text.
- No PGN content is injected as HTML.
- Comments and NAGs are treated as untrusted.

---

## 13. External import proof-of-concept

### 13.1 Chess.com adapter

Route Handlers:

- `GET /api/chesscom/archives?username={username}`
- `GET /api/chesscom/games?username={username}&year={year}&month={month}`

External endpoints:

- `https://api.chess.com/pub/player/{username}/games/archives`
- `{archiveUrl}`

Rules:

- Validate username.
- Validate year and month.
- Accept only `rules: "chess"`.
- Timeout: 10 seconds.
- Rate limit: 30 requests per minute per IP.
- Cache responses for 5 minutes.
- User-Agent: `ChessForge/0.1 (personal project)`.
- Convert response to internal `Game` model at adapter boundary.
- Identify Chess.com as an external service.

### 13.2 Lichess adapter

Route Handlers:

- `GET /api/lichess/games?username={username}&max={max}`
- `GET /api/lichess/game/{id}`

External endpoints:

- `https://lichess.org/api/games/user/{username}?max={max}`
- `https://lichess.org/game/export/{id}`

Rules:

- Validate username and game ID.
- Accept `application/x-chess-pgn`.
- Split multi-game PGN in adapter.
- Timeout: 10 seconds.
- Rate limit: 20 requests per minute per IP.
- Cache responses for 5 minutes.
- User-Agent: `ChessForge/0.1 (personal project)`.
- Convert response to internal `Game` model at adapter boundary.
- Identify Lichess as an external service.

### 13.3 Fixtures

- Chess.com archive list fixture.
- Chess.com monthly games fixture.
- Lichess PGN fixture.
- Network error fixture.
- Rate-limit fixture.
- Invalid username fixture.

### 13.4 Live smoke

- One manual import from Chess.com.
- One manual import from Lichess.
- No credentials requested.
- CI does not depend on live services.

---

## 14. Deployment and licensing (G4)

### 14.1 Docker

- Base image: `node:24-bookworm-slim`.
- Multi-stage build.
- `output: "standalone"` in Next.js config.
- Copy `.next/standalone`, `.next/static`, and `public`.
- Non-root runtime user.
- `PORT=3000`.
- `HOSTNAME=0.0.0.0`.
- Healthcheck: `GET /api/health`.

### 14.2 Coolify

- Application type: Dockerfile.
- Port: 3000.
- Basic auth configured at reverse proxy.
- Rate limiting configured at application and proxy layers.
- Environment variables documented.
- No live deployment required in R0.

### 14.3 Headers

R0 does not enable COOP/COEP because Stockfish defaults to single-thread.

Baseline headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy`

### 14.4 Licence inventory

`docs/THIRD_PARTY_NOTICES.md` must include:

- Stockfish: GPL-3.0 and source offer.
- Chessground: GPL-3.0-or-later.
- Remotion packages: Remotion licence and free-license eligibility.
- cburnett pieces: CC BY-SA 3.0 and attribution.
- chess-openings: CC0 1.0.
- SFX: source URL and licence.
- Geist fonts: OFL.

### 14.5 Gate G4 evidence

- Successful `docker build`.
- Container smoke test.
- Deployment documentation.
- Licence inventory.
- Source offer availability.

---

## 15. Testing and CI

### 15.1 Test frameworks

- Vitest for unit and integration tests.
- Testing Library for component tests.
- Playwright for E2E tests.
- jsdom for component test environment.

### 15.2 Test commands

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write",
    "format:check": "biome format",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run typecheck && npm run test",
    "check:all": "npm run check && npm run build"
  }
}
```

### 15.3 CI workflow

`.github/workflows/ci.yml`:

- Node 24.
- `npm ci`.
- Biome lint.
- TypeScript typecheck.
- Vitest.
- Next.js production build.
- Playwright Chromium with WebM export test.
- Playwright browser installation.

CI must not depend on live Chess.com or Lichess services.

### 15.4 Coverage expectations

- Domain logic has unit tests.
- Repository and migration logic has integration tests.
- Export POC has an E2E smoke test.
- No numeric coverage threshold is required in R0.

---

## 16. ADR and documentation

### 16.1 ADR template

Each ADR includes:

- Title.
- Status.
- Context.
- Decision.
- Consequences.
- Alternatives considered.

### 16.2 Required ADRs

1. `0001-nextjs-version-and-runtime.md`
2. `0002-rendering-architecture.md`
3. `0003-stockfish-build.md`
4. `0004-pgn-parser.md`
5. `0005-storage-schema.md`
6. `0006-licensing.md`
7. `0007-deployment.md`
8. `0008-design-tokens.md`
9. `0009-external-import-adapters.md`
10. `0010-testing-and-ci.md`

### 16.3 Documentation updates

- `README.md`: setup, scripts, Node version, environment.
- `docs/THIRD_PARTY_NOTICES.md`: licences.
- `docs/evidence/R0/`: gate reports.
- `AGENTS.md`: keep Next.js managed block committed.

---

## 17. Task execution order

### 17.1 Wave 1

- R0-T01: Audit Next.js 16 docs.
- R0-T02: Configure toolchain.
- R0-T03: Install dependencies.
- R0-T04: Create design tokens.
- R0-T05: Build application shell.

### 17.2 Wave 2

- R0-T06: Define domain types and Zod schemas.
- R0-T07: Implement IndexedDB storage.
- R0-T08: Create asset pipeline.

### 17.3 Wave 3

- R0-T09: Export proof-of-concept.
- R0-T10: Engine proof-of-concept.
- R0-T11: PGN proof-of-concept.
- R0-T12: External API proof-of-concept.

### 17.4 Wave 4

- R0-T13: Deployment and licensing gate.
- R0-T14: ADR index and evidence.

### 17.5 Gate review

- Review G0–G4.
- Record evidence.
- Approve or block R1.

---

## 18. Evidence and gate checklist

### 18.1 G0 checklist

- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Shell screenshots captured.

### 18.2 G1 checklist

- [ ] 9:16 export passes.
- [ ] 16:9 export passes.
- [ ] WebM produced.
- [ ] MP4 produced where supported.
- [ ] Audio present.
- [ ] Cancel test passes.
- [ ] Capability matrix recorded.
- [ ] Render time recorded.
- [ ] Memory recorded.

### 18.3 G2 checklist

- [ ] Worker loads in production build.
- [ ] MultiPV >= 3.
- [ ] Mate score distinguished.
- [ ] Stop works.
- [ ] Main thread responsive.
- [ ] Cache key tested.

### 18.4 G3 checklist

- [ ] Normal game passes.
- [ ] Comments, NAGs, variations pass.
- [ ] Non-standard FEN passes.
- [ ] Multiple games pass.
- [ ] Invalid SAN fails clearly.
- [ ] Empty file fails clearly.
- [ ] Unsupported variant fails clearly.
- [ ] Long game performance recorded.

### 18.5 G4 checklist

- [ ] Docker build succeeds.
- [ ] Container smoke passes.
- [ ] Healthcheck passes.
- [ ] Coolify docs complete.
- [ ] Basic auth documented.
- [ ] Rate limit tested.
- [ ] Licence inventory complete.
- [ ] Source offer available.

---

## 19. Handoff to R1

R1 may begin only when:

- Gates G0–G4 pass.
- Evidence is recorded.
- ADRs are committed.
- No blocking technical question remains.
- The walking skeleton scope is understood.

R1 will reuse R0 modules rather than rewriting them.

---

## 20. Risks and open technical items

| Risk                                      | Mitigation                              |
| ----------------------------------------- | --------------------------------------- |
| Tailwind v4 and shadcn/ui compatibility   | Validate during R0-T03                  |
| Next.js 16 and Remotion compatibility     | Validate during G1                      |
| Stockfish package size and worker loading | Validate during G2                      |
| PGN parser variation support              | Validate during G3                      |
| Docker image size and build time          | Validate during G4                      |
| Playwright Chromium codec support         | Use WebM in CI; Chrome/Edge for MP4     |
| Asset licensing ambiguity                 | Complete `THIRD_PARTY_NOTICES.md` in R0 |

---

## 21. Definition of Done for R0

R0 is complete when:

- All R0 tasks are marked `DONE`.
- Gates G0–G4 pass.
- Evidence is recorded.
- ADRs are committed.
- No unrelated complexity was introduced.
- R1 can begin without unresolved technical blockers.

---

*Generated from `docs/ROADMAP.md` v1.0 and approved user decisions on 2026-11-22.*
