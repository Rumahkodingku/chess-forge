# R7 — Error Matrix

**Date:** 2026-11-25
**Spec:** `docs/specs/R7-hardening-and-release.md` §4.2
**Source requirements:** PRD §12
**Phase:** R7
**Status:** Live document. Rows move to `covered` as R7 tasks land.

## How to read this matrix

One row per PRD §12 case. Columns:

- **Area** — PRD §12 group.
- **Case** — the failure being handled.
- **Status**:
  - `covered` — explicit user-facing handling and a recovery path exist, with the
    listed automated test or manual check.
  - `partial` — handling exists, but a listed R7 target (recovery, validation,
    rollback, or test) is still incomplete.
  - `missing` — no user-facing handling.
- **UI** — where the user sees the failure.
- **Recovery** — what the user can do next.
- **Test** — automated test or manual check that proves the path.

Global rules from §4.1 apply to every row: the message states what happened and
what to do next, no stack traces or internal paths are shown, and a failed write
leaves the previous valid state intact.

## Import and game data

| Area | Case | Status | UI | Recovery | Test |
| --- | --- | --- | --- | --- | --- |
| Import and game data | Empty PGN | `covered` | Import error banner: "The PGN input is empty." | Paste or upload a PGN and retry. | `src/features/games/pgn.test.ts` "rejects empty input"; `src/features/games/file-import.test.ts` "rejects an empty file" |
| Import and game data | Invalid PGN syntax | `covered` | Candidate row marked invalid with the parser error; other candidates stay selectable. | Fix the PGN or choose another game from the list. | `src/features/games/pgn.test.ts` "keeps valid candidates when another game is invalid" |
| Import and game data | Illegal SAN move | `covered` | `PgnImportError` names the ply and move: `Illegal SAN move "..."`. | Correct the move in the PGN and import again. | `src/features/games/pgn.test.ts` "reports an illegal SAN with ply and move details" |
| Import and game data | Unsupported variant | `covered` | `PgnImportError` rejects the game; Chess.com chess960 games arrive as import warnings. | Use a standard chess PGN or skip the unsupported game. | `src/features/games/pgn.test.ts` "rejects an unsupported variant"; `src/features/games/adapters/chesscom.test.ts` chess960 warning |
| Import and game data | Multiple games | `covered` | Candidate list with search, per-game selection, and a 200-game cap notice. | Select one game or search to narrow the list. | `src/features/games/pgn.test.ts` "parses multiple games and keeps each original PGN"; candidate cap in `src/features/games/candidates.ts` |
| Import and game data | Very long game | `partial` | A 200-ply game imports and replays without freezing. No documented ply or duration limit yet. | Split or trim the PGN. The supported limit must be documented (R7-T01 gap). | `src/features/games/pgn.test.ts` "parses a 200 ply fixture without freezing" |
| Import and game data | Missing player metadata | `covered` | Missing White/Black tags display as "Unknown"; the game still imports. | Continue with default labels; no blocking error. | Manual check of `metadataFromTags` in `src/features/games/pgn.ts` |
| Import and game data | Incomplete game | `partial` | Result `*` imports and replays. There is no explicit "incomplete game" warning in the import review. | Import anyway and review the moves. Explicit warning is an R7-T01 gap. | `src/features/games/pgn.test.ts` multi-game fixture uses `Result "*"` |
| Import and game data | Network timeout/offline | `covered` | Import error banner from the adapter: "The external service took too long to respond." or "The external service could not be reached." | Check the connection, then retry the fetch; paste a PGN instead. | Manual check of `src/lib/http.ts` `fetchWithTimeout`; adapters return `HttpError` |
| Import and game data | Unknown external username | `covered` | "That Chess.com username was not found." / "That Lichess username was not found." | Check the username spelling and fetch again. | `src/features/games/adapters/chesscom.ts`, `lichess.ts` 404 paths |
| Import and game data | Rate-limited external API | `covered` | "Too many requests. Try again in N seconds." | Wait for the shown interval, then retry. | `src/lib/rate-limit.ts`; Route Handler tests are manual |
| Import and game data | Private/unavailable game | `covered` | "That Lichess game was not found." or the provider's export error. | Use another public game or open it on the provider first. | `src/features/games/adapters/lichess.ts` 404 paths |
| Import and game data | API response format change | `partial` | Adapter validation errors surface as a request failure message. No dedicated "response changed" recovery text. | Retry once; if it persists, paste the PGN manually. Explicit validation recovery is an R7-T01 gap. | `src/features/games/adapters/chesscom.test.ts` "summarizes standard games without parsing their PGN" |

