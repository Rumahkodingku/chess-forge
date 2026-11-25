# R8 — Chess Library

**Spec version:** 1.0
**Status:** Implemented; code gates passed; human content sign-off pending
**Phase:** R8
**PRD mapping:** New module; supports G-03 and the target user's study goals
**Exit gate:** G12
**Depends on:** Gate G10 (R6). No hard dependency on R7 hardening.
**Handoff to:** R9, or R7 hardening if R8 runs before release hardening
**Last updated:** 2026-11-24

---

## 1. Purpose

Chess Library is the study layer of ChessForge. It turns the existing game, analysis, opening, and engine data into a connected learning workspace:

- explore named opening lines;
- understand documented continuations and engine alternatives;
- save personal repertoire lines and notes;
- review weaknesses from the user's own analysed games;
- practise tactics, repertoire, and opening recognition;
- read original strategy, tactics, middlegame, and endgame articles.

R8 must not duplicate the existing Game, Analysis, Studio, Stockfish, Chessground, or storage domains. It reuses them at their existing boundaries.

The module is fully offline for all core features. Network access remains limited to the existing user-triggered game import flows and optional external links inside reference content.

---

## 2. Scope

### 2.1 In scope

- New `/library` workspace with five areas: Openings, Repertoire, Practice, My Games, Reference.
- Offline Opening Explorer built from the CC0 `lichess-org/chess-openings` dataset.
- Counters & Defenses view based on named continuations plus on-demand Stockfish analysis.
- 5,000 bundled Lichess puzzles under CC0, rating 600–2400.
- Interactive puzzle trainer with correct/incorrect feedback and progress.
- Repertoire review using saved lines.
- Opening recall exercises.
- Personal repertoire lines and freeform notes.
- My Games browser with filtering and Analysis integration.
- Insight dashboard from persisted `MoveAssessment` data.
- Mistake trainer generated from the user's own mistakes.
- 30 original reference articles across Strategy, Tactics, Middlegame, and Endgame.
- Player-name aliases in Settings for side-aware insights.
- IndexedDB v2 with three new stores.
- Unit, integration, dev E2E, production E2E, and Gate G12 evidence.
- Data generation scripts for openings and puzzles.
- Third-party licence and attribution updates.

### 2.2 Out of scope

- Lichess Opening Explorer API or any authenticated external opening statistics.
- Lichess tablebase API.
- Local Syzygy tablebases.
- Bundled PGN Mentor data.
- Cloud sync, accounts, tokens, or multi-user Library data.
- Full branching repertoire tree editor.
- Elo, puzzle rating changes, timed modes, or leaderboards.
- Automatic AI commentary or generated chess explanations.
- Video Studio integration from Library lines.
- Backup/restore implementation. R8 data must be included when the R7 backup format is implemented.
- Chess variants other than standard chess.
- Changes to the PRD or roadmap in this spec.

### 2.3 Approved decisions

| Topic                | Decision                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Product direction    | Personal study plus opening explorer                                                                                                           |
| Data strategy        | Fully offline core; no external API, token, or account                                                                                         |
| Feature scope        | Opening Explorer, Counters & Defenses, Strategy & Tactics, Middlegame & Endgame, Repertoire & Notes, Learn From My Games, Interactive Learning |
| Reference content    | 30 original long-form articles, 700–1,000 words each                                                                                           |
| Puzzle source        | Lichess puzzle database, CC0                                                                                                                   |
| Puzzle count         | 5,000                                                                                                                                          |
| Puzzle rating        | 600–2400 inclusive                                                                                                                             |
| Repertoire model     | Line-based, not a full branching tree editor                                                                                                   |
| Notes                | Freeform notes attached to opening, position, game, move, article, repertoire line, or puzzle                                                  |
| Player identity      | `playerNames` list in Settings; no per-game side field                                                                                         |
| Counters definition  | Named continuations plus engine analysis; no popularity claims                                                                                 |
| Interactive Learning | Puzzle trainer, repertoire review, opening recall                                                                                              |
| Review scheduler     | Leitner intervals: 1, 3, 7, 14, 30 days                                                                                                        |
| My Games             | Included as a Library area                                                                                                                     |
| Reference language   | English, matching the current UI                                                                                                               |
| Dependencies         | No new runtime dependencies                                                                                                                    |
| Content licence      | Original ChessForge content; no copied third-party text                                                                                        |
| Database             | IndexedDB v2 with three new stores                                                                                                             |
| Settings             | Settings v2 with `playerNames: string[]`                                                                                                       |

---

## 3. User flows

### 3.1 Opening Explorer

```text
Library -> Openings
  -> Search by opening name or ECO
  -> Select an opening line
  -> Board shows the position
  -> Play legal moves on the board or click a move in the line
  -> Read ECO, name, EPD, and named continuations
  -> Add the line to repertoire
  -> Add a note
  -> Analyse the position with Stockfish
```

### 3.2 Counters & Defenses

```text
Library -> Openings -> Counters
  -> Select an opening or defence
  -> See named continuations from the offline dataset
  -> Choose a continuation
  -> Board follows the line
  -> Analyse with Stockfish for engine alternatives
```

### 3.3 Repertoire and notes

```text
Library -> Repertoire
  -> Create a line manually or from Openings
  -> Choose side, name, ECO, priority, tags
  -> Add line notes
  -> Save locally
  -> Review the line or open it on the board
```

```text
Library -> Openings/Game/Article/Position
  -> Add note
  -> Write body and tags
  -> Save
  -> Note appears in the target and in Library search
```

### 3.4 My Games and insights

```text
Library -> My Games
  -> Filter by player, result, source, opening, analysis status, side
  -> Open a game in Analysis
  -> Open Insights
  -> Review opening performance, phase performance, classification distribution
  -> Practice a mistake position
```

### 3.5 Interactive Learning

```text
Library -> Practice
  -> Choose Puzzles, Repertoire, or Opening recall
  -> Configure rating/theme or select a saved line
  -> Answer on the board or with a choice
  -> Receive correct/incorrect feedback
  -> See the solution when wrong
  -> Progress and next review are saved
```

### 3.6 Reference

```text
Library -> Reference
  -> Search or filter by category
  -> Open an article
  -> Read sections and diagrams
  -> Mark complete
  -> Add a note
  -> Open a related opening or puzzle theme
```

---

## 4. Information architecture

### 4.1 Routes

```text
/library
/library/openings
/library/openings?fen=<encoded-fen>&line=<uci-comma-list>
/library/repertoire
/library/repertoire/[lineId]
/library/practice
/library/games
/library/games/[gameId]/insights
/library/reference
/library/reference/[slug]
```

