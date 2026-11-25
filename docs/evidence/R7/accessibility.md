# R7 Accessibility Evidence

- Date: 2026-11-25
- Status: PASS for the pragmatic WCAG 2.1 AA target in `docs/specs/R7-hardening-and-release.md` §7
- Automated spec: `e2e/r7-accessibility.spec.ts`
- Method: Playwright keyboard/focus regression plus manual checklist. No axe dependency was added.

## Reference environment

| Item | Value |
| --- | --- |
| OS | WSL2 Linux (Ubuntu), Linux 6.6.87.2-microsoft-standard-WSL2 |
| Browser | Chrome for Testing 159.0.8154.6 (Playwright 1.65.1), headless |
| Viewports | 1440 x 1000 desktop and 390 x 844 mobile |
| Server | `npm run dev` on `http://localhost:3000` |
| Assistive technology | No physical screen reader is installed in this environment; Chromium accessibility-tree names were inspected |

## Automated coverage

Command:

```bash
npx playwright test e2e/r7-accessibility.spec.ts
```

Result: 4 passed. Runs took 10 s to 41 s with a warm dev server, and 2.5 min from a cold dev-server compile; all four tests passed each time.

| Test | What it proves |
| --- | --- |
| Analysis replay is keyboard operable and announces the position | ArrowLeft/ArrowRight/Home/End change the board; First/Previous/Next/Last have accessible names; the selected move gets `aria-current`; the new position is announced through a polite status region; focused controls match `:focus-visible` with an outline or ring |
| The create-video dialog traps and restores keyboard focus | Enter opens the modal; focus starts inside; twelve Tab presses stay inside; ArrowRight and End do not change the board behind the modal; Escape closes it; focus returns to the opening button |
| Studio timeline and export controls are keyboard operable | Play from start and Pause work from the keyboard; the preview and timeline sliders seek with Home/ArrowRight; the scene selection, duration edit, and scene reorder work without a mouse; text, annotation, and audio tracks expose accessible descriptions; export format, file name, resolution, and export button are named; the apply-template dialog traps and restores focus |
| Reduced motion keeps the workspace usable and still | `prefers-reduced-motion: reduce` matches; CSS transition duration is at most 0.01 ms; the timeline remains visible with no horizontal overflow at 390 px |

Regression runs executed on the same change:

```bash
npx playwright test e2e/r2-walking-skeleton.spec.ts e2e/r5-studio.spec.ts e2e/r8-library.spec.ts
npx playwright test e2e/r6-export.spec.ts
npm test
npx vitest run src/components/ui/progress.test.tsx
npm run typecheck
npx biome check <changed-files>
```

Results: 14 E2E passed, 3 export E2E passed, 344 unit/integration tests passed, typecheck clean, Biome clean.

## Keyboard-only walkthrough

The walkthrough used Tab, Shift+Tab, Enter, Space, Escape, arrows, Home, and End only.

| Flow | Steps | Result |
| --- | --- | --- |
| Analysis replay | Tab to Next move, press Enter, then press Right/End/Home | PASS: board label, selected move button, and status text update |
| Analysis move selection | Tab to a move button and press Enter | PASS: move detail and board follow the selection |
| Analysis dialog | Tab to Create video, press Enter, Tab through the form, press ArrowRight/End, press Escape | PASS: focus stays inside, the board behind the modal does not move, then focus returns to Create video |
| Studio playback | Tab to Play from start, press Enter; Tab to Pause, press Enter | PASS: frame advances, then stops within two frames |
| Studio seek | Tab to Seek video and Timeline frame, press Home/ArrowRight | PASS: preview and timeline frame counters update |
| Studio scene select | Tab to `02 move`, press Enter | PASS: scene becomes current and the inspector shows that scene |
| Studio scene edit | Tab to Scene 2 duration frames, press ArrowUp | PASS: duration changes from 166 to 200 after 34 key presses |
| Studio scene reorder | Tab to Move scene 2 down, press Enter | PASS: scene moves and focus follows the moved control (now named Move scene 3 down) |
| Export controls | Tab through aspect ratio, frame rate, resolution, quality, format, audio, file name, and Export video | PASS: every control has an accessible name and is operable |
| Library practice | Tab to Puzzle answer, type a UCI move, press Enter | PASS: existing R8 keyboard practice coverage still passes |

## Accessible names

Chromium accessibility-tree smoke check on the Analysis route listed named controls including:

- `First move`, `Previous move`, `Next move`, `Last move`
- `Flip board`, `White perspective`, `Side to move`
- `Analyse position`, `Stop`, `Restart`, `Analyse game`
- `Create video`, `Create 3-second scene`
- move buttons such as `1. e4`, `1... e5`, `3. Bb5`

The Studio timeline exposes `01 intro` through `05 outro`, `Scene N duration frames`, `Move scene N up/down`, and `Timeline frame`. The export panel exposes `Export video`, `Cancel`, `Export aspect ratio`, `Resolution`, `Quality`, `File name`, and the format radio group labelled `Format`.

