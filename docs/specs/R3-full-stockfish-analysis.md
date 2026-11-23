---
title: ChessForge — Phase R3 Full Stockfish Analysis Specification
product: ChessForge
spec_version: "1.0"
roadmap_version: "1.0"
prd_version: "1.0"
prd_revision: "1.1"
status: Ready for implementation
last_updated: 2026-11-23
language: en
---

# ChessForge — Phase R3 Specification

R3 completes Stockfish analysis. It turns a persisted game into a reviewed game: engine evaluation, principal variations, centipawn loss, move classifications, opening and phase labels, threats, critical moments, and a factual summary.

R2 remains the proof that real games can be imported and replayed. R3 must preserve that path while adding analysis depth.

---

## 1. Purpose

R3 exists to deliver:

1. A recoverable engine worker with progress, stop, restart, and error handling.
2. Configurable depth, time, MultiPV, hash, and evaluation perspective.
3. Position analysis and full-game analysis.
4. Cached position results and persisted move assessments.
5. Centipawn loss with mate-score separation.
6. Centralised move classification thresholds.
7. Conservative Candidate Brilliant detection with accept/reject decisions.
8. Opening identification from a bundled CC0 dataset.
9. Opening, middlegame, and endgame phase labels.
10. Threat detection with forced and heuristic evidence.
11. Critical moments and a deterministic game summary.
12. Gate G7 evidence.

R3 passes only when Gate G7 passes.

---

## 2. Scope

### 2.1 In scope

- Engine adapter lifecycle and progress events.
- Depth or time limit, MultiPV, hash, single-thread constraint.
- White and side-to-move evaluation perspective.
- Position analysis for the selected move.
- Full-game analysis queue for one game.
- Pause, resume, cancel, retry, and reload recovery.
- Position analysis cache.
- Persisted move assessments.
- Centipawn loss and mate transition handling.
- Best, Excellent, Good, Inaccuracy, Mistake, and Blunder classifications.
- Candidate Brilliant with Accept and Reject.
- Opening lookup with ECO and name.
- Opening, middlegame, and endgame labels.
- Forced and heuristic threats.
- Critical moments and deterministic summary.
- Analysis UI, caveats, and accessibility.
- Unit, integration, dev E2E, production E2E, and Gate G7 evidence.

### 2.2 Out of scope

- Analysis of multiple games at once.
- Background server analysis.
- Cloud analysis or engine calls to external services.
- LLM-generated commentary.
- Player-intention inference.
- Full variation navigation.
- Annotation editing beyond Candidate Brilliant accept/reject.
- Scene creation from summary moments. R4/R5 consume those moments later.
- Multi-thread Stockfish. Single-thread remains the R3 default and only supported mode.
- Opening explorer or move statistics.
- Exhaustive tactical solving.
- Automatic cache eviction.
- Changes to the R2 import and replay contract.

---

## 3. Approved decisions

| Topic               | Decision                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Persistence         | Keep IndexedDB v1. Use existing `positionAnalyses` and `moveAssessments` stores.                      |
| Evaluation storage  | Always canonical White perspective.                                                                   |
| Evaluation display  | White perspective or side-to-move. Default White. Numbers and bar follow the toggle.                  |
| Position analysis   | Position before the selected move, matching the R1/R2 contract.                                       |
| Full-game analysis  | Positions 0 through N. Depth from settings. MultiPV 1.                                                |
| Full-game start     | Explicit user action. Never auto-start.                                                               |
| Queue scope         | One game at a time. No cross-game queue.                                                              |
| Pause               | Finish the active position, then stop scheduling.                                                     |
| Resume              | Analyse positions that are not cached.                                                                |
| Cancel              | Stop the active search. Keep completed positions and assessments.                                     |
| Cache               | Global by cache key. No eviction in R3.                                                               |
| Terminal positions  | Checkmate, stalemate, and draw are derived without calling the engine.                                |
| CPL thresholds      | 20 / 50 / 100 / 200 centipawns.                                                                       |
| Mate                | Never converted to ordinary centipawn loss.                                                           |
| Candidate Brilliant | Conservative heuristic, pending until accepted or rejected.                                           |
| Opening data        | Vendored JSON generated from `lichess-org/chess-openings`, lazy-loaded, indexed by EPD.               |
| Phase heuristic     | Opening through last book match. Endgame at combined non-pawn material ≤ 20 and non-king pieces ≤ 10. |
| Threats             | Best reply from engine PV plus legal-move heuristics. Maximum 3 per position.                         |
| Critical moments    | Maximum 3. Mate swings first, then largest absolute CPL.                                              |
| Summary             | Deterministic and factual. No intent claims.                                                          |
| Performance         | No hard time cap. UI must remain responsive. Record elapsed time and depth.                           |
| Document language   | English.                                                                                              |

---

## 4. User flow

```text
/analysis/{gameId}
  choose evaluation perspective
  review cached analysis or start analysis
  position analysis
    -> eval, best move, PV, depth, nodes, NPS
    -> step through PV
  full-game analysis
    -> progress, pause, resume, cancel, retry
    -> move classifications
    -> opening, phase, threats, critical moments
    -> deterministic summary
  accept or reject a Candidate Brilliant
  select a critical moment
  create a scene from a move (R1 flow remains)
```

