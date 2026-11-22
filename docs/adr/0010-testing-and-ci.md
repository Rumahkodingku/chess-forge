# ADR 0010: Testing and CI

- Status: Accepted
- Date: 2026-11-22

## Context

The project needs fast unit tests, DOM component tests, browser E2E tests, and a CI path that does not depend on live external services.

## Decision

- Use Vitest with jsdom for unit and component tests.
- Use Testing Library for UI behaviour.
- Use Playwright for E2E tests.
- Use fake-indexeddb for repository tests.
- Use WebM in Playwright Chromium because bundled Chromium may lack H.264/AAC.
- Use installed Chrome or Edge for MP4 validation.
- CI runs lint, typecheck, unit tests, build, and Playwright smoke tests.
- No numeric coverage threshold in R0.

## Consequences

CI is deterministic and offline for game imports. MP4 export validation remains a manual or system-browser check until the browser matrix is stable.

## Alternatives considered

- Jest: viable, but Vitest integrates with the current Vite ecosystem.
- Cypress: rejected in favour of Playwright's browser coverage.
