// Admin dashboard data + leaderboard moderation. Requires `Authorization: Bearer <ADMIN_TOKEN>`.
// GET                                   → daily series, how long lives last, recent names
// POST { action: "hide"|"unhide", runId } → remove/restore a run on every board

import { timingSafeEqual } from "node:crypto";
import { badRequest, getDb, json, offline, today } from "@/lib/db";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token || token.length < 12) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

const unauthorized = () => json({ ok: false, error: "unauthorized" }, 401);

export async function GET(req: Request) {
  if (!authorized(req)) return unauthorized();
  const sql = await getDb();
  if (!sql) return offline();
  const [series, lengths, recent, [totals]] = await sql.transaction([
    sql`
      select d::date::text as day,
             coalesce(count(pd.player_id), 0)::int as players,
             coalesce(sum(pd.starts), 0)::int as started,
             coalesce(sum(pd.ends), 0)::int as ended,
             (select count(*)::int from players p where (p.first_seen at time zone 'Asia/Bangkok')::date = d::date) as "newPlayers"
      from generate_series(${today()}::date - 29, ${today()}::date, interval '1 day') d
      left join player_days pd on pd.day = d::date
      group by d order by d`,
    sql`
      select bucket, count(*)::int as n from (
        select case when days <= 7 then '0–7' when days <= 30 then '8–30' when days <= 90 then '31–90'
                    when days <= 180 then '91–180' when days <= 365 then '181–365' else '365+' end as bucket,
               case when days <= 7 then 0 when days <= 30 then 1 when days <= 90 then 2
                    when days <= 180 then 3 when days <= 365 then 4 else 5 end as ord
        from runs) b
      group by bucket, ord order by ord`,
    sql`
      select id, name, score, ending_id as "endingId", city_id as "cityId", hidden, claimed_at as "claimedAt"
      from runs where name is not null order by claimed_at desc limit 100`,
    sql`
      select (select count(*)::int from players) as players,
             (select coalesce(sum(starts), 0)::int from player_days) as started,
             (select count(*)::int from runs) as ended,
             (select count(*)::int from runs where name is not null) as claimed,
             (select count(*)::int from runs where daily is not null) as daily`,
  ]);
  return json({ ok: true, totals, series, lengths, recent });
}

export async function POST(req: Request) {
  if (!authorized(req)) return unauthorized();
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as { action?: unknown; runId?: unknown } | null;
  if ((body?.action !== "hide" && body?.action !== "unhide") || typeof body.runId !== "string") return badRequest();
  const rows = await sql`update runs set hidden = ${body.action === "hide"} where id = ${body.runId} returning id`;
  return rows.length ? json({ ok: true }) : json({ ok: false, error: "not_found" }, 404);
}
