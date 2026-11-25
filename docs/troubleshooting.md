# Troubleshooting

**Scope:** This guide covers the storage, migration, backup, restore, engine, export, and browser failures a ChessForge operator or user can meet in the release build.

First checks:

1. Confirm the deployed build is healthy:

   ```bash
   curl -fsS https://chess.example.com/api/health
   ```

2. Use a current desktop Chrome or Edge. Firefox and Safari are not release targets for video export.
3. Open DevTools and read the Console and Application → IndexedDB panels.
4. Do not clear site data, uninstall the browser, or reset the profile before exporting a backup. Clearing site data deletes every local game, project, template, and asset.

The server stores no project data. A server restart or redeploy cannot recover browser data.

## Storage unavailable

**Message:** `Browser storage is unavailable. Use a current browser with IndexedDB enabled.`

**Cause:** IndexedDB cannot open. Common reasons are a private window, a browser policy that blocks site data, an extension that blocks storage, or an unsupported browser.

**Recovery:**

1. Open the app in a normal Chrome or Edge window, not a private window.
2. Allow site data for the ChessForge origin in the browser settings.
3. Disable storage-blocking extensions for the site, then reload.
4. Check DevTools → Application → IndexedDB. A `chessforge` database should appear after a successful load.
5. Confirm the browser is current stable Chrome or Edge.

If the database exists but cannot open, do not clear it. The data may still be recoverable from the same browser profile.

## Storage quota exceeded

**Message:** `Browser storage is full. Remove unused projects or export a backup.`

**Cause:** The origin reached the browser storage quota. Large audio files and long projects consume the most space.

**Recovery:**

1. Open **Settings → Storage** and read the usage figure.
2. Export a full backup before deleting anything.
3. Delete unused projects and remove unused audio tracks.
4. If usage does not fall, note that this release does not garbage-collect unreferenced audio blobs. Export each project you need as a `.chessforge` archive, clear site data, and restore those project archives. A full application backup includes every stored asset, so restoring it does not reduce usage. Keep the full backup if you also need games, analysis, and Library history.
5. Select **Request persistent storage**. This asks the browser to keep the origin data; it is not a quota increase and the browser may refuse.
6. Free disk space on the device. Browsers size quota from available disk.
7. Retry the save or import.

Media limits are 50 MB or 10 minutes per audio file and 250 MB per project. A project near the limit can still exceed the browser quota when other projects and assets share the origin.

## Database upgrade blocked

**Message:** `The local database upgrade is blocked by another ChessForge tab. Close other ChessForge tabs, reload this page, and try again.`

**Cause:** Another tab or window still holds the previous IndexedDB version open, so the v1 → v2 upgrade cannot start.

**Recovery:**

1. Close every ChessForge tab and window for the same origin.
2. Close other browser windows that may still run the app.
3. Reopen one tab and load the app again.
4. If the browser keeps a background process alive, quit the browser completely and start it again.

Do not open several tabs while an upgrade is pending. Do not delete the database.

## Database upgrade failed

**Message:** `The local database could not be upgraded. Export a backup, then clear site data and re-import.`

**Cause:** The upgrade transaction failed. Possible reasons are a full disk, a browser storage fault, or a damaged database.

**Recovery:**

1. Do not clear site data yet.
2. Free disk space and close other tabs.
3. Try current Chrome or Edge in the same profile.
4. If the app opens, export a full backup immediately.
5. If the app does not open, keep the original browser profile; it remains the recovery source. Do not clear it.
6. Reload once. If the same message returns, report the browser version, the exact message, and whether DevTools shows the `chessforge` database.

Clearing site data removes the only local copy of the data. Use it only after a verified backup or when the data is expendable.

## Corrupt project or asset

**Message:** `A stored project was damaged and was skipped. Export a backup, then clear site data and re-import.`

**Cause:** One IndexedDB project record does not match the project schema. Valid projects still load.

**Recovery:**