Analysis must work without an account, cloud service, or third-party API.

---

## 5. Engine architecture

### 5.1 Adapter contract

Extend the existing `StockfishEngine` interface in `src/features/analysis/engine/stockfish-adapter.ts`.

Required methods:

```ts
interface StockfishEngine {
  load(): Promise<void>;
  setOption(name: string, value: string | number): void;
  analyse(request: AnalyseRequest): Promise<PositionAnalysis>;
  stop(): void;
  quit(): void;
  onStateChange(listener: (state: EngineState) => void): () => void;
  onProgress(listener: (progress: EngineProgress) => void): () => void;
}
```

`AnalyseRequest` must accept:

- `fen`
- `depth`
- `movetimeMs`
- `multiPv`
- optional `signal` or cancellation hook

Exactly one of depth or movetime is active per search. When both are present, `movetimeMs` wins. The UI clears the inactive value.

`EngineProgress` must expose the latest search information:

- current depth
- selective depth
- multipv lines
- nodes
- NPS
- elapsed time
- latest score
- engine state

UI components must not send raw UCI commands. All engine communication stays behind the adapter.

### 5.2 Worker lifecycle

The engine runs in the existing Web Worker from `public/engine/stockfish/`.

Required states:

- `idle`
- `loading`
- `ready`
- `analysing`
- `stopping`
- `completed`
- `error`

Rules:

- Loading must not block the main thread.
- The worker must be created only in the browser.
- `load()` sends `uci`, waits for `uciok`, sends `isready`, waits for `readyok`, then applies options.
- Worker asset failure and worker startup failure set `error`.
- After a worker error, the next user retry creates a fresh worker. A full page reload must not be required where recovery is possible.
- `quit()` terminates the worker and returns to `idle`.
- `stop()` sends `stop` and does not itself mark the search as an error.
- A stopped search may return the latest completed MultiPV data and must not discard a valid partial result.

### 5.3 Progress, stop, and restart

- Progress events must be emitted from UCI `info` lines while the engine searches.
- The UI must show analysis activity immediately after the search starts.
- `Stop` must be available while a position search is running.
- Stopping a position search returns the best result available at that point.
- Restart starts a new search for the same FEN. It does not pretend to resume the engine's internal search.
- Full-game pause and resume are queue operations, not engine state names.
- The engine state list stays exactly as defined in §5.2.

### 5.4 Terminal positions

Before calling the engine, classify the position:

- checkmate
- stalemate
- draw by insufficient material, threefold repetition, or fifty-move rule when `chess.js` can determine it
- otherwise playable

Rules:

- Checkmate: synthesize a terminal result. Do not call the engine. The winner is the side that is not to move.
- Stalemate: synthesize a draw result. No engine call.
- Draw: synthesize a centipawn 0 result. No engine call.
- Terminal results are not persisted in the analysis cache.
- A move that delivers checkmate is assessed as winning. If it matches the engine best move, its base classification is `best`; otherwise `excellent`.
- An invalid FEN must fail with a clear error and must not crash the board or queue.

### 5.5 Error recovery

| Failure                     | Required behaviour                                              |
| --------------------------- | --------------------------------------------------------------- |
| Engine asset 404            | Error state with retry action                                   |
| Worker cannot start         | Error state with retry action                                   |
| Worker crashes mid-search   | Reject the active position, keep completed results, offer retry |
| Browser memory insufficient | Clear error, suggest lower hash/depth, keep results             |
| Unsupported engine option   | Continue; record a non-blocking warning                         |
| Search timeout              | Error state for that position, queue can retry or cancel        |
| User stops                  | Complete with the latest valid result                           |
| No evaluation returned      | Error for that position, no corrupt assessment                  |
| Invalid FEN                 | Clear validation error, skip position                           |

---

## 6. Settings

### 6.1 Engine settings

Extend the existing engine settings UI and application settings.

| Setting                | Default  | Range                 | Notes                         |
| ---------------------- | -------- | --------------------- | ----------------------------- |
| Analysis limit         | Depth    | Depth or time         | One active mode               |
| Depth                  | 14       | 6–30                  | Used by full-game analysis    |
| Time limit             | 2,000 ms | 250–30,000 ms         | Used when time mode is active |
| MultiPV                | 3        | 1–8                   | Position analysis only        |
| Hash                   | 32 MB    | 16–512 MB             | Browser-safe cap              |
| Threads                | 1        | Fixed at 1            | Single-thread build only      |
| Evaluation perspective | White    | White or side-to-move | Display only                  |

Rules:

- Full-game analysis always uses MultiPV 1.
- Position analysis uses the configured MultiPV.
- The engine adapter clamps invalid values before sending them.
- The adapter probes option support after `uciok`. Unsupported options are skipped with a non-blocking warning. No browser is assumed to support the same options.
- The settings form validates with Zod.
- Existing settings without `evaluationPerspective` parse with the default `white`.
- `EngineConfiguration.perspective` remains the canonical stored perspective marker. It is not the display toggle.
- Depth mode is active when `enginePreferences.movetimeMs` is absent. Time mode is active when it is present. The settings UI clears the inactive field.
- No IndexedDB version bump is required for the settings change.
- Threads stays disabled in R3. Multi-thread remains a future capability.