`/library` is a landing page with:
- global search;
- due review count;
- recent notes;
- continue reading;
- links to the five areas.

### 4.2 Navigation

Add a `library` item to the existing `Library` navigation group:

```text
Workspace
  Dashboard
  Analysis
  Studio

Library
  Chess Library
  Templates
  Settings
```

Add a `library` icon to `NavIconName` and `NavIcon`.

### 4.3 Page shell

- `PageHeader` title and description on each area.
- Tabs or segmented links for Openings, Repertoire, Practice, My Games, Reference.
- Active route is derived from `usePathname`.
- Mobile: tabs scroll horizontally; no hidden primary actions.
- Board-first layout on mobile; details and notes below the board.

---

## 5. Data sources and licensing

### 5.1 Opening data

- Source: `https://github.com/lichess-org/chess-openings`
- Licence: CC0 1.0
- Use: ECO, opening name, move sequence, EPD, ply.
- Storage: generated JSON committed to the repository.
- Update path: `scripts/build-openings.mjs`.
- Runtime: dynamic import and in-memory tree.

### 5.2 Puzzle data

- Source: `https://database.lichess.org/lichess_db_puzzle.csv.zst`
- Licence: CC0 1.0
- Use: 5,000 selected puzzles with FEN, solution moves, rating, themes, opening tags, and source game URL.
- Storage: generated JSON committed to the repository.
- Update path: `scripts/build-library-puzzles.mjs`.
- Generator: run manually, not during `next build`; accept a `.csv` or `.csv.zst` input and use Node zstd where available.
- Runtime: dynamic import and in-memory index.

### 5.3 Reference content

- 30 original articles written for ChessForge.
- No third-party article text is copied.
- Diagrams use FEN positions and the existing board renderer.
- Content is stored as typed TypeScript data, validated by Zod.

### 5.4 Rejected sources

| Source                       | Reason                                                 |
| ---------------------------- | ------------------------------------------------------ |
| Lichess Opening Explorer API | Requires authentication; rate-limited; not local-first |
| Lichess tablebase API        | Network dependency and rate limits; deferred           |
| Local Syzygy tables          | Multi-terabyte; not suitable for browser delivery      |
| PGN Mentor                   | Redistribution licence unclear; do not bundle          |
| Third-party strategy books   | Copyright and adaptation risk; do not copy             |

### 5.5 Attribution

Update `docs/THIRD_PARTY_NOTICES.md` with:
- `chess-openings` CC0 1.0;
- Lichess puzzle database CC0 1.0;
- original ChessForge reference articles;
- source URLs and generation script names.

---

## 6. Static data models

### 6.1 Opening entry

Extend the generated opening entry:

```ts
export interface OpeningEntry {
  eco: string;
  name: string;
  epd: string;
  ply: number;
  moves: string[]; // SAN moves from the standard initial position
}
```

Rules:
- `ply === moves.length`.
- `epd` is the first four FEN fields after replaying `moves`.
- Every move is legal in sequence.
- The generated file keeps the existing `source` and `licence` fields.
- Existing entries without `moves` are invalid for R8.

### 6.2 Opening tree

Build at runtime from the generated entries:

```ts
export interface OpeningNode {
  id: string; // stable path key, for example "start|e4|e5"
  fen: string;
  epd: string;
  parentId: string | null;
  move: { san: string; uci: string } | null;
  names: Array<{ eco: string; name: string }>;
  childIds: string[];
}

export interface OpeningTree {
  rootId: string;
  nodes: Map<string, OpeningNode>;
}
```

Functions:

```ts
export function buildOpeningTree(entries: OpeningEntry[]): OpeningTree;
export function openingNodeAtFen(
  tree: OpeningTree,
  fen: string,
): OpeningNode | undefined;
export function namedContinuations(
  tree: OpeningTree,
  nodeId: string,
): Array<{ node: OpeningNode; eco?: string; name?: string }>;
export function searchOpenings(
  tree: OpeningTree,
  query: string,
): Array<{ node: OpeningNode; eco: string; name: string }>;
```

Rules:
- The tree is a prefix trie of move sequences.
- Transpositions appear as separate branches.
- EPD is used for opening-name matching, not for branch deduplication.
- The root node is the standard initial position.
- The deepest name at a node is the primary name.
- Multiple names at one node are allowed.

### 6.3 Puzzle

```ts
export interface LibraryPuzzle {
  id: string;
  fen: string;
  moves: string[]; // UCI; first move is the opponent setup move
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string[];
  openingTags: string[];
  gameUrl?: string;
}
```

Rules:
- Rating is 600–2400 inclusive.
- `moves.length >= 2`.
- The first move is applied before the user answers.
- The remaining moves alternate opponent/user.
- Every move is legal from the previous position.
- The puzzle is presented from the user's side to move after setup.
- `gameUrl`, when present, is an external link only and is not required for solving.

#### 6.3.1 Selection rules

The generator must produce exactly 5,000 puzzles from this candidate set:

- rating 600–2400 inclusive;
- rating deviation at most 100;
- popularity at least 50;
- at least 100 plays;
- valid FEN and a legal setup move;
- at least two moves in the solution field.

Primary-theme quotas:

| Primary theme                   |    Target |
| ------------------------------- | --------: |
| `mateIn1`, `mateIn2`, `mateIn3` |       900 |
| `fork`                          |       700 |
| `pin`                           |       600 |
| `skewer`                        |       500 |
| `discoveredAttack`              |       500 |
| `hangingPiece`                  |       500 |
| `backRankMate`                  |       400 |
| `endgame`                       |       400 |
| `sacrifice`                     |       300 |
| `deflection`                    |       200 |
| **Total**                       | **5,000** |

Rules:
- A puzzle is assigned one primary theme using the table order.
- Each theme bucket is filled by popularity descending, then rating distance to 1500 ascending, then puzzle ID ascending.
- If a bucket cannot be filled, fill the remainder from unfilled candidates by the same ordering.
- The generator fails if fewer than 5,000 valid candidates remain.
- The generated file records source, licence, selection rules version, and puzzle count.

### 6.4 Reference article

```ts
export type ReferenceCategory =
  | "strategy"
  | "tactics"
  | "middlegame"
  | "endgame";

export type ReferenceBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "diagram";
      fen: string;
      orientation?: "w" | "b";
      caption: string;
      highlights?: string[];
    }
  | { type: "callout"; tone: "tip" | "warning" | "note"; text: string };

export interface ReferenceArticle {
  id: string;
  slug: string;
  category: ReferenceCategory;
  title: string;
  summary: string;
  readingMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  blocks: ReferenceBlock[];
  keyTakeaways: string[];
  related: Array<{
    type: "opening" | "puzzle-theme" | "article";
    id: string;
    label: string;
  }>;
  schemaVersion: 1;
}
```

