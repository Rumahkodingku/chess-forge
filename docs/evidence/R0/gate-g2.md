# Gate G2 Evidence: Stockfish Feasibility

- Date: 2026-11-22
- Environment: Linux, Chrome stable, Stockfish 19 Lite WASM
- Status: PASS

## Result

The engine loads in a Web Worker and returns UCI analysis without blocking the interface.

| Check | Result |
| --- | --- |
| Worker load in browser | PASS |
| UCI `uci` / `isready` | PASS |
| MultiPV 3 | PASS |
| Depth 14 | PASS |
| Mate score separation | PASS |
| Stop control | PASS |
| Production build | PASS |

## Observed output

- Engine: `Stockfish 19 Lite WASM`
- First analysis: 902 ms on the reference device
- Depth: 14
- Principal variations: 3
- Mate test: `+M1` on FEN `7k/8/5K2/8/8/8/8/6Q1 w - - 0 1`
- Stop test: state reached `completed` after stop at high depth

## Evidence

- `docs/evidence/R0/engine-proof.png`
- Automated test: `e2e/engine.spec.ts`, passed in 3.9 seconds.

## Cache key

The adapter builds a key from engine version, FEN, depth or movetime, MultiPV, threads, and hash size. Unit tests cover the format.

## Notes

- The build uses `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm` from the `stockfish` npm package.
- Multi-thread remains optional and is not enabled in R0.
- Engine files are served from `public/engine/stockfish/`.