### 6.2 Evaluation perspective

Add to `ApplicationSettings`:

```ts
evaluationPerspective: "white" | "side-to-move";
```

Rules:

- Canonical analysis results are always stored as White perspective.
- Display conversion happens only at the UI boundary.
- `white`: positive values favour White.
- `side-to-move`: positive values favour the side to move.
- The numeric evaluation, mate notation, and evaluation bar follow the same perspective.
- The active perspective is labelled in the UI.
- Board orientation is independent from evaluation perspective.

### 6.3 Settings persistence

- Engine preferences remain in `ApplicationSettings.enginePreferences`.
- Evaluation perspective is a separate application setting.
- Settings changes apply to the next analysis run.
- Running analysis keeps the configuration captured at start.
- A configuration change must not invalidate the current result until the user starts a new analysis.

---

## 7. Analysis pipeline

### 7.1 Position analysis

Position analysis uses the FEN before the selected move. At ply 0, it uses the initial FEN.

On start:

1. Validate the FEN.
2. Build the cache key from FEN, engine version, depth or movetime, MultiPV, threads, and hash.
3. Read the cache.
4. If valid, display the cached result with a `Cached` indicator.
5. If missing, run the engine.
6. Persist the result.
7. Display evaluation, best move, PVs, depth, nodes, NPS, and elapsed time.

The selected move changes clear the active uncached analysis display. Before clearing, look up the cache for the position before the new selected move. If a valid cache entry exists, display it with a `Cached` indicator. Cached results for other plies remain available.

### 7.2 Full-game analysis

Full-game analysis computes positions `0..N`, where `N` is the game's ply count.

Rules:

- Full-game uses depth from settings and MultiPV 1.
- One engine search runs at a time.
- Positions with a valid cache entry are skipped.
- Terminal positions are derived and skipped.
- Each completed position is persisted immediately.
- Each completed move assessment is derived from the evaluations before and after the move.
- Assessments are persisted at pause, cancel, error, and completion.
- If the user reloads during analysis, completed positions remain available.
- On reload, assessments can be re-derived from cached positions.
- The queue is sequential and deterministic.
- The UI must show the total positions, completed count, active ply, and current engine depth.
- A game with no moves cannot start full-game analysis.
- Full-game analysis never starts automatically.

### 7.3 Pause, resume, cancel, and retry

- `Pause` sets the queue to paused after the active position completes.
- `Resume` analyses positions without a valid cache entry and re-derives missing assessments.
- `Cancel` stops the active search, saves completed positions, and ends the run.
- `Retry` retries the failed position.
- A worker failure may be retried once with a fresh worker without user action. A second failure requires an explicit retry.
- Cancel and pause must not delete completed analysis.
- Re-analysis preserves accepted or rejected Candidate Brilliant decisions for the same game and ply.

### 7.4 Cache

Cache key: existing `analysisCacheKey` contract.

Must include:

- engine version
- FEN
- depth or movetime
- MultiPV
- threads
- hash

Rules:

- Cache is global, not per game.
- A cache hit is valid only for an exact key match.
- A different engine version or configuration is a miss.
- Cache records that fail schema validation are deleted and treated as misses.
- Terminal positions are not cached.
- Cache entries are not evicted in R3.
- The UI must not compare evaluations across configurations as if identical.
- The analysis panel displays the engine version, depth, MultiPV, and limit used.

### 7.5 Persistence and reload

Persisted data:

- `PositionAnalysis` per unique cache key.
- `MoveAssessment` per game and ply.
- Candidate Brilliant decision.

Derived data:

- opening match
- phase labels
- threats
- critical moments
- summary

Rules:

- Derived data is recomputed from persisted analyses and the game. No new store is required.
- The database version remains `1`.
- New repository interfaces wrap raw IndexedDB access.
- A reload must restore completed assessments and the summary without running the engine.
- A partial run shows partial assessments and a `Resume analysis` action.

---

## 8. Evaluation, CPL, and classification

### 8.1 Evaluation representation

- Canonical storage: White perspective.
- Centipawn scores remain integers.
- Mate scores remain separate from centipawn scores.
- Mate values use distance to mate with the existing sign convention.
- The UI formats centipawns as `+0.34` and mates as `+M3` or `-M3`.
- Evaluation display must state the active perspective.
- A loading state appears while a position is incomplete.
- A partial stopped result must be labelled as partial.

### 8.2 Centipawn loss

For centipawn evaluations:

```text
moverBefore = White-perspective value converted to the mover's perspective
moverAfter  = White-perspective value converted to the mover's perspective
cpl = max(0, moverBefore - moverAfter)
```

Rules:

- White mover: use the White-perspective values directly.
- Black mover: negate both White-perspective values.
- CPL is an integer.
- CPL is undefined when either evaluation is a mate score.
- CPL is undefined for terminal synthetic results where no comparable before/after centipawn values exist.
- CPL is engine- and depth-dependent. The UI must show that caveat.