Content rules:
- 30 articles total.
- Category split: 8 Strategy, 8 Tactics, 7 Middlegame, 7 Endgame.
- 700–1,000 words per article, excluding diagrams and key takeaways.
- Every article has at least two diagrams.
- Every article has at least three key takeaways.
- Every diagram FEN is valid.
- Slugs are unique and URL-safe.
- Article text is original.

#### 6.4.1 Article plan

Strategy (8):
1. Space and Piece Activity
2. Pawn Structure as a Long-Term Asset
3. Weak Squares and Outposts
4. Open Files and Rook Activity
5. Piece Coordination and Harmony
6. The Art of the Exchange
7. Prophylaxis: Stop the Plan Before It Starts
8. Converting a Static Advantage

Tactics (8):
1. Pins: Absolute and Relative
2. Forks and Double Attacks
3. Skewers and Line Clearance
4. Discovered Attacks and Discovered Checks
5. Deflection and Overloading
6. Back-Rank Weakness
7. Removing the Defender
8. Sacrifices for Initiative and Mate

Middlegame (7):
1. Initiative and Tempo
2. King Safety in the Middlegame
3. Pawn Breaks and Central Tension
4. Choosing the Right Exchange
5. Attacking a Castled King
6. Defending a Worse Position
7. Converting an Advantage Without Risk

Endgame (7):
1. King Activity and Opposition
2. Passed Pawns: Creation and Promotion
3. Rook Endgames: Activity and Cutting Off
4. Opposite-Coloured Bishops
5. Triangulation and Zugzwang
6. Lucena Position
7. Philidor Position

---

## 7. Runtime domain model

### 7.1 Settings v2

```ts
export const applicationSettingsSchema = z
  .object({
    // existing fields unchanged
    playerNames: z.array(z.string().trim().min(1).max(80)).max(20),
    schemaVersion: z.literal(2),
  })
  .strict();

export interface ApplicationSettings {
  // existing fields
  playerNames: string[];
  schemaVersion: 2;
}
```

Defaults:
- `playerNames: []`
- `schemaVersion: 2`

Migration:
- Settings v1 records are normalized by adding `playerNames: []` and setting `schemaVersion: 2`.
- Invalid settings still produce the existing recoverable validation error.
- `createSettingsRepository.get()` returns normalized settings.
- `DEFAULT_SETTINGS` uses v2.

### 7.2 Library note

```ts
export const libraryNoteTargetTypeSchema = z.enum([
  "opening",
  "position",
  "game",
  "move",
  "article",
  "repertoire",
  "puzzle",
]);

export type LibraryNoteTargetType = z.infer<
  typeof libraryNoteTargetTypeSchema
>;

export const libraryNoteSchema = z
  .object({
    id: z.string().uuid(),
    targetType: libraryNoteTargetTypeSchema,
    targetId: z.string().min(1),
    targetLabel: z.string().min(1),
    body: z.string().trim().min(1).max(20_000),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    pinned: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();
```

Rules:
- `targetId` is stable: EPD for openings, FEN/EPD for positions, game UUID, `gameId:ply` for moves, article slug, repertoire UUID, puzzle ID.
- `targetLabel` is a denormalized display label and may be updated on edit.
- Notes are deleted explicitly; no cascade deletion in v1.
- A note can be pinned; pinned notes appear first in Library search.

### 7.3 Repertoire line

```ts
export const repertoirePrioritySchema = z.enum([
  "core",
  "secondary",
  "idea",
]);

export const repertoireMoveSchema = z
  .object({
    san: z.string().min(1),
    uci: z.string().min(4).max(5),
    note: z.string().max(2_000).optional(),
  })
  .strict();

export const repertoireLineSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    side: z.enum(["white", "black"]),
    eco: z.string().max(3).optional(),
    openingName: z.string().max(160).optional(),
    startFen: z.string().min(1),
    moves: z.array(repertoireMoveSchema).min(1).max(80),
    notes: z.string().max(20_000),
    priority: repertoirePrioritySchema,
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();
```

Rules:
- `startFen` defaults to the standard initial position.
- The move list is validated with chess.js before save.
- `side` describes the user's side, not the side to move at the start.
- A line can be duplicated; the duplicate gets a new UUID and `createdAt`.
- Line-based repertoire only; branching is represented by multiple lines.
- Deleting a line requires confirmation.

### 7.4 Learning progress

```ts
export const learningItemTypeSchema = z.enum([
  "puzzle",
  "repertoire-line",
  "opening-recall",
  "reference",
  "game-mistake",
]);

export type LearningItemType = z.infer<typeof learningItemTypeSchema>;

export const learningProgressSchema = z
  .object({
    id: z.string().min(1), // `${itemType}:${itemId}`
    itemType: learningItemTypeSchema,
    itemId: z.string().min(1),
    attempts: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    streak: z.number().int().nonnegative(),
    intervalDays: z.number().int().nonnegative(),
    nextReviewAt: z.string().min(1),
    lastResult: z.enum(["correct", "incorrect"]).optional(),
    lastReviewedAt: z.string().optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strict();
```

Leitner rules:

```text
incorrect -> intervalDays = 0, streak = 0, nextReviewAt = now
correct   -> streak += 1
             intervalDays = [1, 3, 7, 14, 30][min(streak - 1, 4)]
             nextReviewAt = now + intervalDays
```

- Initial progress has `attempts: 0`, `correct: 0`, `streak: 0`, `intervalDays: 0`, and `nextReviewAt = now`.
- Due items are `nextReviewAt <= now`.
- The scheduler is pure and injectable with `now` for tests.

### 7.5 Player side resolution

```ts
export function resolveUserSide(
  game: Pick<Game, "metadata">,
  playerNames: string[],
): "w" | "b" | null;
```

Rules:
- Normalize names with trim, lower-case, and collapsed internal whitespace.
- Compare against `metadata.white` and `metadata.black`.
- Exactly one match: return that side.
- Both match or neither match: return `null`.
- Never guess from source, result, or ratings.
- Games with `null` are excluded from side-specific insight and mistake training.

### 7.6 Insight types

