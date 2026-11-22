# ADR 0012: Production E2E Gate

- Status: Accepted
- Date: 2026-11-22

## Context

R1 Gate G5 explicitly requires the walking skeleton to pass in a production build. The existing Playwright suite runs against `next dev`, which does not prove the standalone build or production client bundles.

## Decision

- Keep the fast dev E2E suite.
- Add `playwright.production.config.ts`.
- Build with `next build`, serve on port 3100, and run the R1 flow with Playwright Chromium.
- Use WebM as the CI export format.
- Run the production test in CI after the production build.

## Consequences

CI time increases, but the gate proves the actual production bundle. MP4 remains a manual Chrome/Edge check because Playwright Chromium may lack proprietary codecs.

## Alternatives considered

- Dev-only E2E: faster, but does not satisfy G5.
- Full production suite for every test: slower feedback than necessary.
