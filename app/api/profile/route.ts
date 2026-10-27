// Endings collection that follows the player across devices, without a login.
// POST { action: "sync", playerId, endings[] } → merges local endings, returns the full set
// POST { action: "code", playerId }            → the player's recovery code (created once)
// POST { action: "restore", code }             → playerId + endings for that code

import { randomBytes } from "node:crypto";
import { DATA } from "@/lib/data";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, underLimit, type Sql } from "@/lib/db";

// no 0/O/1/I/L — codes get typed in by hand
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function makeCode(): string {
  const bytes = randomBytes(8);
  const c = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

async function endingsOf(sql: Sql, playerId: string): Promise<string[]> {
  const rows = await sql`select ending_id from player_endings where player_id = ${playerId} order by found_at`;
  return rows.map((r) => String(r.ending_id));
}

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as { action?: unknown; playerId?: unknown; endings?: unknown; code?: unknown } | null;
  if (!(await underLimit(sql, req, "profile", 60))) return rateLimited();

  if (body?.action === "restore") {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    if (code.length !== 8) return badRequest();
    const [p] = await sql`select id from players where recovery_code = ${`${code.slice(0, 4)}-${code.slice(4)}`}`;
    if (!p) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, playerId: p.id, endings: await endingsOf(sql, String(p.id)) });
  }

  if (!isPlayerId(body?.playerId)) return badRequest();
  const playerId = body.playerId;
  await sql`insert into players (id) values (${playerId}) on conflict (id) do update set last_seen = now()`;

  if (body.action === "sync") {
    const local = Array.isArray(body.endings) ? body.endings.filter((e): e is string => typeof e === "string" && !!DATA.ending[e]) : [];
    if (local.length)
      await sql`
        insert into player_endings (player_id, ending_id)
        select ${playerId}, unnest(${local}::text[]) on conflict do nothing`;
    return json({ ok: true, endings: await endingsOf(sql, playerId) });
  }

  if (body.action === "code") {
    const [p] = await sql`select recovery_code from players where id = ${playerId}`;
    if (p?.recovery_code) return json({ ok: true, code: p.recovery_code });
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      const set = await sql`
        update players set recovery_code = ${code} where id = ${playerId} and recovery_code is null
          and not exists (select 1 from players where recovery_code = ${code})
        returning recovery_code`;
      if (set.length) return json({ ok: true, code });
    }
    return json({ ok: false, error: "try_again" }, 500);
  }

  return badRequest();
}