```ts
export interface OpeningInsight {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  asWhite: number;
  asBlack: number;
  mistakes: number;
  blunders: number;
}

export interface PhaseInsight {
  phase: "opening" | "middlegame" | "endgame";
  moves: number;
  mistakes: number;
  blunders: number;
  averageCentipawnLoss: number | null;
}

export interface MistakeCandidate {
  gameId: string;
  ply: number;
  fenBefore: string;
  san: string;
  classification: MoveClassification;
  centipawnLoss?: number;
  userSide: "w" | "b";
  opening?: string;
}

export interface GameInsights {
  analyzedGames: number;
  gamesWithKnownSide: number;
  gamesWithoutKnownSide: number;
  openingInsights: OpeningInsight[];
  phaseInsights: PhaseInsight[];
  classificationCounts: Record<MoveClassification, number>;
  criticalThemes: string[];
  mistakes: MistakeCandidate[];
  caveats: string[];
}
```

---

## 8. IndexedDB v2 and repositories

### 8.1 Database version

```ts
export const DB_VERSION = 2;
```

Upgrade function:

```ts
upgrade(database, oldVersion) {
  if (oldVersion < 1) {
    createV1Stores(database);
  }
  if (oldVersion < 2) {
    createLibraryStores(database);
  }
}
```

Rules:
- Fresh databases create all v1 and v2 stores.
- Existing v1 databases keep all existing data.
- Upgrade failures raise `StorageMigrationError`.
- Tests cover fresh install and v1-to-v2 migration.

### 8.2 Store definitions

```ts
interface ChessForgeDB extends DBSchema {
  // existing stores unchanged

  libraryNotes: {
    key: string;
    value: LibraryNote;
    indexes: {
      targetType: string;
      targetId: string;
      target: [string, string];
      updatedAt: string;
    };
  };

  repertoireLines: {
    key: string;
    value: RepertoireLine;
    indexes: {
      side: string;
      eco: string;
      priority: string;
      updatedAt: string;
    };
  };

  learningProgress: {
    key: string;
    value: LearningProgress;
    indexes: {
      itemType: string;
      nextReviewAt: string;
      due: [string, string];
      updatedAt: string;
    };
  };
}
```

### 8.3 Repository interfaces

```ts
export interface LibraryNoteRepository {
  getById(id: string): Promise<LibraryNote | undefined>;
  listByTarget(
    targetType: LibraryNoteTargetType,
    targetId: string,
  ): Promise<LibraryNote[]>;
  listAll(): Promise<LibraryNote[]>;
  save(note: LibraryNote): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RepertoireRepository {
  getById(id: string): Promise<RepertoireLine | undefined>;
  list(): Promise<RepertoireLine[]>;
  listBySide(side: "white" | "black"): Promise<RepertoireLine[]>;
  save(line: RepertoireLine): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LearningProgressRepository {
  get(itemType: LearningItemType, itemId: string): Promise<LearningProgress | undefined>;
  listDue(itemType?: LearningItemType, now?: string): Promise<LearningProgress[]>;
  listAll(): Promise<LearningProgress[]>;
  save(progress: LearningProgress): Promise<void>;
  delete(itemType: LearningItemType, itemId: string): Promise<void>;
}
```

All repositories parse stored records with Zod and raise the existing `ValidationError` on corrupt data.

---

## 9. Feature specifications

### 9.1 Opening Explorer

#### 9.1.1 Data loading

- Dynamically import the generated opening JSON.
- Build the tree once at module scope.
- Cache the tree for the session.
- Show a skeleton while loading.
- If loading fails, show a recoverable error; other Library areas remain usable.

#### 9.1.2 Board

- Reuse Chessground through a new optional interactive mode.
- Default orientation follows the user's board theme settings.
- Legal moves are shown for the side to move.
- Drag and click moves are both supported.
- Last move is highlighted.
- Check is highlighted.
- Board label is “Opening explorer board”.
- Move history is keyboard accessible through the move list.

#### 9.1.3 Move list and navigation

- First, previous, next, and last controls.
- Click a move to jump to that ply.
- Reset to the starting position.
- Flip orientation.
- Copy line as SAN and as UCI.
- URL updates with the current FEN and line.

#### 9.1.4 Details

Show:
- ECO and opening name of the deepest matching node.
- EPD.
- Current line.
- Named continuations.
- Source attribution for `chess-openings`.
- Actions: add to repertoire, add note, analyse.

#### 9.1.5 Search

- Match name and ECO.
- Case-insensitive.
- Prefix matches rank above substring matches.
- Show at most 50 results.
- Empty query shows a short list of common first moves, not a random dump.

#### 9.1.6 Edge cases

- Position has no named opening: show “Unnamed position”.
- FEN in URL is invalid: ignore it and show the root with a warning.
- Line in URL is illegal: discard the invalid suffix and show the last legal position.
- Transposition: display the current move path; do not claim a unique path.
- Dataset unavailable: show error with retry.
- No Stockfish: analysis action shows the existing engine error; exploration still works.

### 9.2 Counters & Defenses

#### 9.2.1 Definition

“Counter” means a documented continuation in the offline opening dataset. It does not mean popularity, win rate, or objective best move.

#### 9.2.2 UI

- Mode switch inside Openings: Explore / Counters.
- Select an opening or defence from search.
- Show named child continuations with ECO and name.
- Click a continuation to follow it.
- “Analyse” opens the existing engine panel for the current FEN.
- Label the section “Named continuations”.
- Label engine results “Engine lines”.
- Add a caveat: named lines are documentation, not frequency data.

#### 9.2.3 Data

- No new store.
- No network request.
- Engine analysis uses the existing `BrowserStockfishEngine`.

### 9.3 Personal Repertoire & Notes

#### 9.3.1 Repertoire list

- Cards or rows with name, side, ECO, priority, move count, due count.
- Filter by side, priority, and ECO.
- Sort by updated, name, priority, or due.
- Empty state with “Explore openings” CTA.
- Delete confirmation.

#### 9.3.2 Repertoire editor

- Name, side, ECO, opening name, priority, tags.
- Start FEN defaults to the standard start.
- Move input:
  - from the current board position,
  - legal move validation with chess.js,
  - optional per-move note.
- Save validates the full line.
- Cancel restores the last saved state.
- Unsaved changes warn on close.

#### 9.3.3 Repertoire from Opening Explorer

- Prefill name, ECO, side, start FEN, and moves.
- If the line already exists, offer “Open existing” or “Duplicate”.
- Never overwrite an existing line silently.

#### 9.3.4 Notes panel

- Add, edit, pin, and delete notes.
- Target type and target ID are fixed by the current context.
- Body is plain text; line breaks preserved.
- Tags are optional.
- Pinned notes appear first.
- Notes are included in global Library search.