## Engine

| Area | Case | Status | UI | Recovery | Test |
| --- | --- | --- | --- | --- | --- |
| Engine | Stockfish asset fails | `covered` | Engine panel error state; load promise rejects with `ENGINE_ERROR`. | Retry the analysis; verify the engine asset is served, then reload. | `src/features/analysis/engine/stockfish-adapter.test.ts` load/error paths |
| Engine | Worker cannot start | `covered` | "The Stockfish worker failed." in the Engine panel or game-analysis panel. | Retry; reload the page if the worker stays unavailable. | `src/features/analysis/engine/stockfish-adapter.test.ts` "rejects load when the worker fails to start" |
| Engine | Browser memory insufficient | `partial` | Engine error state shows the worker failure or timeout message. No memory-specific message. | Reduce search depth or reload; recovery text is an R7-T01 gap. | Manual check; no dedicated memory test |
| Engine | Unsupported engine option | `partial` | Options are clamped before launch; no explanation is shown when a value is clamped. | Retry with a supported depth/hash; add explanation (R7-T01 gap). | `src/features/analysis/engine/stockfish-adapter.test.ts` "clamps configuration before sending it to the engine" |
| Engine | User stops analysis | `covered` | Latest partial result stays visible; Stop returns the partial analysis. | Resume, restart, or analyse another position. | `src/features/analysis/engine/stockfish-adapter.test.ts` "returns the latest partial result after stop" |
| Engine | Mate score | `covered` | Evaluation renders the mate score; terminal positions skip the worker. | No recovery needed; the position is final. | `src/features/analysis/engine/terminal.test.ts`; "returns terminal positions without starting the worker" |
| Engine | Incomplete analysis | `covered` | Game-analysis panel reports failed ply and keeps completed assessments. | Retry from the failed position; cached work is reused. | `src/features/analysis/queue.test.ts` "returns an error with the failed ply and keeps completed results" |
| Engine | Invalid position | `covered` | Engine rejects the search with `ENGINE_ERROR`; the panel shows the message. | Select a legal position and analyse again. | `src/features/analysis/engine/uci.test.ts` "rejects an invalid FEN before it reaches the engine"; `src/features/analysis/engine/terminal.test.ts` "rejects an invalid FEN" |
| Engine | Cache configuration mismatch | `covered` | Cache key includes engine version, depth, time, MultiPV, threads, and hash; mismatch is a cache miss. | Run analysis again; the new configuration populates the cache. | `src/features/analysis/engine/uci.test.ts` cache-key tests |

## Studio and animation