The shared progress bar forwards its value to Radix, so it exposes `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-valuenow` on the `progressbar` role. This is covered by `src/components/ui/progress.test.tsx`; the export bar is named `Export progress`.

## Contrast samples

Values are WCAG 2.1 relative-luminance ratios computed from the CSS custom properties in `src/app/globals.css`.

| Sample | Foreground | Background | Ratio | Target | Result |
| --- | --- | --- | --- | --- | --- |
| Body text | `#ededf0` | `#0a0a0b` | 16.94:1 | 4.5:1 | PASS |
| Muted meta text on cards | `#a1a1aa` | `#111113` | 7.36:1 | 4.5:1 | PASS |
| Muted meta text on raised surfaces | `#a1a1aa` | `#17171a` | 6.98:1 | 4.5:1 | PASS |
| Brand text | `#e8b45a` | `#111113` | 9.98:1 | 4.5:1 | PASS |
| Destructive text | `#f87171` | `#111113` | 6.82:1 | 4.5:1 | PASS |
| Primary button label | `#1a1205` | `#e8b45a` | 9.81:1 | 4.5:1 | PASS |
| Focus ring | `#e8b45a` | `#0a0a0b` | 10.47:1 | 3:1 | PASS |
| Card and input border | `#2a2a30` | `#111113` | 1.32:1 | 3:1 | Exception, see below |

Small 9-10 px metadata uses the muted colour at 6.98:1 or better. Text does not rely on colour alone: move classifications include text badges, selected moves use `aria-current` plus a border, and audio/annotation tracks have accessible descriptions.

## Reduced motion

- `@media (prefers-reduced-motion: reduce)` in `src/app/globals.css` sets scroll, animation, and transition durations to 0.01 ms.
- The automated test emulates the media feature and verifies a computed transition duration at or below 0.01 ms.
- The Studio timeline and export controls remain visible and operable at 390 px with no horizontal document overflow.
- The Remotion preview continues to play composition frames because the video content itself is motion. Playback is user-controlled and pausable; it is not decorative UI animation.

## Screen-reader smoke check

No NVDA, JAWS, VoiceOver, or Orca is installed in this container, so a physical screen-reader pass was not possible. The substitute smoke check was:

1. Chromium `Accessibility.getFullAXTree` on Analysis and Library Practice.
2. Role and name assertions in `e2e/r7-accessibility.spec.ts`.
3. A polite status region for Analysis position changes, checked by role and text.
4. Dialog name, role, focus containment, Escape, and focus restoration checked by keyboard.

Observed limitations: the board is exposed as one `role="img"` with a position label rather than 64 navigable squares. The move list provides the text alternative for every ply. This is an accepted pragmatic trade-off for R7; a square-by-square board model is out of scope.

A human screen-reader spot-check remains recommended for the G11 reviewer before public release, especially for the Analysis move list and Studio timeline.

## Accepted exceptions

| Exception | Reason | Mitigation |
| --- | --- | --- |
| Card and input borders are 1.32:1 against card surfaces | Changing the shared border token would be a design-system rewrite beyond R7 scope | Controls have visible labels, placeholders, filled surfaces, and a 10.47:1 focus ring; no action depends on border colour alone |
| Board is a single labelled image | Chessground does not expose a keyboard square model | Move list buttons and the live position status give the full keyboard and text path |
| Timeline drag reorder is pointer-only | Drag is an enhancement | Move scene up/down buttons provide the same reorder operation from the keyboard |
| Track descriptions list at most 12 events | Prevents very long announcements on large projects | The full visual track remains available; counts and labels stay meaningful |
| No physical screen reader run | No assistive technology installed in the container | Accessibility-tree, name, live-region, and keyboard checks above |
| Several scene-inspector numeric fields share the visible label `Frame` in different groups | Field labels follow the surrounding inspector sections and were not renamed in R7 | Each field is reached in visual order inside its labelled group; revisit if a screen-reader pass reports ambiguity |

## Residual risks

- Headless Chromium verifies focus and name behaviour, not real speech output.
- Zoom to 200% was not separately measured; the responsive checks cover 390 px and 1440 px with no horizontal overflow.
- The Remotion Player's internal DOM was not audited control by control; the application provides named external playback and seek controls.
- Contrast ratios assume the shipped dark theme. Any future theme change must re-run these samples.

## Files changed

| File | Change |
| --- | --- |
| `e2e/r7-accessibility.spec.ts` | Keyboard, focus, accessible-name, dialog, and reduced-motion regression suite |
| `src/app/(app)/analysis/[gameId]/page.tsx` | Polite status region announces the current position after replay changes |
| `src/components/ui/dialog.tsx` | Restores focus to the element that opened a controlled dialog, because Radix only restores to a `DialogTrigger` and this app opens dialogs from state |
| `src/features/studio/components/timeline-panel.tsx` | Timeline tracks expose named text alternatives |
| `src/features/studio/components/export-panel.tsx` | Export progress bar has the accessible name `Export progress` |
| `src/components/ui/progress.tsx` | Forwards `value` to Radix so the progressbar exposes `aria-valuenow` |
| `src/components/ui/progress.test.tsx` | Focused assertion for the progressbar value, min, and max |
