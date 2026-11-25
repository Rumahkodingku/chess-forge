import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const standalone = `${root}/.next/standalone`;
const server = `${standalone}/server.js`;

if (!existsSync(server)) {
  console.error(
    "Missing .next/standalone/server.js. Run `npm run build` before starting the standalone server.",
  );
  process.exit(1);
}

await rm(`${standalone}/public`, { recursive: true, force: true });
await cp(`${root}/public`, `${standalone}/public`, { recursive: true });
await rm(`${standalone}/.next/static`, { recursive: true, force: true });
await cp(`${root}/.next/static`, `${standalone}/.next/static`, {
  recursive: true,
});

process.env.PORT = process.env.PORT ?? "3100";
process.env.HOSTNAME = process.env.HOSTNAME ?? "127.0.0.1";

await import(pathToFileURL(server).href);
