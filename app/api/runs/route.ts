// Submits a finished life. The server replays seed + actions, computes the score itself, records
// stats once per unique run, and returns a runId the player can claim on the leaderboard with a name.
// A daily-challenge life counts for the daily board only if it is the player's first daily run that day.

import { createHash } from "node:crypto";
import { DATA } from "@/lib/data";
import { isDailyDate } from "@/lib/daily";
import { dailySeed, isOpenDaily } from "@/lib/daily-seed";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, today, underLimit } from "@/lib/db";
import { MAX_ACTIONS, parseAction, replayLife } from "@/lib/replay";
import { scoreLife } from "@/lib/score";
import type { GameAction } from "@/types/game";

export const maxDuration = 30;

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as {
    seed?: unknown;
    actions?: unknown;
    playerId?: unknown;
    daily?: unknown;
  } | null;
  const seed = body?.seed;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return badRequest();
  if (!isPlayerId(body?.playerId) || !Array.isArray(body?.actions) || body.actions.length > MAX_ACTIONS) return badRequest();
  if (!(await underLimit(sql, req, "runs", 60))) return rateLimited();
  const playerId = body.playerId;

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
  const existing = await sql`select player_id, daily::text as daily from runs where id = ${runId}`;
  let daily: string | null = existing[0]?.daily ?? null;

  if (!existing.length) {
    const wantsDaily = isDailyDate(body.daily) && isOpenDaily(body.daily) && dailySeed(body.daily) === seed;
    if (wantsDaily) {
      const tried = await sql`select 1 from runs where player_id = ${playerId} and daily = ${body.daily}`;
      if (!tried.length) daily = body.daily as string;
    }
    const cityId = life.citiesLived[0] ?? life.cityId;
    // where the life ended becomes a trace other players find at that spot: a grave or a way out
    const endCity = DATA.city[life.cityId];
    const endSpot = endCity.spots.find((sp) => sp.id === life.lastSpot) ?? endCity.spots[0];
    const traceKind = DATA.ending[life.ended.endingId]?.death ? "grave" : "free";
    await sql.transaction([
      sql`insert into runs (id, player_id, seed, score, ending_id, city_id, days, age, daily)
          values (${runId}, ${playerId}, ${seed}, ${score.total}, ${life.ended.endingId}, ${cityId},
                  ${life.ended.day}, ${life.ended.age}, ${daily})
          on conflict do nothing`,
      sql`insert into players (id) values (${playerId}) on conflict (id) do update set last_seen = now()`,
      sql`insert into player_days (player_id, day, ends) values (${playerId}, ${today()}, 1)
          on conflict (player_id, day) do update set ends = player_days.ends + 1`,
      sql`insert into player_endings (player_id, ending_id) values (${playerId}, ${life.ended.endingId})
          on conflict do nothing`,
      sql`insert into traces (player_id, kind, city_id, spot_id, run_id, name_th, name_en, age, day, ending_id)
          values (${playerId}, ${traceKind}, ${endCity.id}, ${endSpot.id}, ${runId}, ${life.character.name_th},
                  ${life.character.name_en}, ${life.ended.age}, ${life.ended.day}, ${life.ended.endingId})
          on conflict (run_id) do nothing`,
    ]);
  }

  const [{ rank }] = await sql`
    select count(*)::int + 1 as rank from runs
    where name is not null and not hidden and score > ${score.total}`;
  let dailyRank: number | null = null;
  if (daily) {
    const [r] = await sql`
      select count(*)::int + 1 as rank from runs
      where daily = ${daily} and name is not null and not hidden and score > ${score.total}`;
    dailyRank = r.rank;
  }
  return json({ ok: true, runId, score, rank, daily, dailyRank });
}
