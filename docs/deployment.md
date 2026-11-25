# Deployment and Operations

**Scope:** ChessForge is a single-user, local-first web application. The server serves the Next.js application and the external-import proxies. Games, analysis, projects, templates, audio, settings, and Library data stay in the user's browser. The server stores no project data.

This guide covers the release deployment path: Docker, Coolify, the standalone Node server, reverse-proxy basic auth, TLS, security headers, rate limits, the health endpoint, backup and restore, and browser limits.

## 1. Prerequisites

- Docker Engine 24 or newer for the container path.
- Node.js 24 LTS and npm for the standalone path.
- A domain name and TLS certificate for any network deployment.
- A reverse proxy that supports HTTP basic auth, for example nginx or Traefik.
- No application secret is required. Do not commit credentials, auth hashes, or `.env` files.

## 2. Build and run with Docker

```bash
docker build -t chessforge .
docker run --rm -p 3000:3000 chessforge
```

Open http://localhost:3000. The image:

- builds with `npm ci` and `npm run build`;
- runs Next.js standalone output through `node server.js`;
- runs as the non-root user `nextjs` (uid 1001);
- listens on port `3000` and `0.0.0.0`;
- declares a container healthcheck against `/api/health`.

Verify the health endpoint:

```bash
curl -fsS http://localhost:3000/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "service": "chessforge",
  "version": "0.1.0",
  "phase": "R7",
  "timestamp": "2026-11-25T00:00:00.000Z"
}
```

The `timestamp` value changes per request.

Stop the foreground server with `Ctrl+C` before starting the named container on the same port.

Check the container health status and logs:

```bash
docker run -d --name chessforge -p 3000:3000 chessforge
docker inspect --format '{{.State.Health.Status}}' chessforge
docker logs chessforge
```

`healthy` is the expected status after the start period. Remove the test container when finished:

```bash
docker rm -f chessforge
```

The healthcheck runs every 30 seconds with a 5-second timeout, a 20-second start period, and 3 retries.

## 3. Run the standalone server without Docker

Next.js writes the standalone server to `.next/standalone`. The build does not copy `public` or `.next/static` into that folder, so copy them before starting:

```bash
npm ci
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Open http://localhost:3000.

Do not use `next start` with `output: "standalone"`. The `npm run start` script still calls `next start`; use `node .next/standalone/server.js` for a standalone deployment. The Docker image already contains the copied `public` and `.next/static` files.

Stop the server with `Ctrl+C`.

## 4. Deploy on Coolify

The repository contains a Dockerfile, so Coolify can build it directly from Git.

1. Create a new application from the ChessForge Git repository.
2. Select branch `main`.
3. Set the build pack to **Dockerfile**.
4. Set the Dockerfile location to `/Dockerfile` and the base directory to `/`.
5. Expose port `3000`. Do not override the image command; the image starts `node server.js`.
6. Set the healthcheck to HTTP `GET /api/health` on port `3000`, expecting status `200`.
7. Add the public domain and enable the Coolify-managed TLS certificate.
8. Enable HTTPS redirect after the certificate is issued.
9. Enable HTTP basic auth at the proxy. If the installed Coolify version exposes a proxy-auth setting or a Traefik middleware for the application, use it. If it does not, put nginx in front of Coolify as shown in section 5. The application does not implement auth.
10. Deploy and watch the build and runtime logs.

Verify from outside the host:

```bash
curl -fsS https://chess.example.com/api/health
```

Replace `chess.example.com` with the real domain.

### No persistent volume

The application keeps no user data on the server. Do not add a volume for projects, games, or audio. Browser storage is the data store, and each browser profile and origin has its own database. Changing the domain, protocol, or port creates a different origin and therefore a different, empty database.

Warn users before a domain change. Export a full application backup first.

### Single instance

Route Handler rate limits use an in-memory bucket per server process. Restarting the process clears the buckets. Multiple replicas do not share counters. Run one instance for the approved single-user deployment.

## 5. Basic auth at the reverse proxy

Basic auth is not implemented in application code. Terminate it at the proxy. The nginx example below is one option for a VPS or an nginx layer in front of Coolify. A Coolify installation that terminates with Traefik should use an equivalent Traefik basic-auth middleware instead. In both cases, route `/api/health` around the auth middleware so the healthcheck stays reachable.

Generate a password file interactively. The password is not written to the repository or shell history:

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/chessforge.htpasswd chessforge
```

