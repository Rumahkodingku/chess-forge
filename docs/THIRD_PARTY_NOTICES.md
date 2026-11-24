# Third-Party Notices

ChessForge is a local-first, single-user application. This file records the third-party software, data, and assets used by the project, with their licences.

## Runtime software

| Package                | Version             | Licence          | Source                                      |
| ---------------------- | ------------------- | ---------------- | ------------------------------------------- |
| Next.js                | 16.4.6              | MIT              | https://github.com/vercel/next.js           |
| React                  | 19.3.0              | MIT              | https://github.com/facebook/react           |
| React DOM              | 19.3.0              | MIT              | https://github.com/facebook/react           |
| Tailwind CSS           | 4.3.3               | MIT              | https://github.com/tailwindlabs/tailwindcss |
| shadcn/ui              | registry components | MIT              | https://github.com/shadcn-ui/ui             |
| cn                     | 0.5.2               | MIT              | https://github.com/shadcn-ui/cn             |
| Radix UI               | installed packages  | MIT              | https://github.com/radix-ui/primitives      |
| lucide-react           | 1.77.0              | ISC              | https://github.com/lucide-icons/lucide      |
| Zustand                | 5.1.0               | MIT              | https://github.com/pmndrs/zustand           |
| Zod                    | 4.6.7               | MIT              | https://github.com/colinhacks/zod           |
| idb                    | 8.0.4               | ISC              | https://github.com/jakearchibald/idb        |
| chess.js               | 1.4.0               | BSD-2-Clause     | https://github.com/jhlywa/chess.js          |
| chessground            | 9.2.1               | GPL-3.0-or-later | https://github.com/lichess-org/chessground  |
| @mliebelt/pgn-parser   | 1.4.19              | Apache-2.0       | https://github.com/mliebelt/pgn-parser      |
| stockfish (npm)        | 19.0.1              | GPL-3.0          | https://github.com/nmrugg/stockfish.js      |
| Remotion               | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/player       | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/web-renderer | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| @remotion/media        | 4.0.545             | Remotion Licence | https://github.com/remotion-dev/remotion    |
| fflate                 | 0.8.3               | MIT              | https://github.com/101arrowz/fflate         |
| sonner                 | 2.0.8               | MIT              | https://github.com/emilkowalski/sonner      |

## Development software

| Package         | Version | Licence           | Source                                                   |
| --------------- | ------- | ----------------- | -------------------------------------------------------- |
| TypeScript      | 5.x     | Apache-2.0        | https://github.com/microsoft/TypeScript                  |
| Biome           | 2.4.2   | MIT OR Apache-2.0 | https://github.com/biomejs/biome                         |
| Vitest          | 5.1.1   | MIT               | https://github.com/vitest-dev/vitest                     |
| Testing Library | 16.3.3  | MIT               | https://github.com/testing-library/react-testing-library |
| Playwright      | 1.65.1  | Apache-2.0        | https://github.com/microsoft/playwright                  |

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

## No account or cloud data

ChessForge does not include accounts, cloud project storage, or cloud rendering. Games, analysis, projects, templates, and settings are stored in the browser. External requests are limited to game import services selected by the user.

## Reporting an omission

If a dependency or asset is missing from this file, add it with its version, licence, and source before release.
