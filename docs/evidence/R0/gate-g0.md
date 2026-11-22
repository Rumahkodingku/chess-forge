# Gate G0 Evidence: Foundation

- Date: 2026-11-22
- Environment: Linux, Node 26.9 local, Chrome stable, Next.js 16.4.6
- Status: PASS

## Commands

| Command | Result |
| --- | --- |
| `npm run lint` | Exit 0. 4 warnings, all `!important` in the reduced-motion block. No errors. |
| `npm run typecheck` | Exit 0. |
| `npm run test` | 17 tests passed, 5 files. |
| `npm run build` | Exit 0. 16 routes generated. API routes dynamic. |
| `npm run test:e2e` | 6 Playwright tests passed. |

## Shell evidence

- `docs/evidence/R0/dashboard-desktop.png`
- `docs/evidence/R0/dashboard-mobile.png`
- `docs/evidence/R0/settings-desktop.png`

## Verified behaviour

- Dashboard, Analysis, Studio, Templates, and Settings routes render.
- Desktop sidebar and mobile menu use real destinations.
- Settings tabs switch after hydration.
- Select controls display persisted defaults.
- Storage status reads IndexedDB usage.
- Browser capability list reads runtime features.
- No horizontal overflow at 390 px in the captured dashboard.

## Notes

- The local development URL must use `localhost` or `allowedDevOrigins`; the config allows both `localhost` and `127.0.0.1`.
- Next.js dev indicators are disabled to keep screenshots clean.
