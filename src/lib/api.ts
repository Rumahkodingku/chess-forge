import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { HttpError } from "@/lib/http";

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return ip;
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          recovery: error.recovery,
        },
      },
      { status: error.code === "RATE_LIMIT_ERROR" ? 429 : 400 },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request parameters are invalid.",
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: {
          code: error.status === 404 ? "NOT_FOUND" : "NETWORK_ERROR",
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    },
    { status: 500 },
  );
}
