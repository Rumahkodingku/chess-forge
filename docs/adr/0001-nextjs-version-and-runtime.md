# ADR 0001: Next.js Version and Runtime

- Status: Accepted
- Date: 2026-11-22

## Context

The repository was created with Next.js 16.4.6, React 19.3.0, Tailwind CSS v4, and Node 26.9 locally. The bundled Next.js documentation warns that this version has breaking changes.

## Decision

- Keep Next.js 16.4.6 and React 19.3.0.
- Use Node.js 24 LTS in Docker and CI.
- Read the bundled documentation in `node_modules/next/dist/docs` before framework work.
- Keep `cacheComponents` and `partialPrefetching` enabled.
- Remove the experimental `agentFeedback` option.
- Use npm with the committed `package-lock.json`.

## Consequences

The application uses current App Router behaviour, including Cache Components and Partial Prefetching. Node 26 remains usable locally, but production builds target Node 24. Agents must not rely on older Next.js conventions.

## Alternatives considered

- Downgrade to an older Next.js version: rejected because the scaffold and documentation are already on 16.4.6.
- Use Node 26 in production: rejected because Node 24 is the LTS target for container builds.
