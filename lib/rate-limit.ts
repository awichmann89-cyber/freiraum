import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiters = new Map<string, Ratelimit>();

function isConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getLimiter(
  kind: string,
  limit: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
): Ratelimit | null {
  if (!isConfigured()) {
    // Rate limiting is opt-in infrastructure (Upstash) — degrade gracefully in local
    // dev/environments where it isn't configured rather than hard-failing requests.
    return null;
  }
  let limiter = limiters.get(kind);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `freiraum:${kind}`,
    });
    limiters.set(kind, limiter);
  }
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
}

export async function checkBookingRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter("booking", 5, "1 h");
  if (!limiter) return { success: true };
  const { success } = await limiter.limit(identifier);
  return { success };
}

export async function checkContractSignRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter("contract-sign", 20, "1 h");
  if (!limiter) return { success: true };
  const { success } = await limiter.limit(identifier);
  return { success };
}
