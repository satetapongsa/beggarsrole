// GET  ?board=all|week|daily|city  (&city=<id>, &date=YYYY-MM-DD for daily)  → top 50
// POST { runId, playerId, name }  → put a verified run on the boards under a nickname

import { DATA } from "@/lib/data";
import { dailyDate, isDailyDate } from "@/lib/daily";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, underLimit } from "@/lib/db";
import { isNameAllowed } from "@/lib/moderation";

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

  let rows: Record<string, unknown>[];
  const cols = sql`name, score, ending_id, city_id, days, age, created_at`;
  const visible = sql`name is not null and not hidden`;
  if (board === "all") {
    rows = await sql`select ${cols} from runs where ${visible} order by score desc, created_at limit ${TOP}`;
  } else if (board === "week") {
    rows = await sql`
      select ${cols} from runs
      where ${visible} and created_at >= date_trunc('week', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'
      order by score desc, created_at limit ${TOP}`;
  } else if (board === "daily" && isDailyDate(date)) {
    rows = await sql`select ${cols} from runs where ${visible} and daily = ${date} order by score desc, created_at limit ${TOP}`;
  } else if (board === "city" && DATA.city[city]) {
    rows = await sql`select ${cols} from runs where ${visible} and city_id = ${city} order by score desc, created_at limit ${TOP}`;
  } else return badRequest();

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
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as { runId?: unknown; playerId?: unknown; name?: unknown } | null;
  const name = cleanName(body?.name);
  const runId = body?.runId;
  if (!name || typeof runId !== "string" || !/^[a-f0-9]{20}$/.test(runId) || !isPlayerId(body?.playerId)) return badRequest();
  if (!isNameAllowed(name)) return json({ ok: false, error: "name_blocked" }, 422);
  if (!(await underLimit(sql, req, "claim", 30))) return rateLimited();

  const updated = await sql`
    update runs set name = ${name}, claimed_at = now()
    where id = ${runId} and player_id = ${body.playerId} and name is null
    returning score, daily::text as daily`;
  if (!updated.length) {
    const [run] = await sql`select name from runs where id = ${runId} and player_id = ${body.playerId}`;
    return run ? json({ ok: false, error: "already_claimed" }, 409) : json({ ok: false, error: "not_found" }, 404);
  }
  const { score, daily } = updated[0];
  const [{ rank }] = await sql`
    select count(*)::int + 1 as rank from runs where name is not null and not hidden and score > ${score}`;
  let dailyRank: number | null = null;
  if (daily) {
    const [r] = await sql`
      select count(*)::int + 1 as rank from runs
      where daily = ${daily} and name is not null and not hidden and score > ${score}`;
    dailyRank = r.rank;
  }
  return json({ ok: true, rank, dailyRank });
}
