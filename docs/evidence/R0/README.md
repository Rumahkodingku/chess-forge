# R0 Evidence Index

| Gate | Report | Result |
| --- | --- | --- |
| G0 Foundation | `gate-g0.md` | PASS |
| G1 Export | `gate-g1.md` | PASS |
| G2 Engine | `gate-g2.md` | PASS |
| G3 PGN | `gate-g3.md` | PASS |
| G4 Deployment and licensing | `gate-g4.md` | PASS for local build, live Coolify auth pending |

## Artifacts

- `dashboard-desktop.png`
- `dashboard-mobile.png`
- `settings-desktop.png`
- `export-lab.png`
- `engine-proof.png`
- `export-proof-1080x1920.mp4`
- `export-proof-1920x1080.webm`

## Validation commands

```bash
npm run check:all
npm run test:e2e
npm run validate:video -- docs/evidence/R0/export-proof-1080x1920.mp4
npm run validate:video -- docs/evidence/R0/export-proof-1920x1080.webm
docker build -t chessforge:r0 .
```