### 8.3 Mate handling

Mate transitions use a separate classification table. CPL is never fabricated from mate distance.

| Before           | After                                 | Classification rule                                    |
| ---------------- | ------------------------------------- | ------------------------------------------------------ |
| Mover mates      | Mover mates, same or faster           | `best` if played move is engine best, else `excellent` |
| Mover mates      | Mover mates, one move slower          | `good`                                                 |
| Mover mates      | Mover mates, two or more moves slower | `inaccuracy`                                           |
| Mover mates      | No mate, still winning ≥ +2.00        | `mistake`                                              |
| Mover mates      | No mate, not clearly winning          | `blunder`                                              |
| No mate          | Mover mates                           | `best`                                                 |
| No mate          | Opponent mates                        | `blunder`                                              |
| Mover is mated   | Mover is mated, mate delayed          | `excellent`                                            |
| Mover is mated   | No mate                               | `best` if the escape is sound, else `excellent`        |
| Opponent mates   | Opponent mates, faster                | `good`                                                 |
| Either side mate | Terminal checkmate after the move     | `best` if engine best, else `excellent`                |

Rules:

- "Faster" means fewer moves to mate.
- Mate distance uses absolute values.
- A forced mate that remains forced for the same side is not a blunder.
- The caveat text must state that mate distance is engine-dependent.

### 8.4 Classification thresholds

Thresholds are centralised in one configuration module. They are not duplicated in UI components.

| Classification | Rule                                   |
| -------------- | -------------------------------------- |
| Best           | Played UCI equals engine `bestMoveUci` |
| Excellent      | CPL 1–20                               |
| Good           | CPL 21–50                              |
| Inaccuracy     | CPL 51–100                             |
| Mistake        | CPL 101–200                            |
| Blunder        | CPL > 200                              |

Rules:

- A played move with CPL 0 but a different UCI from the engine best move is `excellent`, not `best`.
- Forced moves use `best` with `confidence: "low"` and a forced-move caveat.
- Mate transitions use §8.3.
- Thresholds are documented in `docs/ROADMAP.md`.
- Classification is a heuristic interpretation, not objective truth.
- The UI shows the evaluation before and after the move so users can inspect the evidence.

### 8.5 Candidate Brilliant

A move is a Candidate Brilliant only when every condition holds:

1. The played move is the engine best move.
2. The move creates a material sacrifice of at least 300 centipawns by the two-ply static exchange heuristic.
3. The evaluation after the move is at least +0.50 for the mover in mover-perspective.
4. The mover has at least one legal alternative that does not create the same sacrifice.
5. The position is not a forced move.
6. The position is not still inside the opening book match.
7. The move is not the only legal move.

The sacrifice heuristic:

```text
for each legal opponent capture:
  gain = value(captured piece)
  if the mover can recapture the capturing piece:
    gain -= value(capturing piece)
  sacrifice = max(sacrifice, gain)
```

Rules:

- Candidate Brilliant is a candidate label, not an official Chess.com or Lichess classification.
- The label always includes the word `Candidate`.
- It is stored with `candidateBrilliant: true`.
- The decision is stored as `pending`, `accepted`, or `rejected`.
- Accept sets the display classification to `brilliant`.
- Reject keeps the base classification and hides the candidate label.
- Decisions survive re-analysis for the same game and ply.
- The UI must show a caveat that the heuristic is conservative and engine-dependent.
- Accepted and rejected decisions are user annotations. They are not recomputed from the engine.

### 8.6 Confidence and caveats

Confidence values:

- `high`: target depth reached, no mate transition, not forced, not terminal.
- `medium`: depth within two plies of target, forced move, or CPL near a threshold boundary.
- `low`: partial search, mate transition, terminal position, or engine warning.

Every assessment may carry one caveat:

- engine depth is below target
- forced move
- mate transition
- classification threshold boundary
- opening book position
- heuristic sacrifice

The summary must show a global classification caveat.

---

## 9. Opening, phase, threats, and summary

### 9.1 Opening identification

Dataset:

- Source: `lichess-org/chess-openings`, CC0 1.0.
- Generated JSON is vendored in the repository at `src/features/analysis/openings/openings.generated.json`.
- Regeneration script: `scripts/build-openings.mjs`.
- Lookup module: `src/features/analysis/openings/lookup.ts`.
- Build and CI must not require network access.
- Runtime load is lazy and local.
- Licence notice already exists in `docs/THIRD_PARTY_NOTICES.md`.

Data shape:

```ts
interface OpeningEntry {
  eco: string;
  name: string;
  epd: string;
  ply: number;
}

interface OpeningMatch {
  eco: string;
  name: string;
  epd: string;
  ply: number;
}
```

Rules:

- Index entries by EPD: the first four FEN fields.
- Match every position `0..N`.
- The deepest matching ply wins.
- Ties at the same ply sort by ECO, then name.
- Transpositions match through EPD.
- No match shows `Unknown opening`.
- Dataset load failure shows `Unknown opening` and does not stop analysis.
- Opening values never override a non-empty PGN `Opening` tag silently. The lookup may display its own source label.