### 9.4 Learn From My Games

#### 9.4.1 My Games list

- Load all games through `GameRepository`.
- Search by player, event, and opening.
- Filter by result, source, analyzed status, and user side.
- Show a compact row:
  - White vs Black,
  - result,
  - ply count,
  - source,
  - event/date,
  - analysis status.
- Actions:
  - open Analysis,
  - open Insights,
  - practice mistakes.

#### 9.4.2 Insight computation

Inputs:
- all games,
- assessments by game,
- opening index,
- player names,
- settings engine configuration for caveats.

Rules:
- Only games with at least one assessment count as analysed.
- Only games with a known user side count toward side-specific stats.
- Opening comes from `findGameOpening` or PGN metadata; prefer the computed opening when available.
- Phase comes from `classifyPhases`.
- Classification counts come from `MoveAssessment`.
- Average CPL ignores mate scores and missing CPL.
- Critical themes come from persisted `threats` and repeated classification patterns.
- The UI always shows a caveat about heuristic classification and sample size.

#### 9.4.3 Mistake selection

- Include user moves with:
  - classification `mistake` or `blunder`, or
  - CPL >= 100.
- Exclude moves where the user side is unknown.
- Sort by CPL descending, then by recency.
- Limit the initial list to 50.
- Deduplicate by `gameId:ply`.

#### 9.4.4 Mistake trainer

- Show the position before the user's move.
- Ask “Find a better move”.
- User answers on the board.
- Compare with the engine best move:
  - use `PositionAnalysis` cache first;
  - otherwise run Stockfish on demand;
  - use the existing engine settings.
- Feedback:
  - user move,
  - best move,
  - CPL from the stored assessment,
  - classification,
  - link to Analysis.
- If the engine is unavailable, show the stored assessment and a clear error, not a fake best move.
- Do not claim the engine best move is the only correct move.

### 9.5 Interactive Learning

#### 9.5.1 Puzzle setup

```ts
export interface PuzzleSetup {
  puzzleId: string;
  fen: string;
  lastMove?: string;
  sideToMove: "w" | "b";
  expectedUci: string;
  solution: string[];
}
```

Rules:
- Apply `moves[0]` to the puzzle FEN before showing the board.
- `lastMove` is the opponent setup move.
- `expectedUci` is `moves[1]`.
- The solution includes the remaining UCI moves.
- If the setup move is illegal, the puzzle is invalid and must not be shown.

#### 9.5.2 Answer validation

```ts
export function isCorrectPuzzleMove(
  puzzle: LibraryPuzzle,
  moveUci: string,
): boolean;
```

Rules:
- Exact UCI match is correct.
- If the expected move is a mate and the user's move is a different mate, accept it.
- Otherwise, an alternative move is incorrect.
- The board prevents illegal moves through chess.js.
- After a correct answer, play the remaining solution automatically or step it.
- After an incorrect answer, show the expected move, keep the user's move visible, and allow retry on the same puzzle once.

#### 9.5.3 Puzzle selection

- Filter by rating and theme.
- Prefer due progress items.
- Then prefer unseen items.
- Then fill by deterministic rating proximity.
- Do not repeat the same puzzle within a session unless the user asks.
- Session length defaults to 10 and is configurable up to 50.

#### 9.5.4 Repertoire review

- Select a saved line.
- Pick a random ply, injectable RNG for tests.
- Show the position before the next move.
- Ask for the next move.
- Compare with the line.
- Correct: advance progress for `repertoire-line`.
- Incorrect: show the expected move and add the line to the due queue.

#### 9.5.5 Opening recall

- Generate questions from named opening entries:
  - “Which opening is this?” with four choices.
  - “What is the next named move?” with legal move choices.
- Use ECO/name data only.
- Prefer openings the user has saved in repertoire.
- Progress is stored under `opening-recall` with `itemId = epd` for the named position.
- Options are deterministic for a given question seed.

#### 9.5.6 Progress UI

- Due count.
- Streak.
- Correct/attempt ratio.
- Last result.
- “Review due” action.
- Empty state when no progress exists.

### 9.6 Reference

#### 9.6.1 Library

- Categories: Strategy, Tactics, Middlegame, Endgame.
- Search title, summary, and block text.
- Filter difficulty.
- Show reading time and diagram count.
- Mark complete.
- Notes per article.

#### 9.6.2 Article reader

- Render blocks in order.
- Diagrams use the read-only Chessground board.
- Captions are always visible.
- Key takeaways appear before related links.
- Related links navigate to opening, puzzle theme, or article.
- Unknown related IDs are ignored with a warning in development, not a crash.
- Reading progress is stored under `reference` with `itemId = slug`.

#### 9.6.3 Content review

- The 30 article drafts are reviewed by the user before the content task is marked done.
- Diagrams are validated by tests.
- No copied text.
- Claims that depend on position or engine depth include a caveat.

---

## 10. Search

### 10.1 Global search

- Input on `/library`.
- Search across:
  - opening names and ECO,
  - repertoire line names and tags,
  - notes,
  - games,
  - reference article titles and summaries,
  - puzzle themes.
- Group results by type.
- Show at most 10 per group.
- Use `useDeferredValue` for input.
- No fuzzy dependency; normalize and rank exact, prefix, then substring.

### 10.2 Per-area search

- Openings: name/ECO.
- Repertoire: name, ECO, tags.
- My Games: player, event, opening.
- Reference: title, summary, body.
- Practice: theme and rating filters, not free-text.

### 10.3 Search index

```ts
export interface LibrarySearchIndex {
  openings: Array<{ id: string; label: string; href: string; text: string }>;
  repertoire: Array<{ id: string; label: string; href: string; text: string }>;
  notes: Array<{ id: string; label: string; href: string; text: string }>;
  games: Array<{ id: string; label: string; href: string; text: string }>;
  articles: Array<{ id: string; label: string; href: string; text: string }>;
}
```

- Build in memory from loaded static data and repositories.
- Rebuild when notes, repertoire, or games change.
- Do not index full game move text.

---

## 11. UI and UX requirements

- Follow the existing dark-first design system and component vocabulary.
- Use `PageHeader`, `Card`, `Tabs`, `Button`, `Input`, `Select`, `EmptyState`, `Skeleton`, and existing board/theme components.
- Board remains the dominant visual element.
- Desktop Openings layout:
  - search/tree column,
  - board column,
  - details/notes column.
- Desktop Practice layout:
  - session controls,
  - board,
  - feedback/progress.
- Mobile:
  - board first,
  - tabs for details/notes,
  - move list scrolls horizontally.
