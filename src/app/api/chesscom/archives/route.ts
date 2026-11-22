import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { fetchChessComArchives } from "@/features/games/adapters/chesscom";
import { clientKey, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function GET(request: Request) {
  await connection();
  try {
    checkRateLimit(`chesscom-archives:${clientKey(request)}`, {
      limit: 30,
      windowMs: 60_000,
    });
    const url = new URL(request.url);
    const { username } = querySchema.parse({
      username: url.searchParams.get("username") ?? "",
    });
    const archives = await fetchChessComArchives(username);
    return NextResponse.json({ archives });
  } catch (error) {
    return errorResponse(error);
  }
}
