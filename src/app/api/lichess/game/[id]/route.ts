import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { fetchLichessGame } from "@/features/games/adapters/lichess";
import { clientKey, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

const paramsSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{8,12}$/),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    checkRateLimit(`lichess-game:${clientKey(request)}`, {
      limit: 20,
      windowMs: 60_000,
    });
    const { id } = paramsSchema.parse(await context.params);
    const game = await fetchLichessGame(id);
    return NextResponse.json({ game });
  } catch (error) {
    return errorResponse(error);
  }
}
