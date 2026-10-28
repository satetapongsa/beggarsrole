// GET  ?board=today|daily|week|all|city  (&city=<id>, &date=YYYY-MM-DD for daily)  → top 50
// POST { runId, playerId, name }  → put a verified run on the boards under a nickname
// A nickname is one person: every board shows each exact name once, with its best run on that board.
// "today" is every run finished since midnight Bangkok time; "daily" is only the daily challenge.

import { DATA } from "@/lib/data";
import { dailyDate, isDailyDate } from "@/lib/daily";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, underLimit } from "@/lib/db";
import { cleanName, isNameAllowed } from "@/lib/moderation";

export const dynamic = "force-dynamic";

const TOP = 50;

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

export async function GET(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const url = new URL(req.url);
  const board = url.searchParams.get("board") ?? "all";
  const city = url.searchParams.get("city") ?? "";
  const date = url.searchParams.get("date") ?? dailyDate();

  let where;
  if (board === "all") where = sql`true`;
  else if (board === "today") where = sql`created_at >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'`;
  else if (board === "week") where = sql`created_at >= date_trunc('week', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'`;
  else if (board === "daily" && isDailyDate(date)) where = sql`daily = ${date}`;
  else if (board === "city" && DATA.city[city]) where = sql`city_id = ${city}`;
  else return badRequest();

  // best run per exact name (ties go to whoever got there first), then rank those
  const rows = await sql`
    select name, score, ending_id, city_id, days, age, created_at from (
      select distinct on (name) name, score, ending_id, city_id, days, age, created_at
      from runs where name is not null and not hidden and ${where}
      order by name, score desc, created_at
    ) best
    order by score desc, created_at limit ${TOP}`;

  const entries: BoardEntry[] = rows.map((r, i) => ({
    rank: i + 1,
    name: String(r.name),
    score: Number(r.score),
    endingId: String(r.ending_id),
    cityId: String(r.city_id),
    days: Number(r.days),
    age: Number(r.age),
    at: new Date(String(r.created_at)).getTime(),
  }));
  return json({ ok: true, entries });
}

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as { runId?: unknown; playerId?: unknown; name?: unknown } | null;
  const name = cleanName(body?.name);
  const runId = body?.runId;
  if (!name || typeof runId !== "string" || !/^[a-f0-9]{20}$/.test(runId) || !isPlayerId(body?.playerId)) return badRequest();
  if (!isNameAllowed(name)) return json({ ok: false, error: "name_blocked" }, 422);
  if (!(await underLimit(sql, req, "claim", 30))) return rateLimited();

  const updated = await sql`
    update runs set claimed_at = now(),
      name = coalesce((select n.name from names n where lower(n.name) = lower(${name})), ${name})
    where id = ${runId} and player_id = ${body.playerId} and name is null
    returning name, score, daily::text as daily`;
  if (!updated.length) {
    const [run] = await sql`select name from runs where id = ${runId} and player_id = ${body.playerId}`;
    return run ? json({ ok: false, error: "already_claimed" }, 409) : json({ ok: false, error: "not_found" }, 404);
  }
  // the player's existing spelling wins: "wavy" claims as "WAVY" if WAVY played first
  const { score, daily } = updated[0];
  const canonical = String(updated[0].name);
  // ranks count other names only, matching the one-row-per-name boards
  const [{ rank }] = await sql`
    select count(distinct name)::int + 1 as rank from runs
    where name is not null and name <> ${canonical} and not hidden and score > ${score}`;
  let dailyRank: number | null = null;
  if (daily) {
    const [r] = await sql`
      select count(distinct name)::int + 1 as rank from runs
      where daily = ${daily} and name is not null and name <> ${canonical} and not hidden and score > ${score}`;
    dailyRank = r.rank;
  }
  return json({ ok: true, rank, dailyRank, name: canonical });
}
