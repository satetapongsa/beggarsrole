// Server-only: the daily seed is derived from a secret, so nobody can pre-solve future days.

import { createHash } from "node:crypto";
import { dailyDate } from "@/lib/daily";

export function dailySeed(date: string): number {
  const secret = process.env.DAILY_SECRET ?? "spare-change-daily";
  return createHash("sha256").update(`${secret}:${date}`).digest().readUInt32BE(0);
}

/** A daily life may be submitted on its own day, or the next one if it ran past midnight. */
export function isOpenDaily(date: string, now = Date.now()): boolean {
  return date === dailyDate(now) || date === dailyDate(now - 86400000);
}
