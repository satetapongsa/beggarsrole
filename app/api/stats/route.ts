// Public play statistics: players, lives started/finished, today's numbers, most common endings.

import { getDb, json, offline, today } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = await getDb();
  if (!sql) return offline();
  const d = today();
  const [[totals], [todayRow], endings, cities] = await sql.transaction([
    sql`select (select count(*)::int from players) as players,
               (select coalesce(sum(starts), 0)::int from player_days) as started,
               (select count(*)::int from runs) as ended`,
    sql`select count(*)::int as players, coalesce(sum(starts), 0)::int as started from player_days where day = ${d}`,
    sql`select ending_id as id, count(*)::int as n from runs group by ending_id order by n desc`,
    sql`select city_id as id, count(*)::int as runs, round(avg(days))::int as "avgDays"
        from runs group by city_id order by runs desc`,
  ]);
  return json({
    ok: true,
    players: totals.players,
    started: totals.started,
    ended: totals.ended,
    today: { players: todayRow.players, started: todayRow.started },
    endings,
    cities,
  });
}