### 9.2 Phase classification

Phases:

- opening
- middlegame
- endgame

Material values:

- queen 9
- rook 5
- bishop 3
- knight 3
- pawn 0
- king 0

Rules:

- Opening ends at the deepest opening match ply. If no opening match exists, no opening phase is labelled.
- Endgame starts at the first playable position where combined non-pawn material for both sides is ≤ 20 and non-king piece count is ≤ 10.
- Endgame start must be after the opening end.
- Middlegame covers positions between opening end and endgame start.
- If no endgame condition appears, the game ends in middlegame.
- Every phase label is heuristic and carries a caveat.
- The summary exposes the first ply of each detected phase for navigation.
- Do not claim a universal phase boundary.

### 9.3 Threat detection

Threat kinds:

- `mate`
- `material`
- `hanging`

Threat shape:

```ts
interface Threat {
  kind: "mate" | "material" | "hanging";
  forced: boolean;
  ply: number;
  san: string;
  uci: string;
  line: string[];
  materialDelta?: number;
  description: string;
  confidence: "low" | "medium" | "high";
}
```

Rules:

- Use the engine PV from the position after the played move.
- Forced mate: the first PV reply is checkmate.
- Forced material: the first PV reply captures a piece and the two-ply static exchange gain is at least 300 centipawns.
- Hanging: a legal opponent capture wins at least 300 centipawns by the same static exchange heuristic and is not already the forced PV threat.
- Each threat stores the supporting line and the position ply.
- Forced threats use `forced: true`.
- Static threats use `forced: false`.
- Maximum 3 threats per position, sorted by mate first, then material gain, then ply.
- Deduplicate identical SAN/UCI threats.
- Do not claim exhaustive tactical detection.
- Threat text must distinguish `Forced by engine line` from `Heuristic warning`.

### 9.4 Critical moments

Rules:

- Use assessments from the completed game analysis.
- Include mate transitions and CPL ≥ 100.
- Sort mate transitions first, then descending absolute CPL.
- Tie-break by lower ply.
- Maximum 3.
- Each moment stores ply, SAN, classification, CPL or mate transition, and a short reason.
- Selecting a moment navigates to its ply.
- Selecting a moment must not start engine analysis automatically.
- Critical moments are recommendations, not objective key moments.

### 9.5 Game summary

The summary is deterministic and derived from persisted assessments, analyses, and game metadata. It is not persisted and never calls an engine.

Required fields:

- game ID
- White and Black names
- result
- termination context when present
- opening match or unknown
- detected phases
- move count
- classification counts
- Candidate Brilliant count
- accepted Brilliant count
- major evaluation swings
- critical moments
- notable tactical opportunities and forced threats
- engine version, depth, MultiPV, and limit
- caveats
- a concise factual summary text

Text rules:

- Use templates from computed values.
- Do not invent player intentions.
- Do not claim a move was "brilliant" without the accepted user decision.
- Use "Candidate Brilliant" for pending candidates.
- Use "Brilliant" only after acceptance.
- State that classifications are heuristic and depth-dependent.
- Include checkmate or resignation context only when supported by the game data.
- If analysis is partial, say so and omit unsupported claims.
- If opening data is unavailable, say `Unknown opening`.
- Major evaluation swings are the top three assessments by absolute CPL, including mate transitions.
- Tactical opportunities are forced mate or forced material threats, not speculative plans.
- Critical moments are the filtered subset used for navigation.

---

## 10. Data model changes

### 10.1 PositionAnalysis

Extend the existing schema with optional fields:

```ts
seldepth?: number;
nodes?: number;
nps?: number;
timeMs?: number;
terminal?: "checkmate" | "stalemate" | "draw";
terminalWinner?: "w" | "b";
```

Rules:

- Existing fields remain.
- `score` remains canonical White perspective.
- `principalVariations` remain sorted by MultiPV.
- `depth` is the maximum reached depth.
- `timeMs` is the engine-reported search time when available.
- `terminal` is set only for synthetic terminal results.
- Terminal results are not cached.
- `schemaVersion` remains `1` because the change is additive.

### 10.2 MoveAssessment

Revise the existing schema:

```ts
interface MoveAssessment {
  id: string;
  gameId: string;
  ply: number;
  evaluationBefore: Evaluation;
  evaluationAfter: Evaluation;
  centipawnLoss?: number;
  classification:
    | "best"
    | "excellent"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder";
  candidateBrilliant: boolean;
  brilliantDecision?: "pending" | "accepted" | "rejected";
  confidence: "low" | "medium" | "high";
  caveat?: string;
  engineVersion: string;
  engineConfiguration: EngineConfiguration;
  depth: number;
  threats?: Threat[];
  createdAt: string;
  schemaVersion: 2;
}
```

Rules:

- `classification` is the base classification.
- Display classification is derived:
  - accepted Candidate Brilliant -> `brilliant`
  - pending Candidate Brilliant -> `candidate-brilliant`
  - otherwise base classification
