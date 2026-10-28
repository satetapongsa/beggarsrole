// Traces other players left at a spot: graves and ways out (written by /api/runs when a life ends)
// and short notes written during play. Everything here is decoration around the game — it never
// touches the engine, so lives still replay exactly on the server.
// GET  ?city=<id>&spot=<id>(&playerId=)            → newest traces at that spot
// POST { action: "note", playerId, city, spot, nameTh, nameEn, age, day, text } → leave a note
// POST { action: "candle", playerId, traceId }     → light a candle on a grave (once per player)

import { DATA } from "@/lib/data";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, underLimit } from "@/lib/db";
import { isNameAllowed } from "@/lib/moderation";
import type { Trace } from "@/lib/online";

export const dynamic = "force-dynamic";

const LIMIT = 15;
const NOTE_MAX = 80; // keep in step with components/TracesPanel.tsx


const validSpot = (city: unknown, spot: unknown) =>
  typeof city === "string" && typeof spot === "string" && !!DATA.city[city]?.spots.some((sp) => sp.id === spot);

const isInt = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;

/** One line, no control characters, no links. */
function cleanNote(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const text = x
    .replace(/[\p{C}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const n = Array.from(text).length;
  if (n < 2 || n > NOTE_MAX) return null;
  if (/https?:|www\.|\.(com|net|org|io|gg|me|th)\b|@\w/i.test(text)) return null;
  return text;
}

function cleanCharName(x: unknown): string | null {
  return typeof x === "string" && x.trim().length > 0 && Array.from(x).length <= 40 ? x.trim() : null;
}

export async function GET(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const url = new URL(req.url);
  const city = url.searchParams.get("city");
  const spot = url.searchParams.get("spot");
  if (!validSpot(city, spot)) return badRequest();
  const playerId = url.searchParams.get("playerId") ?? "";

  const [rows, [{ total }]] = await sql.transaction([
    sql`
      select t.id, t.kind, t.name_th, t.name_en, t.age, t.day, t.ending_id, t.body, t.candles, t.created_at,
             exists(select 1 from trace_candles c where c.trace_id = t.id and c.player_id = ${playerId}) as lit
      from traces t
      where t.city_id = ${city} and t.spot_id = ${spot} and not t.hidden
      order by t.created_at desc limit ${LIMIT}`,
    sql`select count(*)::int as total from traces where city_id = ${city} and spot_id = ${spot} and not hidden`,
  ]);
  const traces: Trace[] = rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind as Trace["kind"],
    nameTh: String(r.name_th),
    nameEn: String(r.name_en),
    age: Number(r.age),
    day: Number(r.day),
    endingId: r.ending_id ? String(r.ending_id) : null,
    body: r.body ? String(r.body) : null,
    candles: Number(r.candles),
    lit: !!r.lit,
    at: new Date(String(r.created_at)).getTime(),
  }));
  return json({ ok: true, traces, total });
}

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isPlayerId(body.playerId)) return badRequest();
  const playerId = body.playerId;

  if (body.action === "note") {
    const nameTh = cleanCharName(body.nameTh);
    const nameEn = cleanCharName(body.nameEn);
    if (!validSpot(body.city, body.spot) || !nameTh || !nameEn || !isInt(body.age, 0, 130) || !isInt(body.day, 1, 100000)) {
      return badRequest();
    }
    const text = cleanNote(body.text);
    if (!text) return json({ ok: false, error: "bad_note" }, 422);
    if (!isNameAllowed(text)) return json({ ok: false, error: "note_blocked" }, 422);
    if (!(await underLimit(sql, req, "note", 12))) return rateLimited();
    const [row] = await sql`
      insert into traces (player_id, kind, city_id, spot_id, name_th, name_en, age, day, body)
      values (${playerId}, 'note', ${body.city as string}, ${body.spot as string}, ${nameTh}, ${nameEn}, ${body.age}, ${body.day}, ${text})
      returning id`;
    return json({ ok: true, id: Number(row.id) });
  }

  if (body.action === "candle") {
    if (!isInt(body.traceId, 1, Number.MAX_SAFE_INTEGER)) return badRequest();
    if (!(await underLimit(sql, req, "candle", 200))) return rateLimited();
    const added = await sql`
      insert into trace_candles (trace_id, player_id)
      select id, ${playerId} from traces where id = ${body.traceId} and kind = 'grave' and not hidden
      on conflict do nothing returning trace_id`;
    if (!added.length) {
      const [lit] = await sql`select 1 from trace_candles where trace_id = ${body.traceId} and player_id = ${playerId}`;
      return lit ? json({ ok: false, error: "already_lit" }, 409) : json({ ok: false, error: "not_found" }, 404);
    }
    const [row] = await sql`update traces set candles = candles + 1 where id = ${body.traceId} returning candles`;
    return json({ ok: true, candles: Number(row.candles) });
  }

  return badRequest();
}
