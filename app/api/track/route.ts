// Counts a new life being started (and the player as a unique visitor).

import { getRedis, isPlayerId, json, K, today, underLimit } from "@/lib/redis";

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return json({ ok: false, error: "offline" }, 503);
  const body = (await req.json().catch(() => null)) as { playerId?: unknown } | null;
  if (!isPlayerId(body?.playerId)) return json({ ok: false, error: "bad_request" }, 400);
  if (!(await underLimit(redis, req, "track", 120))) return json({ ok: false, error: "rate_limited" }, 429);

  const d = today();
  const p = redis.pipeline();
  p.incr(K.started);
  p.pfadd(K.players, body.playerId);
  p.incr(K.dayStarted(d));
  p.expire(K.dayStarted(d), 90 * 86400);
  p.pfadd(K.dayPlayers(d), body.playerId);
  p.expire(K.dayPlayers(d), 90 * 86400);
  await p.exec();
  return json({ ok: true });
}
