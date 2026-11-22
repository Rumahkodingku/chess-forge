import { RateLimitError } from "@/lib/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new RateLimitError(
      `Too many requests. Try again in ${seconds} seconds.`,
    );
  }

  bucket.count += 1;
}

export function resetRateLimits(): void {
  buckets.clear();
}
