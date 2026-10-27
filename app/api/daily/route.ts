// Today's daily challenge: everyone gets the same seed (same person, same city).

import { dailyDate, dailyNumber } from "@/lib/daily";
import { dailySeed } from "@/lib/daily-seed";
import { json } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const date = dailyDate();
  return json({ ok: true, date, number: dailyNumber(date), seed: dailySeed(date) });
}
