# ADR 0005: Storage Schema

- Status: Accepted
- Date: 2026-11-22

## Context

Games, analysis, assessments, projects, templates, assets, settings, and metadata need local persistence with migrations and quota handling. The application is single-user and local-first.

## Decision

- Use IndexedDB through `idb`.
- Database name: `chessforge`.
- Version: `1`.
- Stores: `games`, `positionAnalyses`, `moveAssessments`, `projects`, `templates`, `assets`, `settings`, `meta`.
- Use repository interfaces for all access.
- Store user-uploaded media as blobs in `assets`.
- Store schema versions on persisted entities.
- Handle quota and migration errors with typed errors.

## Consequences

The UI never opens raw transactions. Media can consume quota, so backups and limits are required. Schema changes require explicit migrations and tests.

## Alternatives considered

- localStorage: rejected for size and synchronous API.
- Dexie: viable, but `idb` is a smaller wrapper for the current schema.
- Server database: rejected by the local-first product constraint.
