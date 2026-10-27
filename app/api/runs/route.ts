// Submits a finished life. The server replays seed + actions, computes the score itself, records
// stats once per unique run, and returns a runId the player can claim on the leaderboard with a name.

import { createHash } from "node:crypto";
import { MAX_ACTIONS, parseAction, replayLife } from "@/lib/replay";
import { getRedis, isPlayerId, json, K, underLimit } from "@/lib/redis";
import { scoreLife } from "@/lib/score";
import type { GameAction } from "@/types/game";

export const maxDuration = 30;

const RUN_TTL = 30 * 86400; // unclaimed runs expire; claimed ones are persisted

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return json({ ok: false, error: "offline" }, 503);
  const body = (await req.json().catch(() => null)) as { seed?: unknown; actions?: unknown; playerId?: unknown } | null;
  const seed = body?.seed;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return json({ ok: false, error: "bad_request" }, 400);
  if (!isPlayerId(body?.playerId) || !Array.isArray(body?.actions) || body.actions.length > MAX_ACTIONS)
    return json({ ok: false, error: "bad_request" }, 400);
  if (!(await underLimit(redis, req, "runs", 60))) return json({ ok: false, error: "rate_limited" }, 429);

  const actions: GameAction[] = [];
  for (const raw of body.actions) {
    const a = parseAction(raw);
    if (!a) return json({ ok: false, error: "invalid_run" }, 422);
    actions.push(a);
  }
  const life = replayLife(seed, actions);
  const score = life && scoreLife(life);
  if (!life?.ended || !score) return json({ ok: false, error: "invalid_run" }, 422);

  const runId = createHash("sha256").update(`${seed}:${JSON.stringify(actions)}`).digest("hex").slice(0, 20);
  const higher = await redis.zcount(K.lbAll, `(${score.total}`, "+inf");
  const fresh = await redis.set(`${K.run(runId)}:lock`, 1, { nx: true, ex: RUN_TTL });
  if (fresh) {
    const cityId = life.citiesLived[0] ?? life.cityId;
    const p = redis.pipeline();
    p.hset(K.run(runId), {
      score: score.total,
      endingId: life.ended.endingId,
      cityId,
      days: life.ended.day,
      age: life.ended.age,
      seed,
      playerId: body.playerId,
      at: Date.now(),
    });
    p.expire(K.run(runId), RUN_TTL);
    p.incr(K.ended);
    p.pfadd(K.players, body.playerId);
    p.hincrby(K.endings, life.ended.endingId, 1);
    p.hincrby(K.cityRuns, cityId, 1);
    p.hincrby(K.cityDays, cityId, life.ended.day);
    await p.exec();
  }
  return json({ ok: true, runId, score, rank: higher + 1 });
}