1. Confirm the rest of the studio list still opens. The app remains usable.
2. Export a full backup if the app allows it.
3. If the damaged project appears in **Studio**, delete it and recreate it from a project backup or from the source game.
4. If the project cannot be removed, restore a full backup from before the damage. Full-app import replaces the whole local database after one confirmation.
5. If the import rejects the backup with an invalid `projects` record, that archive still contains the corrupt record. Try an older backup. Import validation runs before writing, so the reject leaves the current database unchanged.

A missing or corrupt asset produces a project warning such as `Audio asset <id> is missing or is not an audio file.` Re-upload the file from the project audio panel, or remove the track. For a corrupt asset record, re-upload the audio file.

Do not edit IndexedDB records by hand unless you accept data loss and can restore a backup.

## Backup uses an unsupported version

**Message:** `The backup manifest is invalid or uses an unsupported version. Use a backup created by a compatible ChessForge version.`

**Cause:** The archive is not a supported backup, uses a newer format, or was opened in the wrong import screen.

**Formats:**

| Archive | Manifest `format` | Manifest `version` | Import screen |
| --- | --- | --- | --- |
| Full application `.chessforge.zip` | `chessforge-backup` | `1` | Settings → Storage → Import backup |
| Single project `.chessforge` | `chessforge-project` | `1` | Studio → Import project backup |

**Recovery:**

1. Inspect the manifest without extracting or editing the archive:

   ```bash
   unzip -p chessforge-backup-2026-11-25.chessforge.zip manifest.json
   ```

2. Check the `format` and `version` values against the table.
3. Use the matching import screen. A project archive is not a full application backup.
4. If the version is newer than the running application, deploy a compatible ChessForge version. Backups are not forward-compatible.
5. If the manifest is missing or unreadable, use another copy of the backup.

Do not rename a project archive to `.zip` and expect the full import to accept it. The manifest decides.

## Backup is missing an asset

**Messages:**

- Full application import: `The backup is missing an asset file.`
- Project import: `The project backup is missing the audio file for <asset-id>.`
- Project import: `The audio file <asset-id> does not match its recorded checksum.`

**Cause:** The ZIP does not contain a referenced `assets/<asset-id>` entry, or the file was changed after export.

**Recovery:**

1. Verify the archive contents:

   ```bash
   unzip -l chessforge-backup-2026-11-25.chessforge.zip
   ```

2. Use a complete backup exported by ChessForge. Do not remove or replace files inside the archive.
3. For a project, open the project, re-upload the missing audio, and export a fresh project backup.
4. For the full application backup, export a fresh backup from a working browser profile.
5. Retry the import. Both import paths validate assets before writing, so a failed import leaves the current data intact.

Do not edit `manifest.json` or `data.json` to bypass the check. The hash and file checks protect the project from silent corruption.

## Stockfish fails to load or respond

**Messages:** `The Stockfish worker failed.` or `Stockfish did not respond in time.`

**Cause:** The engine script or WebAssembly file is missing, blocked, or the worker cannot start.

**Recovery:**

1. Request the two engine files directly:

   ```bash
   curl -I https://chess.example.com/engine/stockfish/stockfish-19-lite-single.js
   curl -I https://chess.example.com/engine/stockfish/stockfish-19-lite-single.wasm
   ```

   Both must return `200`. The script should be served as JavaScript and the WASM file as `application/wasm`.

2. Confirm the deployment copied `public/` into the image or the standalone folder. The Dockerfile does this; a manual standalone start needs the `cp -r public .next/standalone/` step.
3. Confirm the reverse proxy does not block `.wasm` files or rewrite `/engine/`.
4. Disable content blockers for the site and reload.
5. Hard-reload the page to clear a stale engine script.
6. If the engine starts but stops on a large search, lower the depth or movetime in the engine settings and retry. Close other memory-heavy tabs.
7. In Docker, check the logs and the health status:

   ```bash
   docker logs chessforge
   docker inspect --format '{{.State.Health.Status}}' chessforge
   ```

The engine runs in a Web Worker. A blocked worker, a missing asset, or a proxy that serves the WASM file with the wrong MIME type prevents analysis even when the rest of the app works.

