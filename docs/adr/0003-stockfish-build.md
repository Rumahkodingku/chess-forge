# ADR 0003: Stockfish Build

- Status: Accepted, subject to Gate G2
- Date: 2026-11-22

## Context

ChessForge needs a browser Stockfish build that supports UCI, MultiPV, Web Workers, and production bundling. Multi-threaded builds require SharedArrayBuffer and cross-origin isolation.

## Decision

- Use the `stockfish` npm package version 19.0.1.
- Start with the `stockfish-19-lite-single` WebAssembly build.
- Keep single-thread as the default.
- Set `Hash`, `Threads`, and `MultiPV` through UCI.
- Copy the engine JavaScript and WASM into `public/engine/stockfish/`.
- Keep multi-thread as an optional capability after the R0 proof.

## Consequences

The engine is compatible with pages that are not cross-origin isolated. Strength is lower than the full build. The engine is GPL-3.0, so the licence and source offer must ship with the app.

## Alternatives considered

- `@lichess-org/stockfish-web`: rejected because it is AGPL-3.0-or-later and adds network-use obligations.
- Full single-thread build: larger download, strength benefit not proven for R0.
- Multi-thread by default: rejected because it forces COOP/COEP and reduces compatibility.