Example nginx server block fragment:

```nginx
server {
    listen 443 ssl;
    server_name chess.example.com;

    ssl_certificate     /etc/letsencrypt/live/chess.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chess.example.com/privkey.pem;

    # Keep the healthcheck reachable without credentials.
    location = /api/health {
        auth_basic off;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location / {
        auth_basic "ChessForge";
        auth_basic_user_file /etc/nginx/chessforge.htpasswd;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Rules:

- Basic auth sends a reversible Base64 credential, not an encrypted one. Use it only over HTTPS.
- Keep the password file outside the Git repository.
- The healthcheck endpoint is exempt so the proxy does not report the container unhealthy with a `401`.
- If the proxy does not set `X-Forwarded-For`, every client shares one rate-limit bucket. If the app is exposed directly, clients can spoof the header. Keep the app behind the trusted proxy and overwrite the header with the real client address.

## 6. TLS

- Use a certificate from Coolify's managed Let's Encrypt flow or the proxy.
- Redirect HTTP to HTTPS.
- Add HSTS at the proxy only after HTTPS works on the real domain.
- Do not terminate TLS inside the container. The container serves plain HTTP on port 3000.

Example redirect block:

```nginx
server {
    listen 80;
    server_name chess.example.com;
    return 301 https://$host$request_uri;
}
```

## 7. Security headers

`next.config.ts` applies these headers to every route:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), fullscreen=(self)` |

Verify them:

```bash
curl -sI https://chess.example.com/ | grep -iE 'x-content-type-options|referrer-policy|x-frame-options|permissions-policy'
```

COOP and COEP are not set. Stockfish is single-threaded, so cross-origin isolation is not required for v1.

Do not remove or relax these headers at the proxy.

## 8. Route Handler rate limits

External import proxies validate input with Zod and limit requests per client key. The client key is the first `X-Forwarded-For` address.

| Route | Limit | Window |
| --- | --- | --- |
| `GET /api/chesscom/archives` | 30 requests | 60 seconds |
| `GET /api/chesscom/games` | 30 requests | 60 seconds |
| `GET /api/lichess/games` | 20 requests | 60 seconds |
| `GET /api/lichess/game/[id]` | 20 requests | 60 seconds |

Upstream requests time out after 10 seconds. A limited request returns HTTP `429` with a message that includes the wait time.

The proxies fetch only public game data selected by the user. They do not forward credentials or private account data.

## 9. Health endpoint

`GET /api/health` returns:

- `status`: `ok`;
- `service`: `chessforge`;
- `version`: application version;
- `phase`: release phase;
- `timestamp`: ISO 8601 time.

Use it for the Docker healthcheck and the Coolify healthcheck. The endpoint does not touch IndexedDB or the network.

## 10. Backup and restore procedure

Back up before every upgrade, domain change, browser profile change, or site-data cleanup. Backups are created and restored in the browser; the server does not store copies.

### Full application backup

1. Open **Settings → Storage**.
2. Select **Export backup**. The file is named `chessforge-backup-YYYY-MM-DD.chessforge.zip`.
3. Store the file outside the browser, on another device or disk.
4. To restore, open **Settings → Storage → Import backup**, choose the ZIP, and confirm the overwrite warning.
5. The app validates the manifest, version, every record, and every asset file before writing. It restores in one IndexedDB transaction and reloads on success.

The archive layout:

