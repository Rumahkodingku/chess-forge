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
| @mediabunny/aac-encoder  | 1.66.0              | MPL-2.0; FFmpeg LGPL-2.1-or-later | https://mediabunny.dev/guide/extensions/aac-encoder |
| @mediabunny/mp3-encoder  | 1.66.0              | MPL-2.0; LAME LGPL-2.0-or-later | https://mediabunny.dev/guide/extensions/mp3-encoder |
| @mediabunny/flac-encoder | 1.66.0              | MPL-2.0; libFLAC BSD-3-Clause-style | https://mediabunny.dev/guide/extensions/flac-encoder |
| sonner                   | 2.0.8               | MIT              | https://github.com/emilkowalski/sonner      |

The `@mediabunny/*-encoder` packages are transitive dependencies of `@remotion/web-renderer` 4.0.545. They are not direct dependencies of ChessForge.

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

### Mediabunny and encoder extensions

Mediabunny 1.66.0 is distributed under MPL-2.0. ChessForge uses the package unmodified for container muxing and output validation. The export path takes H.264, VP8, VP9, and Opus encoding from the browser's WebCodecs implementation when available; AAC has the FFmpeg fallback described below. Mediabunny's own codec helpers are part of the same MPL-2.0 package.

`@remotion/web-renderer` 4.0.545 declares three Mediabunny encoder extension packages as dependencies. They are transitive dependencies, not direct ChessForge dependencies, and they are not covered by the Remotion Licence; each package carries MPL-2.0 plus its bundled codec licence:

- `@mediabunny/aac-encoder` 1.66.0 is MPL-2.0 and bundles a WebAssembly build of FFmpeg's AAC-LC encoder. FFmpeg is LGPL-2.1-or-later; the bundled build enables no GPL, version 3, or nonfree components. It was built from FFmpeg commit `60a2818f76dcd1fee3155b1791304af104a0fc1b`. The extension registers only when the browser cannot encode AAC natively. MP4 export can therefore use this FFmpeg encoder when native WebCodecs AAC is unavailable. Source: https://github.com/FFmpeg/FFmpeg/commit/60a2818f76dcd1fee3155b1791304af104a0fc1b and https://github.com/Vanilagy/mediabunny/tree/main/packages/aac-encoder.
- `@mediabunny/mp3-encoder` 1.66.0 is MPL-2.0 and bundles LAME 3.100 under LGPL-2.0-or-later. ChessForge does not offer MP3 export, but the package is installed transitively. Source: https://lame.sourceforge.io/ and https://github.com/Vanilagy/mediabunny/tree/main/packages/mp3-encoder.
- `@mediabunny/flac-encoder` 1.66.0 is MPL-2.0 and bundles libFLAC under the Xiph BSD-style licence. ChessForge does not offer FLAC export, but the package is installed transitively. Source: https://github.com/xiph/flac/commit/3f1ecff843dd1b8c07fbb5f59425a4ec71fe4f6c and https://github.com/Vanilagy/mediabunny/tree/main/packages/flac-encoder.

The encoder packages ship their upstream licence files under `licenses/`. Keep those files, this notice, and the source links with the distributed build. If a future dependency adds a separate encoder package, add that package and its licence to this inventory before release.

## No account or cloud data

ChessForge does not include accounts, cloud project storage, or cloud rendering. Games, analysis, projects, templates, and settings are stored in the browser. External requests are limited to game import services selected by the user.

## Reporting an omission

If a dependency or asset is missing from this file, add it with its version, licence, and source before release.
