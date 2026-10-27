// GET  ?board=all|week|city&city=<id>  → top 50
// POST { runId, playerId, name }        → put a verified run on the boards under a nickname

import { DATA } from "@/lib/data";
import { getRedis, isoWeek, isPlayerId, json, K, underLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

const TOP = 50;
const KEEP = 1000; // boards are trimmed to the best KEEP runs

export interface BoardEntry {
  rank: number;
  name: string;
  score: number;
  endingId: string;
  cityId: string;
  days: number;
  age: number;
  at: number;
}

function boardKey(url: URL): string | null {
  const board = url.searchParams.get("board") ?? "all";
  if (board === "all") return K.lbAll;
  if (board === "week") return K.lbWeek(isoWeek());
  if (board === "city") {
    const c = url.searchParams.get("city") ?? "";
    return DATA.city[c] ? K.lbCity(c) : null;
  }
  return null;
}

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) return json({ ok: false, error: "offline" }, 503);
  const key = boardKey(new URL(req.url));
  if (!key) return json({ ok: false, error: "bad_request" }, 400);

  const ids = await redis.zrange<string[]>(key, 0, TOP - 1, { rev: true });
  if (ids.length === 0) return json({ ok: true, entries: [] });
  const p = redis.pipeline();
  ids.forEach((id) => p.hgetall(K.run(id)));
  const rows = (await p.exec()) as (Record<string, unknown> | null)[];
  const entries: BoardEntry[] = [];
  rows.forEach((r) => {
    if (!r) return;
    entries.push({
      rank: entries.length + 1,
      name: String(r.name ?? "?"),
      score: Number(r.score),
      endingId: String(r.endingId),
      cityId: String(r.cityId),
      days: Number(r.days),
      age: Number(r.age),
      at: Number(r.at),
    });
  });
  return json({ ok: true, entries });
}

/** Trim, drop control/invisible characters, cap length. */
function cleanName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const name = x
    .replace(/[\p{C}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(name);
  return chars.length >= 1 && chars.length <= 20 ? name : null;
}

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return json({ ok: false, error: "offline" }, 503);
  const body = (await req.json().catch(() => null)) as { runId?: unknown; playerId?: unknown; name?: unknown } | null;
  const name = cleanName(body?.name);
  const runId = body?.runId;
  if (!name || typeof runId !== "string" || !/^[a-f0-9]{20}$/.test(runId) || !isPlayerId(body?.playerId))
    return json({ ok: false, error: "bad_request" }, 400);
  if (!(await underLimit(redis, req, "claim", 30))) return json({ ok: false, error: "rate_limited" }, 429);

  const run = await redis.hgetall<Record<string, unknown>>(K.run(runId));
  if (!run || String(run.playerId) !== body.playerId) return json({ ok: false, error: "not_found" }, 404);
  if (run.name) return json({ ok: false, error: "already_claimed" }, 409);

  const score = Number(run.score);
  const cityId = String(run.cityId);
  const week = K.lbWeek(isoWeek());
  const p = redis.pipeline();
  p.hset(K.run(runId), { name });
  p.persist(K.run(runId));
  p.persist(`${K.run(runId)}:lock`);
  for (const key of [K.lbAll, week, K.lbCity(cityId)]) {
    p.zadd(key, { score, member: runId });
    p.zremrangebyrank(key, 0, -(KEEP + 1));
  }
  p.expire(week, 60 * 86400);
  await p.exec();
  const rank = (await redis.zrevrank(K.lbAll, runId)) ?? null;
  return json({ ok: true, rank: rank === null ? null : rank + 1 });
}