- No existing production MoveAssessment records exist before R3, so no database migration is required.
- Invalid stored assessments are ignored and re-derived from cached positions.
- Accepted and rejected decisions are preserved across re-analysis.

### 10.3 Threat

Add the `Threat` schema from §9.3 and embed it in `MoveAssessment.threats`.

### 10.4 Derived analysis types

Add derived types in `src/features/analysis/types.ts`:

```ts
type DisplayMoveClassification =
  | MoveAssessment["classification"]
  | "candidate-brilliant"
  | "brilliant";

interface GamePhase {
  phase: "opening" | "middlegame" | "endgame";
  startPly: number;
  endPly: number;
}

interface CriticalMoment {
  ply: number;
  san: string;
  classification: DisplayMoveClassification;
  centipawnLoss?: number;
  mateTransition?: string;
  reason: string;
}

interface GameSummary {
  /* fields from §9.5 */
}
```

Derived types are validated by Zod where they cross a persisted or external boundary. They are not stored.

### 10.5 Repositories

Add to `src/features/storage/db.ts`:

```ts
interface PositionAnalysisRepository {
  get(cacheKey: string): Promise<PositionAnalysis | undefined>;
  save(analysis: PositionAnalysis): Promise<void>;
  delete(cacheKey: string): Promise<void>;
}

interface MoveAssessmentRepository {
  listByGame(gameId: string): Promise<MoveAssessment[]>;
  replaceForGame(gameId: string, assessments: MoveAssessment[]): Promise<void>;
}
```

Rules:

- Repositories parse stored records with the current schemas.
- `replaceForGame` runs in one transaction and never leaves a partial batch.
- Cache records are global. Game linkage lives in `MoveAssessment`.
- No UI component opens a raw IndexedDB transaction.
- No database version bump.

---

## 11. UI

### 11.1 `/analysis/[gameId]`

Keep the R2 layout: board, player rows, move list, move detail, engine panel, scene creation.

Add:

- evaluation bar
- evaluation perspective toggle
- analysis progress panel
- classification indicators in the move list
- classification, CPL, and threat details in the move detail
- summary panel
- critical moment links
- Candidate Brilliant Accept/Reject
- PV step controls

The `Create 3-second scene` flow remains available and unchanged.

### 11.2 Board and evaluation bar

- The board remains read-only Chessground.
- The board always matches the selected ply.
- Position analysis uses the FEN before the selected move.
- The engine panel labels the analysed position explicitly: `Before 3. Bb5`.
- At Start, label it `Starting position`.
- The evaluation bar sits next to the board on desktop and above it on narrow screens.
- The bar shows the analysed position: the position before the selected move. At Start, it shows the initial position.
- The bar shows the share for each side, not only colour.
- The bar has an accessible label with the active perspective and numeric value.
- White share formula for centipawns:

```text
clamped = clamp(cp, -1000, 1000)
whiteShare = 1 / (1 + exp(-clamped / 400))
```

- Mate for White: White share 1.
- Mate for Black: White share 0.
- White perspective: White is the bottom segment.
- Side-to-move perspective: the side to move is the bottom segment.
- Board orientation does not change the evaluation perspective label.

### 11.3 Engine panel

Required elements:

- Engine state with `aria-live="polite"`.
- Perspective toggle.
- Depth or time summary.
- MultiPV summary.
- Evaluation.
- Best move SAN and UCI.
- Depth, seldepth, nodes, NPS, and elapsed time.
- PV list.
- `Analyse position`, `Stop`, and `Restart` actions.
- `Analyse game`, `Pause`, `Resume`, `Cancel`, and `Retry` actions.
- Cached indicator.
- Incomplete/partial indicator.
- Caveat text.

Rules:

- Controls disable correctly during loading, analysing, stopping, and error.
- Engine failure never disables scene creation.
- Selecting a move clears the active position result but not cached game assessments.
- The current analysis configuration is visible.

### 11.4 Progress

Full-game analysis progress shows:

- completed positions / total positions
- active ply
- current depth
- elapsed time
- queue state
- cached positions skipped

