const DEFAULT_TIMEOUT_MS = 10_000;

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "ChessForge/0.1 (personal project)",
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(
        "The external service took too long to respond.",
        504,
      );
    }
    throw new HttpError("The external service could not be reached.");
  } finally {
    clearTimeout(timeout);
  }
}

interface CacheEntry {
  expiresAt: number;
  response: Response;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function cachedFetch(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const key = `${init.headers ? JSON.stringify(init.headers) : ""}:${input}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.response.clone();
  }

  const response = await fetchWithTimeout(input, init, timeoutMs);
  if (response.ok) {
    cache.set(key, {
      expiresAt: now + CACHE_TTL_MS,
      response: response.clone(),
    });
  }
  return response;
}

export function clearHttpCache(): void {
  cache.clear();
}