- Loading, empty, success, warning, and error states are required.
- Keyboard:
  - move list controls are buttons,
  - opening search has a label,
  - practice answers can be entered by board or move list,
  - dialogs trap focus through existing primitives.
- Reduced motion is respected for board animations and page transitions.
- All buttons have accessible names.
- Do not use color alone to indicate correct/incorrect.

---

## 12. Error handling

| Condition                        | Behaviour                                               |
| -------------------------------- | ------------------------------------------------------- |
| Opening dataset fails to load    | Show retry; other Library areas remain usable           |
| Puzzle dataset fails to load     | Show retry; Openings and Reference remain usable        |
| Invalid FEN from URL             | Ignore it and show the root                             |
| Illegal line in URL              | Drop the invalid suffix                                 |
| Invalid stored note              | Repository raises validation error and skips the record |
| Invalid stored repertoire line   | Repository raises validation error and skips the record |
| Invalid stored progress          | Repository deletes or skips the record with a warning   |
| Storage unavailable              | Existing storage error UI with recovery action          |
| Quota exceeded                   | Existing quota error UI                                 |
| Stockfish unavailable            | Existing engine error; no fake best move                |
| Puzzle setup illegal             | Exclude puzzle from the pool and report in development  |
| Reference related target missing | Ignore the link and log a development warning           |
| Duplicate repertoire line        | Offer open or duplicate; never overwrite                |
| Unknown user side                | Exclude from side-specific stats; show explanation      |

---

## 13. Performance

- Dynamic imports:
  - opening JSON only on Openings;
  - puzzle JSON only on Practice;
  - reference content only on Reference.
- Build opening tree once per session.
- Build puzzle index once per session.
- Use `useMemo` for filtered lists.
- Use `useDeferredValue` for search.
- Limit rendered search results to 50.
- Do not load full game move text into search.
- Do not run Stockfish automatically on page load.
- Mistake trainer runs the engine only after the user asks for analysis.
- Target initial `/library` JavaScript without static datasets.
- Bundle budgets:
  - opening JSON < 1.5 MB;
  - puzzle JSON < 2 MB;
  - reference content < 600 KB;
  - no single dynamic chunk over 2.5 MB.

---

## 14. Integration points

### 14.1 Analysis

- Add “Open in Library” for the identified opening.
- Add “Save note” for the current position or move.
- Add “Add to repertoire” when an opening exists.
- Reuse the existing opening lookup.

### 14.2 Dashboard

- Add a Chess Library card with:
  - due reviews,
  - recent note,
  - continue reading.
- Link to `/library`.
- Do not block dashboard load on Library data; use a local async card.

### 14.3 Settings

- Add “Player names” field in General settings.
- Add/remove names.
- Save through the existing settings repository.
- Explain that names are used only for side-aware Library insight.

### 14.4 Storage

- Add new stores to the database schema.
- Add repositories.
- Include new stores in future backup/restore.
- Do not modify existing store records.

---

## 15. Testing

### 15.1 Unit tests

- `opening-tree.test.ts`
  - build tree from fixtures;
  - root exists;
  - legal child moves;
  - deepest name;
  - transposition naming;
  - search ranking;
  - invalid line handling.
- `puzzle.test.ts`
  - setup move applied;
  - side to move;
  - exact solution accepted;
  - alternative mate accepted;
  - wrong move rejected;
  - illegal setup rejected.
- `repertoire.test.ts`
  - validate legal line;
  - reject illegal line;
  - duplicate line;
  - side and priority filters.
- `notes.test.ts`
  - target lookup;
  - pin ordering;
  - validation.
- `aliases.test.ts`
  - exact match;
  - case-insensitive;
  - whitespace normalization;
  - both-match null;
  - no-match null.
- `insights.test.ts`
  - opening aggregation;
  - phase aggregation;
  - CPL average ignores mate;
  - unknown side excluded;
  - mistake selection.
- `review.test.ts`
  - Leitner intervals;
  - incorrect reset;
  - due ordering;
  - injectable time.
- `settings-migration.test.ts`
  - v1 settings normalized to v2;
  - invalid settings rejected.
- `library-search.test.ts`
  - exact/prefix/substring ranking;
  - group limits;
  - empty query.
- `reference.test.ts`
  - 30 articles;
  - unique slugs;
  - valid categories;
  - valid diagrams;
  - key takeaway minimum.

### 15.2 Integration tests

- `db.test.ts`
  - fresh v2 database creates all stores;
  - v1 database upgrades to v2 without losing games, projects, templates, settings;
  - new repositories round-trip records;
  - corrupt note/line/progress is handled.
- `opening-loader.test.ts`
  - generated JSON has moves;
  - every entry builds;
  - count is at least 3,000.
- `puzzle-loader.test.ts`
  - 5,000 puzzles;
  - rating range;
  - theme minimums;
  - all setup moves legal.
- `library-page.test.tsx`
  - shell renders;
  - loading/empty/error states;
  - tab navigation.
- `puzzle-trainer.test.tsx`
  - correct answer;
  - incorrect answer;
  - solution reveal;
  - progress saved.
- `notes-panel.test.tsx`
  - add/edit/pin/delete.
- `repertoire-editor.test.tsx`
  - create from explorer;
  - validation error;
  - unsaved change warning.

### 15.3 Dev E2E

Create `e2e/r8-library.spec.ts`:

1. Open `/library`, verify five areas.
2. Search an opening, play a move, verify board and ECO.
3. Add a line to repertoire, edit notes, reload, verify persistence.
4. Solve one puzzle correctly and one incorrectly, verify feedback and progress.
5. Open My Games, filter, open insights, start a mistake drill.
6. Open a reference article, mark complete, add note.
7. Verify global search returns opening, note, and article results.

### 15.4 Production E2E

Create `e2e/r8-production.spec.ts`:

- Production build.
- `/library` loads without runtime dataset errors.
- Opening search and board work.
- Puzzle trainer loads offline.
- Reference article loads.
- No external request is required for core Library features.

### 15.5 Migration test

- Seed a v1 database with one game, one project, one template, and settings.
- Open with DB v2.
- Verify all records survive.
- Verify new stores exist and are writable.
- Verify settings `playerNames` default is present.

### 15.6 Content validation

- 30 articles exactly.
- Category split matches the spec.
- Word count per article is 700–1,000.
- Every diagram FEN is legal.
- No duplicate slug.
- No placeholder text.
- User review sign-off recorded in Gate G12 evidence.

---

## 16. Acceptance criteria and Gate G12

### 16.1 Feature acceptance