Use `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.

Pause finishes the active position. The UI must state that.

### 11.5 Move list

Each move row shows:

- move number and SAN
- classification icon plus short text or NAG-like label
- Candidate Brilliant indicator
- comment indicator
- selected state
- direct selection

Rules:

- Colour is not the only indicator.
- The accessible name includes the full classification.
- Candidate Brilliant rows say `Candidate Brilliant`.
- Accepted rows say `Brilliant`.
- Move rows remain keyboard reachable.
- Long games keep a bounded scroll area.

### 11.6 Move detail

Add:

- base classification and display classification
- evaluation before
- evaluation after
- CPL or mate transition
- confidence and caveat
- engine version and depth
- threats with forced/heuristic label and supporting line
- Candidate Brilliant Accept/Reject actions when pending
- accepted/rejected state

Keep existing SAN, UCI, comment, NAG, variation, and FEN details.

### 11.7 Summary

The summary panel shows:

- result and players
- opening name and ECO
- phase chips with jump actions
- move count
- classification counts
- Candidate Brilliant and accepted Brilliant counts
- critical moments with jump actions
- notable threats
- deterministic summary text
- analysis configuration
- caveats

Rules:

- Empty state before full-game analysis.
- Partial state during and after a cancelled or failed run.
- Summary can be recomputed from cached data without engine work.
- Critical moment and phase links select the target ply.
- Summary text is selectable, not injected as HTML.

### 11.8 Accessibility and mobile

- All controls have accessible names.
- Classification uses icon/text plus colour.
- Progress is announced with `aria-live`.
- Focus states are visible.
- Keyboard replay keeps working.
- PV controls are keyboard reachable.
- No horizontal overflow at 390 px.
- The evaluation bar has a text equivalent.
- Reduced-motion preferences are respected.

---

## 12. Error handling

| Case                                      | Required behaviour                                     |
| ----------------------------------------- | ------------------------------------------------------ |
| Stockfish asset fails                     | Error state, retry action, existing analysis preserved |
| Worker cannot start                       | Error state, retry action                              |
| Browser memory insufficient               | Clear message and lower-resource suggestion            |
| Unsupported engine option                 | Non-blocking warning                                   |
| User stops position analysis              | Partial result with partial label                      |
| User pauses full-game analysis            | Active position completes, queue pauses                |
| Engine returns mate                       | Mate displayed separately from centipawns              |
| Analysis incomplete                       | Partial badge and Resume action                        |
| Invalid FEN                               | Clear error, board stays usable                        |
| Cache record corrupt                      | Delete record, treat as cache miss                     |
| Cache configuration mismatch              | Miss, run new analysis                                 |
| Opening dataset unavailable               | `Unknown opening`, analysis continues                  |
| Full-game engine error                    | Keep completed results, retry failed position          |
| Reload during analysis                    | Restore cache and assessments, offer resume            |
| No legal moves                            | Terminal handling, no engine call                      |
| Re-analysis with new settings             | New cache key, old results remain valid for their key  |
| Storage quota failure                     | Visible error, do not lose in-memory results           |
| Candidate Brilliant decision save failure | Visible error, decision remains in memory              |

---

## 13. Performance

- The engine runs in a Web Worker.
- No UCI command is issued from a React component.
- Board and move list must not re-render on every engine `info` line.
- Progress updates are throttled to a visible frame rate.
- Cached analysis must render before starting any engine work.
- Full-game analysis does not start automatically.
- Cache lookup is O(1) by key.
- The summary derivation is O(N) over assessments.
- The reference measurement uses the deterministic R3 fixture on the documented Linux mid-range reference device.
- Record elapsed time, depth, MultiPV, engine version, and browser in Gate G7 evidence.
- There is no hard full-game time cap in R3. A slow run must remain cancellable and must not freeze the UI.
- Initial engineering target: a 40-ply game at depth 12, MultiPV 1, completes without UI freezes. The actual time is recorded, not used as a pass/fail threshold.

---

## 14. Testing

### 14.1 Unit tests

- Classification threshold boundaries: 0, 20, 21, 50, 51, 100, 101, 200, 201.
- Best-move match and equal-evaluation alternative.
- CPL for White and Black movers.
- Mate transition table.
- Forced move caveat.
- Candidate Brilliant accept, reject, forced, book, and false-positive cases.
- Two-ply sacrifice heuristic.
- Opening EPD lookup, longest match, transposition, tie-break, unknown.
- Phase boundaries and missing phases.
- Forced and heuristic threat detection.
- Critical moment sorting and limit.
- Summary determinism and no-intent language.
- Terminal checkmate, stalemate, and draw.
- Evaluation perspective formatting.
- Evaluation bar share formula.
- Cache key stability.
- PV UCI stepping.

### 14.2 Integration tests

- Engine worker load, progress, stop, and restart.
- Worker failure recovery.
- Queue pause, resume, cancel, and retry with a fake engine.
- Cache round trip and corrupt cache handling.
- Assessment repository replace transaction.
- Analysis reload restores cached results.
- Settings default for evaluation perspective.
- Full-game run on a deterministic fixture at low depth.

### 14.3 E2E tests

Add `e2e/r3-analysis.spec.ts`:

- Analyse a selected position.
- Display evaluation, best move, PV, depth, nodes, and NPS.
- Stop analysis.
- Step through a PV and exit PV mode.
- Run full-game analysis on a deterministic fixture at depth 6.
- Display classification badges.
- Open the summary.
- Jump to a critical moment.
- Switch evaluation perspective.
- Accept and reject a Candidate Brilliant from a fixture.
- Reload and confirm cached analysis and summary.
- Keep R1 scene creation working.
- Assert no horizontal overflow at 390 px.

Add `e2e/r3-production.spec.ts`:

- Run the core R3 analysis path in the production build.
- Assert no horizontal overflow at 390 px.
- Keep R1 and R2 production tests green.

### 14.4 Fixtures

Add deterministic PGN fixtures:

- `src/features/games/fixtures/r3-analysis.pgn`: known opening, tactical mistake, and clear critical moment.
- `src/features/games/fixtures/r3-brilliant.pgn`: at least one conservative Candidate Brilliant case.
- `src/features/games/fixtures/r3-terminal.pgn`: checkmate and terminal position coverage.

Fixtures must not depend on live external services.

---

## 15. Gate G7

G7 passes only when:

- AC-04 passes.
- Stockfish loads in a worker and does not freeze the main interface.
- Evaluation, best move, PV, depth, nodes, and NPS are displayed.
- Mate scores are represented separately from centipawn scores.
- Position analysis can be stopped and restarted.
- Full-game analysis can be paused, resumed, cancelled, and retried.
- Cached analysis is reused correctly.
- Move classifications use the documented centralised thresholds and show caveats.
- Candidate Brilliant is labelled as a candidate and can be accepted or rejected.
- Opening identification works offline or shows `Unknown opening`.
- Phase labels are heuristic and navigable.
- Threats distinguish forced engine lines from heuristic warnings.
- The summary is deterministic and contains no invented intent.
- R1 and R2 E2E remain green.
- Production E2E passes.
- `npm run check:all` passes.
- Evidence is recorded in `docs/evidence/R3/gate-g7.md`.

---

## 16. Task order

### 16.1 Wave 1: engine and data foundation

1. Extend engine adapter with progress, cancellation, restart, and recovery.
2. Add terminal position handling.
3. Add engine settings and evaluation perspective.
4. Extend `PositionAnalysis` and `MoveAssessment`.
5. Add analysis repositories.

Maps to R3-T01, R3-T02, R3-T03, R3-T07.

### 16.2 Wave 2: analysis pipeline

1. Position analysis with cache.
2. Full-game queue.
3. Pause, resume, cancel, retry, and reload recovery.
4. Assessment derivation and persistence.

Maps to R3-T06, R3-T07, R3-T08.

### 16.3 Wave 3: interpretation

1. CPL and mate transitions.
2. Classification thresholds.
3. Candidate Brilliant and accept/reject.

Maps to R3-T09, R3-T10, R3-T11.

### 16.4 Wave 4: chess context

1. Opening dataset and lookup.
2. Phase heuristic.
3. Threat detection.
4. Critical moments.
5. Deterministic summary.

Maps to R3-T12, R3-T13, R3-T14, R3-T15.

### 16.5 Wave 5: UI

1. Evaluation bar and perspective toggle.
2. Engine panel and progress.
3. Move classification indicators.
4. Move detail with CPL, threats, and brilliant decisions.
5. Summary and critical moment navigation.
6. PV stepping.
7. Mobile and accessibility pass.

Maps to R3-T04, R3-T05, R3-T16.

### 16.6 Wave 6: gate

1. Unit and integration tests.
2. Dev E2E.
3. Production E2E.
4. Performance measurement.
5. Gate G7 evidence.
6. ROADMAP, notices, and handoff updates.

Maps to R3-T17.

---

## 17. Risks

| Risk                                | Mitigation                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| Classification feels subjective     | Centralised thresholds, evidence, caveats, user-visible evals  |
| Candidate Brilliant false positives | Conservative criteria, pending label, accept/reject            |
| Mate transition bugs                | Dedicated table and fixture tests                              |
| Long full-game runs                 | Sequential queue, pause/cancel, cache, progress                |
| Main-thread jank                    | Worker engine, throttled progress, narrow re-renders           |
| Opening dataset size                | Generated JSON, lazy load, EPD index                           |
| Opening data unavailable            | Unknown opening, analysis continues                            |
| Threat claims too strong            | Forced/heuristic labels, max 3, explicit non-exhaustive caveat |
| Cache growth                        | No eviction in R3; document future cleanup                     |
| Stale cache after config change     | Exact cache key, visible configuration                         |
| Browser memory pressure             | Conservative defaults, lower hash/depth guidance               |
| Re-analysis overwrites decisions    | Preserve accept/reject per game and ply                        |
| R1/R2 regression                    | Keep existing E2E suites and production gates                  |

---

## 18. Definition of done

R3 is done when:

- All tasks R3-T01 through R3-T17 are complete.
- Gate G7 passes.
- `npm run check:all` passes.
- `npm run test:e2e` passes.
- `npm run test:e2e:prod` passes.
- R1 and R2 remain green.
- The analysis cache works across reload.
- The full-game queue can pause, resume, cancel, and retry.
- Classifications and summary show caveats.
- Candidate Brilliant can be accepted and rejected.
- Opening, phase, threat, and summary features work offline after the app and dataset load.
- No R4/R5 feature is pulled into R3.
- Documentation and ROADMAP status are updated.
- Evidence is recorded.

---

## 19. Handoff to R4

R3 hands R4:

- A canonical analysis cache keyed by FEN and engine configuration.
- Persisted move assessments with classifications and caveats.
- Opening, phase, threat, critical moment, and summary data.
- A stable engine adapter with progress and cancellation.
- Deterministic fixtures for analysis and summary.
- A production E2E harness extended beyond R2.
- Gate G7 evidence.

R4 consumes selected moments and analysis metadata to build deterministic scenes. R4 must not recompute engine analysis inside the renderer.

---

*Generated from `docs/ROADMAP.md` v1.0 and approved user decisions on 2026-11-23.*
