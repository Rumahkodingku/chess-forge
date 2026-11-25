# Third-Party Notices

ChessForge is a local-first, single-user application. This file records the third-party software, data, and assets used by the project, with their licences.

## Runtime software

| Package                | Version             | Licence          | Source                                      |
| ---------------------- | ------------------- | ---------------- | ------------------------------------------- |
| Next.js                  | 16.4.6              | MIT              | https://github.com/vercel/next.js           |
| next-themes              | 0.4.6               | MIT              | https://github.com/pacocoursey/next-themes  |
| React                    | 19.3.0              | MIT              | https://github.com/facebook/react           |
| React DOM                | 19.3.0              | MIT              | https://github.com/facebook/react           |
| Tailwind CSS             | 4.3.3               | MIT              | https://github.com/tailwindlabs/tailwindcss |
| tw-animate-css           | 1.4.0               | MIT              | https://github.com/Wombosvideo/tw-animate-css |
| shadcn/ui                | registry components | MIT              | https://github.com/shadcn-ui/ui             |
| cn                       | 0.5.2               | MIT              | https://github.com/shadcn-ui/cn             |
| class-variance-authority | 0.7.1               | Apache-2.0       | https://github.com/joe-bell/cva             |
| Radix UI                 | 1.8.1               | MIT              | https://github.com/radix-ui/primitives      |
| lucide-react             | 1.77.0              | ISC              | https://github.com/lucide-icons/lucide      |
| Zustand                  | 5.1.0               | MIT              | https://github.com/pmndrs/zustand           |
| Zod                      | 4.6.7               | MIT              | https://github.com/colinhacks/zod           |
| idb                      | 8.0.4               | ISC              | https://github.com/jakearchibald/idb        |
| chess.js                 | 1.4.0               | BSD-2-Clause     | https://github.com/jhlywa/chess.js          |
| chessground              | 9.2.1               | GPL-3.0-or-later | https://github.com/lichess-org/chessground  |
| @mliebelt/pgn-parser     | 1.4.19              | Apache-2.0       | https://github.com/mliebelt/pgn-parser      |
| stockfish (npm)          | 19.0.1              | GPL-3.0          | https://github.com/nmrugg/stockfish.js      |
| Remotion                 | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/player         | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/web-renderer   | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/media          | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| fflate                   | 0.8.3               | MIT              | https://github.com/101arrowz/fflate         |
| mediabunny               | 1.66.0              | MPL-2.0          | https://github.com/Vanilagy/mediabunny      |
| sonner                   | 2.0.8               | MIT              | https://github.com/emilkowalski/sonner      |

## Development software

| Package                     | Version | Licence           | Source                                                   |
| --------------------------- | ------- | ----------------- | -------------------------------------------------------- |
| TypeScript                  | 5.9.3   | Apache-2.0        | https://github.com/microsoft/TypeScript                  |
| Biome                       | 2.4.2   | MIT OR Apache-2.0 | https://github.com/biomejs/biome                         |
| Vitest                      | 5.1.1   | MIT               | https://github.com/vitest-dev/vitest                     |
| @vitest/coverage-v8         | 5.1.1   | MIT               | https://github.com/vitest-dev/vitest                     |
| Testing Library React       | 16.3.3  | MIT               | https://github.com/testing-library/react-testing-library |
| Testing Library jest-dom    | 8.0.0   | MIT               | https://github.com/testing-library/jest-dom               |
| Testing Library user-event  | 14.6.13 | MIT               | https://github.com/testing-library/user-event            |
| Playwright                  | 1.65.1  | Apache-2.0        | https://github.com/microsoft/playwright                  |
| @tailwindcss/turbopack      | 4.3.3   | MIT               | https://github.com/tailwindlabs/tailwindcss              |
| fake-indexeddb              | 6.2.8   | Apache-2.0        | https://github.com/dumbmatter/fakeIndexedDB              |
| jsdom                       | 31.0.1  | MIT               | https://github.com/jsdom/jsdom                           |
| @types/node                 | 24.19.2 | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| @types/react                | 19.3.0  | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped       |
| @types/react-dom            | 19.3.0  | MIT               | https://github.com/DefinitelyTyped/DefinitelyTyped       |

## Chess assets and data

| Asset                                               | Licence                   | Attribution and source                                                               |
| --------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| cburnett chess pieces                               | CC BY-SA 3.0              | Colin M.L. Burnett. Source files retrieved from the Lichess cburnett piece set.      |
| chess-openings dataset                              | CC0 1.0                   | Lichess opening names dataset. https://github.com/lichess-org/chess-openings         |
| Lichess puzzle database                             | CC0 1.0                   | Selected 5,000-puzzle subset. https://database.lichess.org/                          |
| ChessForge reference articles                       | Original content          | Written for ChessForge. No third-party article text is copied.                       |
| Built-in move, capture, check, and checkmate sounds | CC0 1.0                   | Generated for ChessForge with FFmpeg sine synthesis. Dedicated to the public domain. |
| Geist and Geist Mono fonts                          | SIL Open Font License 1.1 | Vercel. Served through `next/font`.                                                  |

## Copyleft notes

### Stockfish

Stockfish is distributed under GPL-3.0. The engine is used as an unmodified WebAssembly build from the `stockfish` npm package. The corresponding source is available at:

- https://github.com/nmrugg/stockfish.js
- https://github.com/official-stockfish/Stockfish

Anyone who receives a build of ChessForge that includes Stockfish is entitled to the corresponding engine source. Keep this notice with the distributed build.

### Chessground

Chessground 9.2.1 is distributed under GPL-3.0-or-later. ChessForge uses it for the read-only replay board. The board is client-only and bundled with the application. The corresponding source is available at https://github.com/lichess-org/chessground.

Before distributing a build beyond the single-user owner, review the GPL implications for the combined work. Keep this notice with the distributed build.

### Remotion

Remotion packages are used under the Remotion Licence. The project is a single-user, individual project. Render calls pass `licenseKey: "free-license"`. If the deployment is shared with other people, review the licence again before continuing.

### Mediabunny

Mediabunny 1.66.0 is distributed under MPL-2.0. ChessForge uses the package unmodified for container muxing and output validation. The export path takes H.264/AAC/VP8/VP9/Opus encoding from the browser's WebCodecs implementation; Mediabunny's own codec helpers are part of the same MPL-2.0 package. No separate encoder binary or codec package is installed for ChessForge. Mediabunny's only declared runtime dependencies are the type packages `@types/dom-mediacapture-transform` and `@types/dom-webcodecs`. If a future version adds a separate encoder package, add that package and its licence to this inventory before release. The source is available at https://github.com/Vanilagy/mediabunny. Keep this notice and the package licence with the distributed build.

## No account or cloud data

ChessForge does not include accounts, cloud project storage, or cloud rendering. Games, analysis, projects, templates, and settings are stored in the browser. External requests are limited to game import services selected by the user.

## Reporting an omission

If a dependency or asset is missing from this file, add it with its version, licence, and source before release.
