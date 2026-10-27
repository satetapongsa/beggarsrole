// Counts a new life being started (and the player as a visitor today).

import { badRequest, getDb, isPlayerId, json, offline, rateLimited, today, underLimit } from "@/lib/db";

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as { playerId?: unknown } | null;
  if (!isPlayerId(body?.playerId)) return badRequest();
  if (!(await underLimit(sql, req, "track", 120))) return rateLimited();

  const id = body.playerId;
  await sql.transaction([
    sql`insert into players (id) values (${id}) on conflict (id) do update set last_seen = now()`,
    sql`insert into player_days (player_id, day, starts) values (${id}, ${today()}, 1)
        on conflict (player_id, day) do update set starts = player_days.starts + 1`,
  ]);
  return json({ ok: true });
}