| ID     | Criterion                                                            |
| ------ | -------------------------------------------------------------------- |
| LIB-01 | `/library` loads with five areas                                     |
| LIB-02 | Opening search returns named and ECO matches                         |
| LIB-03 | Opening board supports legal moves and navigation                    |
| LIB-04 | Named continuations display with honest labels                       |
| LIB-05 | Repertoire line can be created, edited, persisted, and reopened      |
| LIB-06 | Notes can be attached to all supported targets                       |
| LIB-07 | My Games lists all local games and filters work                      |
| LIB-08 | Player aliases resolve side correctly; ambiguous games are unknown   |
| LIB-09 | Insights aggregate opening, phase, classification, and mistakes      |
| LIB-10 | Mistake trainer compares against engine best move without fake data  |
| LIB-11 | 5,000 validated puzzles load offline                                 |
| LIB-12 | Puzzle correct/incorrect feedback works                              |
| LIB-13 | Repertoire review works                                              |
| LIB-14 | Opening recall works                                                 |
| LIB-15 | Progress uses the Leitner schedule                                   |
| LIB-16 | 30 validated original articles load                                  |
| LIB-17 | Reference diagrams render                                            |
| LIB-18 | Global search finds openings, notes, games, repertoire, and articles |
| LIB-19 | DB v1 migrates to v2 without data loss                               |
| LIB-20 | Settings v1 migrates to v2 with empty player names                   |
| LIB-21 | No new runtime dependency                                            |
| LIB-22 | Core Library works without network                                   |
| LIB-23 | Loading, empty, error, and keyboard states are present               |
| LIB-24 | Dev E2E and production E2E pass                                      |
| LIB-25 | Licence notices updated                                              |

### 16.2 Gate G12

Gate G12 passes only when:

- `npm run check:all` passes.
- All R8 unit and integration tests pass.
- `e2e/r8-library.spec.ts` passes.
- `e2e/r8-production.spec.ts` passes.
- DB migration test passes.
- Data validation tests pass.
- Content review sign-off exists.
- `docs/THIRD_PARTY_NOTICES.md` is updated.
- `docs/evidence/R8/gate-g12.md` records commands, results, and known limitations.

---

## 17. Task order

### 17.1 Wave 0 — Foundation

| Task                                                      | Depends on     | Acceptance                                 |
| --------------------------------------------------------- | -------------- | ------------------------------------------ |
| R8-T01 Extend opening generator with moves                | none           | Generated entries have valid moves and EPD |
| R8-T02 Build puzzle generator and 5,000 puzzle JSON       | none           | Count, rating, themes, legal setup         |
| R8-T03 Add Library Zod schemas                            | R8-T01, R8-T02 | Types and parsers pass                     |
| R8-T04 Bump DB to v2 and add stores                       | R8-T03         | Fresh and migrated DB tests pass           |
| R8-T05 Add repositories for notes, repertoire, progress   | R8-T04         | Round-trip and corruption tests pass       |
| R8-T06 Add Settings v2 and `playerNames`                  | R8-T04         | Migration tests pass                       |
| R8-T07 Add navigation, icon, and `/library` shell         | R8-T04         | Routes render; tabs work                   |
| R8-T08 Add static content schema and 30 article skeletons | R8-T03         | Validation tests pass                      |

### 17.2 Wave 1 — Opening Explorer and Counters

| Task                                                   | Depends on     | Acceptance                         |
| ------------------------------------------------------ | -------------- | ---------------------------------- |
| R8-T09 Implement opening tree, search, and node lookup | R8-T01         | Unit tests pass                    |
| R8-T10 Build interactive Library board                 | R8-T07         | Legal move and keyboard tests pass |
| R8-T11 Build Opening Explorer UI                       | R8-T09, R8-T10 | Search, board, move list, details  |
| R8-T12 Add named continuations and engine panel        | R8-T11         | Counters view and engine action    |
| R8-T13 Add URL state and deep links                    | R8-T11         | FEN/line URLs restore              |
| R8-T14 Add add-to-repertoire and note actions          | R8-T05, R8-T11 | Persistence tests pass             |

### 17.3 Wave 2 — Repertoire and Notes

| Task                                               | Depends on     | Acceptance                          |
| -------------------------------------------------- | -------------- | ----------------------------------- |
| R8-T15 Build repertoire list and filters           | R8-T05, R8-T14 | List, filter, delete                |
| R8-T16 Build repertoire editor and validator       | R8-T15         | Create, edit, duplicate, validation |
| R8-T17 Build notes panel and target integration    | R8-T05         | Add/edit/pin/delete                 |
| R8-T18 Add unsaved-change and delete confirmations | R8-T16, R8-T17 | Browser guard tests                 |

### 17.4 Wave 3 — My Games and Insights

| Task                                       | Depends on     | Acceptance                              |
| ------------------------------------------ | -------------- | --------------------------------------- |
| R8-T19 Add player alias matching           | R8-T06         | Alias tests pass                        |
| R8-T20 Build My Games list and filters     | R8-T07, R8-T19 | List and filters                        |
| R8-T21 Build insight aggregation           | R8-T19         | Insight tests pass                      |
| R8-T22 Build insight UI                    | R8-T21         | Opening, phase, classification, caveats |
| R8-T23 Build mistake selection and trainer | R8-T21         | Engine/cache fallback tests             |
| R8-T24 Add Analysis integration actions    | R8-T14, R8-T23 | Open, note, repertoire, practice        |

### 17.5 Wave 4 — Practice

| Task                                         | Depends on       | Acceptance                   |
| -------------------------------------------- | ---------------- | ---------------------------- |
| R8-T25 Implement puzzle setup and validation | R8-T02           | Unit tests pass              |
| R8-T26 Implement Leitner scheduler           | R8-T05           | Scheduler tests pass         |
| R8-T27 Build puzzle trainer UI and session   | R8-T25, R8-T26   | Correct/incorrect/progress   |
| R8-T28 Build repertoire review               | R8-T16, R8-T26   | Next-move review             |
| R8-T29 Build opening recall                  | R8-T09, R8-T26   | Name and next-move questions |
| R8-T30 Build practice progress and due queue | R8-T27 to R8-T29 | Due review UI                |

### 17.6 Wave 5 — Reference

| Task                                             | Depends on     | Acceptance                   |
| ------------------------------------------------ | -------------- | ---------------------------- |
| R8-T31 Write 30 original articles                | R8-T08         | Word count, diagrams, review |
| R8-T32 Build reference list, search, and filters | R8-T31         | List and search              |
| R8-T33 Build article reader and diagrams         | R8-T32         | Render tests                 |
| R8-T34 Add article notes and completion progress | R8-T33, R8-T17 | Persistence                  |
| R8-T35 Add related links to openings/puzzles     | R8-T33         | Valid navigation             |

