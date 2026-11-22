import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { fetchLichessGames } from "@/features/games/adapters/lichess";
import { clientKey, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  max: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  await connection();
  try {
    checkRateLimit(`lichess-games:${clientKey(request)}`, {
      limit: 20,
      windowMs: 60_000,
    });
    const url = new URL(request.url);
    const query = querySchema.parse({
      username: url.searchParams.get("username") ?? "",
      max: url.searchParams.get("max") ?? "20",
    });
    const games = await fetchLichessGames(query.username, query.max);
    return NextResponse.json({ games, total: games.length });
  } catch (error) {
    return errorResponse(error);
  }
}