| Area | Case | Status | UI | Recovery | Test |
| --- | --- | --- | --- | --- | --- |
| Studio and animation | Source game missing | `covered` | Project stores a game snapshot, so the studio opens and renders after the game is deleted. | Continue editing from the snapshot. | `src/features/storage/db.test.ts` "round trips a project with its game snapshot"; `src/features/studio/scene/project-normalization.test.ts` |
| Studio and animation | Scene references invalid ply | `partial` | Normalisation corrects the FEN from the move range and drops invalid keyframes/annotations; no explicit scene warning for an out-of-range ply. | Re-normalise on load; explicit validation warning is an R7-T01 gap. | `src/features/studio/scene/project-normalization.test.ts` "rejects a move range outside the game snapshot" |
| Studio and animation | Unsupported move/position | `covered` | Project validation rejects an invalid scene or move range on save/load. | Fix the scene source or recreate it from an analysed move. | `src/features/studio/scene/project-normalization.test.ts`; `src/features/studio/creation/generate-project.test.ts` "rejects an inverted manual range" |
| Studio and animation | Zero/negative duration | `covered` | Scene schema and operations clamp duration to at least one frame; timeline derives safe durations. | Set a valid duration; the UI clamps the value. | `src/features/studio/rendering/timeline.test.ts` "normalises scene starts and derives project duration"; `src/features/studio/editing/project-operations.test.ts` |
| Studio and animation | Audio asset unavailable | `partial` | Preview warnings list "Audio asset <id> is missing or is not an audio file."; rendering skips the track. | Re-upload the audio asset. No direct link to the audio editor from the warning (R7-T01 gap). | `src/features/studio/rendering/audio.test.ts` "schedules project audio tracks and skips missing assets" |
| Studio and animation | Text exceeds safe area | `covered` | Preview warnings list each overlay that exceeds the safe area. | Shorten or move the text; the warning names the scene. | `src/features/studio/rendering/text-safety.test.ts` |
| Studio and animation | Aspect ratio layout fails | `covered` | Canvas presets resize the project and re-run text-safety warnings. | Pick another aspect preset or adjust overlays. | `src/features/studio/rendering/text-safety.test.ts`; manual studio check |
| Studio and animation | Preview frame fails | `partial` | Remotion Player renders in the studio; no dedicated error boundary or retry around the preview. | Reload the studio. Error boundary/retry is an R7-T01 gap. | Manual check; no dedicated preview-failure test |

## Persistence and backup

| Area | Case | Status | UI | Recovery | Test |
| --- | --- | --- | --- | --- | --- |
| Persistence and backup | IndexedDB unavailable | `covered` | `StorageUnavailableError`: "Browser storage is unavailable." Page load and the global error screen show the message. | Use a current browser with IndexedDB enabled. | Guard in `src/features/storage/db.ts`; manual browser check |
| Persistence and backup | Quota exceeded | `covered` | `StorageQuotaError`: "Browser storage is full." | Remove unused projects or export a backup. | `toStorageError` in `src/features/storage/db.ts`; manual browser quota check |
| Persistence and backup | Migration fails | `covered` | Upgrade errors throw `StorageMigrationError`; a blocked upgrade throws `StorageBlockedError` with "The local database upgrade is blocked by another ChessForge tab." The global error screen shows the message and recovery. | "Close other ChessForge tabs, reload this page, and try again." For a failed upgrade: "Export a backup, then clear site data and re-import." | `src/features/storage/db.test.ts` "surfaces a blocked upgrade as a recoverable error", "rejects a blocked upgrade when another tab keeps the old version open", and the v1→v2 migration test |
| Persistence and backup | Project data corrupted | `partial` | Single-record reads throw `ValidationError` with "Stored project data is invalid." List reads skip corrupt records with a console warning; no dedicated recovery panel. | "Export a backup, then clear site data before re-importing." Skip-with-warning UI is an R7-T01b gap. | `src/features/storage/db.test.ts` "rejects schema drift when reading a stored game"; no project-corruption UI test |
| Persistence and backup | Backup unsupported version | `partial` | Import rejects with "The backup manifest is invalid or uses an unsupported version." The actual version is not shown. | Use a backup from a compatible ChessForge version. Explicit version detail is an R7-T04/T03a gap. | `src/features/storage/backup.test.ts` "rejects a file that is not a ChessForge backup"; no versioned-manifest test |
| Persistence and backup | Backup missing asset | `partial` | Import rejects with "The backup is missing an asset file." before the write transaction starts. | Use a complete application backup. | Code path in `src/features/storage/backup.ts`; no dedicated test |
| Persistence and backup | Restore overwrite | `partial` | Full-app import asks for one confirmation before overwriting. Single-project overwrite with a second confirmation is not implemented yet. | Confirm the overwrite, or cancel and keep local data. | `src/features/settings/settings-workspace.tsx` confirm; single-project path pending R7-T03 |
| Persistence and backup | Restore rollback | `partial` | Full-app restore runs in one `readwrite` transaction over all stores, so a failed write aborts. No injected-failure test and no explicit rollback UI yet. | Retry the import; the previous database stays intact. | `src/features/storage/backup.ts` transaction; failing-transaction test pending R7-T04 |