## Export format unavailable

**Messages:** `No supported export format. Try current Chrome or Edge.` or a disabled export button with an unsupported-format issue.

**Cause:** The browser does not expose a supported WebCodecs encoder or cannot mux the container.

**Recovery:**

1. Use current stable desktop Chrome or Edge.
2. Keep hardware acceleration enabled in the browser settings.
3. Choose WebM / VP9 / Opus when MP4 is unavailable. WebM is the portable fallback.
4. Update the browser and the operating system codecs, then reload.
5. Check DevTools → Console for capability errors before retrying.

MP4 H.264/AAC depends on the browser and platform codec set. Chromium builds used in CI often support only WebM. Firefox and Safari are not release targets for export.

## Export runs out of memory

**Message:** `The browser ran out of memory while rendering.` The panel shows **Retry export** and, for an audio failure, **Retry without audio**.

**Cause:** A long or high-resolution render exceeded the tab memory budget.

**Recovery:**

1. Lower the export resolution from 1080p to 720p.
2. Shorten the project, or split it into shorter exports.
3. Select **Retry without audio** when the failure names audio.
4. Close other tabs and applications, then retry.
5. Free disk space. Long exports can use OPFS when available; without it, output stays in memory.
6. Keep the export tab open and foregrounded.

The export runner releases its output and leaves the project unchanged. No partial video is downloaded. The 15-minute hard cap and 5-minute warning exist to keep exports inside realistic memory limits.

## Page closed during export

**Symptom:** The export stops and no file appears.

**Cause:** Rendering runs in the tab. Closing the tab, navigating away, or letting the device sleep cancels the work.

**Recovery:**

1. Reopen the project. Saved project data is unchanged.
2. Export again and keep the tab open until the download appears.
3. Prevent the device from sleeping during long exports.
4. Use a shorter export or lower resolution if the browser is under memory pressure.

There is no server-side render queue and no resume-after-close feature. A cancelled export does not leave a partial download.

## Restore overwrote the wrong project or database

**Cause:** Full application import replaces the local database after one confirmation. Single-project **Overwrite** replaces that project and its referenced audio after a second confirmation.

**Recovery:**

1. Do not save new work over the restored state.
2. Restore the backup that contains the desired data. Full application import replaces everything again; single-project overwrite replaces only that project.
3. If the desired project still exists, use **Restore as copy** next time to keep both versions.
4. If a project restore fails, the transaction aborts and the previous project remains. Read the error, keep the archive, and retry after the cause is fixed.
5. Export a fresh full backup after the correct state is restored.

There is no undo for a completed overwrite. Export before every overwrite.

## Deployment checks

| Symptom | Check | Fix |
| --- | --- | --- |
| `502` from the proxy | `docker logs chessforge`; `curl -fsS http://127.0.0.1:3000/api/health` | Start the container and confirm it listens on port 3000. |
| Healthcheck `unhealthy` | `docker inspect --format '{{.State.Health.Status}}' chessforge` | Confirm `/api/health` returns `200` inside the container. |
| Proxy returns `401` for the healthcheck | Proxy auth covers `/api/health` | Exempt `/api/health` from basic auth, or give the healthcheck credentials outside the repository. |
| Every client hits the rate limit at once | Proxy does not set `X-Forwarded-For` | Set and overwrite `X-Forwarded-For` at the proxy. |
| Static assets or engine files `404` | Request `/engine/stockfish/stockfish-19-lite-single.js` | Rebuild the image; a manual standalone start must copy `public` and `.next/static`. |
| App works on the old domain but not the new one | Browser origin changed | Export from the old origin, then import on the new origin. |

## Reporting a problem

Record:

- the exact user-facing message;
- browser name and version;
- the `/api/health` response;
- whether the failure happens in a fresh browser profile;
- the steps that led to the failure.

Do not attach a full browser profile, a project archive with private audio, or any credential. A minimal reproduction and the console error are enough for a first report.
