import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json({
    status: "ok",
    service: "chessforge",
    version: "0.1.0",
    phase: "R7",
    timestamp: new Date().toISOString(),
  });
}