### 17.7 Wave 6 — Integration, search, and gate

| Task                                            | Depends on             | Acceptance                           |
| ----------------------------------------------- | ---------------------- | ------------------------------------ |
| R8-T36 Build global Library search              | R8-T15, R8-T20, R8-T32 | Ranking and grouping                 |
| R8-T37 Add Dashboard Library card               | R8-T36                 | Due, note, reading                   |
| R8-T38 Add licence notices and data attribution | R8-T01, R8-T02, R8-T31 | Notices complete                     |
| R8-T39 Add dev E2E                              | R8-T37                 | `r8-library.spec.ts` passes          |
| R8-T40 Add production E2E                       | R8-T39                 | `r8-production.spec.ts` passes       |
| R8-T41 Run Gate G12 and record evidence         | R8-T40                 | `check:all`, E2E, migration, content |

---

## 18. File structure

### 18.1 Routes

```text
src/app/(app)/library/page.tsx
src/app/(app)/library/openings/page.tsx
src/app/(app)/library/repertoire/page.tsx
src/app/(app)/library/repertoire/[lineId]/page.tsx
src/app/(app)/library/practice/page.tsx
src/app/(app)/library/games/page.tsx
src/app/(app)/library/games/[gameId]/insights/page.tsx
src/app/(app)/library/reference/page.tsx
src/app/(app)/library/reference/[slug]/page.tsx
```

### 18.2 Feature modules

```text
src/features/library/types.ts
src/features/library/schemas.ts
src/features/library/search.ts
src/features/library/openings/tree.ts
src/features/library/openings/search.ts
src/features/library/openings/continuations.ts
src/features/library/openings/load.ts
src/features/library/openings/openings.generated.json
src/features/library/repertoire/model.ts
src/features/library/repertoire/repository.ts
src/features/library/repertoire/review.ts
src/features/library/notes/model.ts
src/features/library/notes/repository.ts
src/features/library/practice/puzzle.ts
src/features/library/practice/puzzle-session.ts
src/features/library/practice/review.ts
src/features/library/practice/opening-recall.ts
src/features/library/practice/repertoire-review.ts
src/features/library/games/aliases.ts
src/features/library/games/insights.ts
src/features/library/games/mistakes.ts
src/features/library/reference/schema.ts
src/features/library/reference/index.ts
src/features/library/reference/articles/strategy/*.ts
src/features/library/reference/articles/tactics/*.ts
src/features/library/reference/articles/middlegame/*.ts
src/features/library/reference/articles/endgame/*.ts
src/features/library/puzzles/puzzles.generated.json
src/features/library/puzzles/load.ts
```

### 18.3 Components

```text
src/features/library/components/library-shell.tsx
src/features/library/components/library-board.tsx
src/features/library/components/library-search.tsx
src/features/library/components/opening-explorer.tsx
src/features/library/components/opening-tree.tsx
src/features/library/components/opening-details.tsx
src/features/library/components/opening-continuations.tsx
src/features/library/components/repertoire-list.tsx
src/features/library/components/repertoire-editor.tsx
src/features/library/components/notes-panel.tsx
src/features/library/components/practice-session.tsx
src/features/library/components/puzzle-trainer.tsx
src/features/library/components/repertoire-trainer.tsx
src/features/library/components/opening-recall.tsx
src/features/library/components/games-list.tsx
src/features/library/components/game-insights.tsx
src/features/library/components/mistake-trainer.tsx
src/features/library/components/reference-list.tsx
src/features/library/components/reference-article.tsx
```

### 18.4 Modified files

```text
src/features/storage/db.ts
src/features/settings/types.ts
src/features/settings/settings-workspace.tsx
src/lib/navigation.ts
src/components/layout/nav-icon.tsx
src/app/(app)/dashboard/page.tsx
src/features/dashboard/recent-work.tsx
src/app/(app)/analysis/[gameId]/page.tsx
scripts/build-openings.mjs
docs/THIRD_PARTY_NOTICES.md
```

### 18.5 New scripts

```text
scripts/build-library-puzzles.mjs
```

---

## 19. Risks

| Risk                                      | Impact                       | Mitigation                                                    |
| ----------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| 30 long articles take too long            | Scope delay                  | Write in waves; review each category; enforce 700–1,000 words |
| 5,000 puzzle bundle too large             | Slow Library load            | Lazy import, size test, dynamic chunk                         |
| Opening tree transpositions confuse users | Wrong breadcrumb expectation | Show move path; name by EPD; explain                          |
| Player aliases ambiguous                  | Wrong side insight           | Return null; exclude; show explanation                        |
| Mistake trainer engine cost               | Slow feedback                | Use cache first; run on demand; limit list                    |
| DB v2 migration corrupts data             | Data loss                    | Repository tests and migration test before merge              |
| Repertoire line-based model feels limited | Users expect branching       | Multiple lines; branch editor deferred                        |
| Reference content quality varies          | Trust loss                   | User review, consistent template, caveats                     |
| Puzzle selection biases to mate           | Narrow training              | Theme quotas and rating filters                               |
| Global search slow with all data          | UI lag                       | Lazy data, deferred input, group limits                       |
| New stores omitted from backup            | Data loss on restore         | Add to R7 backup manifest when implemented                    |

---

## 20. Definition of Done

R8 is done when:

- All in-scope features are implemented.
- All new boundaries use Zod and repository access.
- TypeScript strict passes with no `any`.
- No new runtime dependency was added.
- DB v2 migration is tested from a v1 database.
- Settings v2 migration is tested.
- 5,000 puzzles and 30 articles are validated.
- Opening data includes legal move sequences.
- Core Library works with the network disabled.
- Loading, empty, success, warning, and error states exist.
- Keyboard and accessible names are present.
- Existing Analysis, Studio, Dashboard, and Settings behaviour is unchanged.
- `npm run check:all` passes.
- Dev and production E2E pass.
- `docs/THIRD_PARTY_NOTICES.md` is updated.
- Gate G12 evidence is recorded.

---

## 21. Handoff and roadmap note

This spec reserves phase R8 because R7 is already assigned to hardening and release in `docs/ROADMAP.md`.

The roadmap insertion is a separate documentation change and is not part of this spec. Until that change is approved:

- implementation may start after Gate G10;
- R7 hardening remains independent;
- the backup/restore work in R7 must include the three new Library stores when it is implemented;
- release evidence must state whether R8 shipped before or after R7.
