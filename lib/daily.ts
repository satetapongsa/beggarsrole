// Daily challenge calendar, shared by client and server. A "day" runs on Bangkok time (UTC+7),
// since most players are in Thailand. The seed itself is server-only (lib/daily-seed.ts).

export const DAILY_LAUNCH = "2026-10-28";
const OFFSET_MS = 7 * 3600000;

export function dailyDate(now = Date.now()): string {
  return new Date(now + OFFSET_MS).toISOString().slice(0, 10);
}

/** "#1" on launch day, counting up. */
export function dailyNumber(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(DAILY_LAUNCH)) / 86400000) + 1;
}

export const isDailyDate = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
