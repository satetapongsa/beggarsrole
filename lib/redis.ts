// Server-only Upstash Redis client. Returns null when no database is configured (e.g. local dev),
// so online features switch off instead of crashing.

import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  // Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export const K = {
  started: "stats:started",
  ended: "stats:ended",
  players: "stats:players",
  endings: "stats:endings",
  cityRuns: "stats:city:runs",
  cityDays: "stats:city:days",
  dayStarted: (d: string) => `stats:day:${d}:started`,
  dayPlayers: (d: string) => `stats:day:${d}:players`,
  run: (id: string) => `run:${id}`,
  lbAll: "lb:all",
  lbWeek: (w: string) => `lb:week:${w}`,
  lbCity: (c: string) => `lb:city:${c}`,
  rate: (ip: string, bucket: number) => `rl:${ip}:${bucket}`,
};

export const today = () => new Date().toISOString().slice(0, 10);

/** ISO week, e.g. "2026-W44" (UTC). */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export const isPlayerId = (x: unknown): x is string => typeof x === "string" && /^[a-z0-9-]{8,40}$/i.test(x);

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** Fixed-window limiter: true if this IP is still under `max` calls this hour. */
export async function underLimit(redis: Redis, req: Request, scope: string, max: number): Promise<boolean> {
  const key = K.rate(`${scope}:${clientIp(req)}`, Math.floor(Date.now() / 3600000));
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 3600);
  return n <= max;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
