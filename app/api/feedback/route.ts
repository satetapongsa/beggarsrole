// Bug reports and ideas sent from inside the game. Only admins read them (/admin); nothing here is
// shown to other players, so links are allowed and there is no word filter.
// POST { playerId, kind: "bug"|"idea"|"other", text, contact?, page, lang, city?, day?, seed? }

import { DATA } from "@/lib/data";
import { badRequest, getDb, isPlayerId, json, offline, rateLimited, underLimit } from "@/lib/db";

export const dynamic = "force-dynamic";

const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
const TEXT_MIN = 5;
const TEXT_MAX = 1000; // keep in step with components/FeedbackModal.tsx
const CONTACT_MAX = 100;

const isInt = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;

/** Keeps line breaks, drops other control characters. */
function clean(x: unknown, max: number): string | null {
  if (typeof x !== "string") return null;
  const text = x
    .replace(/\r\n?/g, "\n")
    .replace(/[^\P{C}\n]/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return Array.from(text).length <= max ? text : null;
}

export async function POST(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isPlayerId(body.playerId)) return badRequest();
  if (!FEEDBACK_KINDS.includes(body.kind as (typeof FEEDBACK_KINDS)[number])) return badRequest();

  const text = clean(body.text, TEXT_MAX);
  if (!text || Array.from(text).length < TEXT_MIN) return json({ ok: false, error: "bad_text" }, 422);
  const contact = body.contact === undefined || body.contact === "" ? "" : clean(body.contact, CONTACT_MAX);
  if (contact === null) return badRequest();
  const page = typeof body.page === "string" && /^\/[a-z/-]{0,40}$/.test(body.page) ? body.page : "/";
  const lang = body.lang === "en" ? "en" : "th";
  const city = typeof body.city === "string" && DATA.city[body.city] ? body.city : null;
  const day = isInt(body.day, 1, 100000) ? body.day : null;
  const seed = isInt(body.seed, 0, 0xffffffff) ? body.seed : null;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 200);

  if (!(await underLimit(sql, req, "feedback", 6))) return rateLimited();
  const [row] = await sql`
    insert into feedback (player_id, kind, body, contact, page, lang, city_id, day, seed, user_agent)
    values (${body.playerId}, ${body.kind as string}, ${text}, ${contact || null}, ${page}, ${lang}, ${city}, ${day}, ${seed}, ${userAgent})
    returning id`;
  return json({ ok: true, id: Number(row.id) });
}
