import { connection, NextResponse } from "next/server";
import { z } from "zod";
import {
  convertChessComGames,
  fetchChessComGames,
} from "@/features/games/adapters/chesscom";
import { clientKey, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  year: z.coerce.number().int().min(2007).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  await connection();
  try {
    checkRateLimit(`chesscom-games:${clientKey(request)}`, {
      limit: 30,
      windowMs: 60_000,
    });
    const url = new URL(request.url);
    const query = querySchema.parse({
      username: url.searchParams.get("username") ?? "",
      year: url.searchParams.get("year") ?? "",
      month: url.searchParams.get("month") ?? "",
    });
    const games = await fetchChessComGames(
      query.username,
      query.year,
      query.month,
    );
    return NextResponse.json({
      games: convertChessComGames(games),
      total: games.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