```text
manifest.json
data.json
assets/<asset-id>
```

The backup includes `games`, `positionAnalyses`, `moveAssessments`, `projects`, `templates`, `assets`, `settings`, `meta`, `libraryNotes`, `repertoireLines`, and `learningProgress`.

Import replaces the current local database. Export the current state first if it matters.

### Single-project backup

1. Open the project in **Studio**.
2. Select **Export project backup**. The file is named `<project-slug>.chessforge`.
3. To restore, open **Studio** and select **Import project backup**.
4. If the project ID does not exist locally, the project restores directly.
5. If the project ID exists, choose **Restore as copy** or **Overwrite**.
6. **Overwrite** asks for a second confirmation and cannot be undone.

The archive layout:

```text
manifest.json
project.json
assets/<asset-id>
```

A project backup contains one project, its game snapshot, and only the audio assets the project references. Restore verifies every asset hash and rejects a missing or modified asset before writing. Project restore uses one transaction across `projects` and `assets`; a failed restore leaves the previous project intact.

A `.chessforge` project archive is not accepted by the full application import, and a full `.chessforge.zip` is not accepted by the project import. Use the matching screen.

### Verify an archive without restoring

```bash
unzip -l chessforge-backup-2026-11-25.chessforge.zip
unzip -p chessforge-backup-2026-11-25.chessforge.zip manifest.json
```

Replace the file name with the real export. Do not edit the archive contents.

## 11. Browser support and codec limits

Primary target:

- Current stable Chrome or Edge on desktop.
- A browser profile that permits IndexedDB and WebCodecs.
- Hardware acceleration enabled for video export.

Export formats:

| Format | Video codec | Audio codec | Notes |
| --- | --- | --- | --- |
| MP4 | H.264 | AAC | Preferred where the browser exposes the codecs. |
| WebM | VP9 | Opus | Portable fallback used by CI and Chromium builds without H.264. |
| WebM | VP8 | Opus | Compatibility fallback. |

The export panel detects capabilities at runtime, disables unsupported formats, and shows the reason. A browser without a supported WebCodecs format shows `No supported export format. Try current Chrome or Edge.`

Limits:

| Item | Limit |
| --- | --- |
| Export duration | 15 minutes hard cap; warning from 5 minutes |
| PGN file | 5 MB |
| Audio file | 50 MB or 10 minutes |
| Project media | 250 MB total |
| Import proxy timeout | 10 seconds |

Firefox and Safari are not release targets for video export. Codec and muxer behaviour differs, and the export matrix is verified on Chrome and Edge only. WebM is the portable output; MP4 depends on the browser and operating system codec set.

Long exports can use the Origin Private File System (OPFS) when available. Without OPFS, a long export holds output in memory and needs more RAM.

## 12. Upgrade procedure

1. Export a full application backup from the current deployment.
2. Build and tag the new image:

   ```bash
   docker build -t chessforge .
   ```

3. Deploy the new image.
4. Check `/api/health` and the container health status.
5. Open the app in a browser and confirm existing local data still loads.
6. If the database upgrade fails or is blocked, follow `docs/troubleshooting.md` before clearing any site data.

The server keeps no user data, so a failed deployment does not delete browser projects. A browser database that fails to upgrade can still block the app; keep the backup.

## 13. Operator checklist

- [ ] `docker build -t chessforge .` succeeds.
- [ ] `docker run --rm -p 3000:3000 chessforge` starts.
- [ ] `/api/health` returns `200` with `status: "ok"`.
- [ ] The domain resolves and HTTPS redirects work.
- [ ] Basic auth protects the app and `/api/health` stays reachable for the healthcheck.
- [ ] Security headers are present.
- [ ] Rate limits return `429` after the configured burst.
- [ ] A full backup exports and restores in a test browser profile.
- [ ] A project backup exports, restores as a copy, and restores with overwrite.
- [ ] No secret, password, or auth hash is committed.