## Export

| Area | Case | Status | UI | Recovery | Test |
| --- | --- | --- | --- | --- | --- |
| Export | WebCodecs unavailable | `covered` | Export panel capability list marks formats unavailable; `UnsupportedCapabilityError` shows message and recovery. | "Try a current Chrome or Edge desktop browser." | `src/features/studio/export/capabilities.test.ts` "returns undefined when nothing is supported" |
| Export | Codec unsupported | `covered` | Unsupported codecs are removed from the format list; selection falls back to a supported format. | Pick a supported format shown in the panel. | `src/features/studio/export/capabilities.test.ts` "keeps a supported selection and replaces an unsupported one" |
| Export | Container cannot mux | `covered` | Capability check filters formats the browser cannot mux; export rejects with `ExportError`. | Choose a supported container (WebM in CI, MP4 in Chrome/Edge). | `src/features/studio/rendering/export-runner.test.ts` "throws an unsupported capability when nothing renders" |
| Export | Rendering OOM | `partial` | Export panel shows the render error; OPFS failures retry once with `arraybuffer`. No explicit out-of-memory message or cleanup guidance. | Retry with a shorter project or lower resolution. OOM recovery is an R7-T01c gap. | `src/features/studio/rendering/export-runner.test.ts` "retries once with arraybuffer after an OPFS render failure" |
| Export | User cancels | `covered` | Export returns to idle; cancellation is preserved instead of wrapped as a failure. | Start the export again when ready. | `src/features/studio/rendering/export-runner.test.ts` "preserves a cancellation instead of wrapping it" |
| Export | Audio encoding fails | `partial` | Export fails with `ExportError`; no separate audio-retry action. | Retry, or export without audio. Audio recovery is an R7-T01c gap. | `src/features/studio/rendering/export-runner.test.ts` audio paths |
| Export | Empty/invalid output | `covered` | Export validation rejects wrong container, dimensions, codec, duration, or audio metadata before download. | Adjust export settings and retry. | `src/features/studio/export/validate.test.ts` |
| Export | Page closed during export | `covered` | Export state lives in the tab; closing cancels work and no partial file is downloaded. | Reopen the project and export again. | Manual check; export work is aborted with the page |

## Summary

| Status | Rows |
| --- | ---: |
| `covered` | 31 |
| `partial` | 14 |
| `missing` | 0 |

The matrix has no `missing` rows. Remaining `partial` rows map to R7 tasks:
T01 (documented limits, engine memory/option explanations, incomplete-game
warning, API format recovery, preview retry), T01b (corrupt record skip/warning
UI), T01c (export OOM/audio recovery), T03 (single-project overwrite), and T04
(injected restore-failure test and rollback UI).

## R7 changes recorded here

- `StorageBlockedError` (`src/lib/errors.ts`) gives a blocked IndexedDB upgrade
  its own message and recovery: "Close other ChessForge tabs, reload this page,
  and try again."
- `openChessForgeDatabase` now rejects the pending open when `blocked()` fires,
  instead of only logging a console warning. The cached promise is cleared so a
  later retry opens the database again.
- The global error screen (`src/app/error.tsx`) renders `AppError.message` and
  `AppError.recovery`, so migration-blocked and corrupt-record recovery text is
  visible instead of the generic reload copy.
- IndexedDB stays at version 2. No runtime dependency was added.
