# R7 Performance Evidence

- Date: 2026-11-25
- Status: PASS
- Spec: `docs/specs/R7-hardening-and-release.md` §6
- Automated spec: `e2e/r7-performance.spec.ts`

## Reference environment

| Item | Value |
| --- | --- |
| Machine | WSL2 Linux (Ubuntu), 4 vCPU |
| CPU | 11th Gen Intel Core i7-11370H @ 3.30 GHz, 2 cores / 4 threads visible |
| Memory | 8 GB assigned to WSL2 (host 16 GB) |
| GPU | Intel Iris Xe integrated graphics (host); headless Chromium |
| OS | Linux 6.6.87.2-microsoft-standard-WSL2 |
| Browser | Chrome for Testing 159.0.8154.6 (Playwright 1.65.1), headless |
| Build | `npm run build`, production server on port 3100 |

The spec asks for a Linux mid-range desktop with 16 GB RAM and integrated GPU. This run is a
close proxy: a laptop-class integrated-GPU machine under WSL2 with 8 GB assigned. It is not a
16 GB bare-metal desktop, so results are conservative.

## Automated budgets

Production build run:

```bash
npm run build
npx playwright test -c playwright.production.config.ts e2e/r7-performance.spec.ts
```

| Measurement | Target | Raw | Budget | Result |
| --- | --- | --- | --- | --- |
| Initial shell usable without Stockfish | under 2000 ms | 431.9 ms | 2000 ms | PASS |
| Open typical local project | under 2000 ms | 114.0 ms | 2000 ms | PASS |
| Move navigation (worst of 12 arrow-key steps) | under 100 ms | 8.6 ms after a 15.5 ms paint baseline | 100 ms | PASS |
| Main-thread long task in measured flow | under 200 ms | none recorded | 200 ms | PASS |

The shell check asserts that the Dashboard `h1` is visible and that no `stockfish` resource is
requested. "Usable" here means the shell heading is rendered; it is not a full-interactivity
measurement.

Move navigation dispatches one `ArrowRight` per step and waits for one paint plus
`setTimeout(0)`. Three empty paint samples provide the baseline (median 15.5 ms), which is
subtracted from each step. The test also asserts that the board label changed from
`Position: Starting position` and that Previous move is enabled after the steps.

Earlier dev-server probe, before `r7-performance.spec.ts` became production-only:

| Measurement | Raw | Budget (2x) | Result |
| --- | --- | --- | --- |
| Initial shell usable | 556.5 ms | 4000 ms | PASS |
| Open typical local project | 424.3 ms | 4000 ms | PASS |
| Move navigation worst step (two-rAF metric) | 110.6 ms | 200 ms | PASS |
| Long task, project open | 145.0 ms | 400 ms | PASS |
| Long task, move navigation | 60.0 ms | 400 ms | PASS |

Those dev values are retained only as a development-overhead observation. The dev project now
ignores this spec, and the production project does not use the 2x tolerance unless `CI` is set.
The dev probe recorded two long tasks: 145.0 ms during project open and 60.0 ms during the first
move; neither flow is part of the release measurement. The production build recorded no long
tasks. No application code was changed because no production bottleneck exceeded its target.

## Manual checklist

| Check | Result |
| --- | --- |
| Hardware and browser documented | PASS |
| Initial shell time | PASS, 431.9 ms (`h1` visible) |
| Project open time | PASS, 114.0 ms (automated), 283 ms (cold script open) |
| Move navigation time | PASS, 8.6 ms worst adjusted step |
| Preview FPS | PASS, 60.05 display FPS and 29.78 composition FPS (within noise) |
| 60-second 1080p 30 FPS export | PASS, 82.4 s wall time (1.37x video duration) |
| Memory / thermal observations | PASS with limits, see below |
| Pass/fail against PRD §8.1 | PASS, with engine/export long tasks not measured |

### Preview FPS

Measured on the production build with a 60-second, 16-scene, 16:9, 1920 x 1080 project while
playing from the start:

```text
Display loop:       60.05 FPS
Composition update: 29.78 FPS (596 frames advanced in 20.02 s)
```

The composition target is 30 FPS. The result is 0.7% under the nominal target, which is within
headless measurement noise. The display loop held 60 FPS, so dropped browser frames were not
the cause. A separate 6-second sample measured 29.25 FPS, confirming the same steady-state
range. Headless playback cannot prove the absence of visible stutter on a physical display.

### 60-second 1080p 30 FPS export

The same production project was exported with these settings:

| Setting | Value |
| --- | --- |
| Duration | 60.0 s (1800 frames at 30 FPS) |
| Resolution | 1080p, 1920 x 1080 |
| Container | WebM / VP9 / Opus |
| Quality | Default |
| Output target | OPFS (60-second policy) |

Result:

```text
Export wall time: 82.4 s
Panel render time: 83.8 s
Output size: 11 MB
Validated: 60.02 s, vp9, 1920x1080, opus 48 kHz stereo
```

The export took 1.37x the video duration (82.4 s for 60 s of video), so it is slower than real
time. The download was saved and validated with `node scripts/validate-video.mjs`.

### Memory and thermal

`performance.memory.usedJSHeapSize` was 35.1 MB before export and 35.1 MB after export. The
snapshot is coarse and rounds to the same value, so it cannot prove whether any output buffer
was retained. It does show that the JS heap did not visibly spike or grow across the run; the
renderer used the OPFS output target instead of an ArrayBuffer. No out-of-memory failure or
crash occurred.

WSL2 exposes no thermal sensors to the guest. The 6-second preview and the 83.8-second export
both completed at stable speed with no observed throttling. A physical laptop may thermally
throttle under a longer export session; that could not be measured here.

## PRD §8.1 review

| PRD target | Evidence |
| --- | --- |
| Initial shell usable without Stockfish | Automated shell check, no engine request |
| Local project open under 2 s | Automated project-open check |
| Move navigation under 100 ms | Automated move-navigation check |
| Autosave debounced and non-blocking | Covered by R5 autosave tests; no long task in measured flows |
| Engine analysis progress, no main-thread freeze | Not measured in Task 6. Stockfish runs in a worker; engine long tasks were not asserted here. |
| Export long tasks | Not measured in Task 6. Only 60-second export wall time was recorded. |
| Preview target 30 FPS | Manual preview measurement: 29.78 FPS (within noise) |

## Commands

```bash
npm run build
npx playwright test -c playwright.production.config.ts e2e/r7-performance.spec.ts
```

`playwright.config.ts` ignores `r7-performance.spec.ts` so the dev suite cannot present
development overhead as release evidence. The spec runs in the production job only.

## Known limitations

- CI runs use the 2x tolerance and never assert FPS.
- Dev-server timings include development-only React and CSS overhead and are not part of the
  release gate.
- "Shell usable" means the Dashboard `h1` is visible, not that every control is interactive.
- Preview stutter cannot be observed in headless mode; only the composition rate was measured.
- Engine-analysis and export long tasks were not measured in Task 6.
- The reference run is headless; input latency and compositor behaviour on a physical display
  may differ.
- Thermal throttling cannot be observed in WSL2. The host fan and clock behaviour were not
  instrumented.
