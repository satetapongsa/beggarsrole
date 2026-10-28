// Nickname filter for the public leaderboard (Thai + English). Matching runs on a normalized
// form — lowercase, leetspeak undone, spaces/punctuation/repeats stripped — so "F.u_c k" and
// "fuuuck" are caught too. Admins can still delete anything that slips through (/admin).

const BLOCKED_TH = [
  "เหี้ย", "เหี่ย", "สัส", "ควย", "เย็ด", "แตด", "ระยำ", "ชาติหมา", "พ่อมึง", "แม่มึง",
  "อีดอก", "ดอกทอง", "อีตัว", "กะหรี่", "ส้นตีน", "ไอ้เวร", "จัญไร", "เงี่ยน", "หน้าหี", "อีหี", "หีแม่",
  "อีควาย", "ไอ้ควาย", "ไอ้สัตว์", "อีสัตว์",
];
const BLOCKED_EN = [
  "fuck", "fuk", "shit", "bitch", "cunt", "nigg", "nigga", "faggot", "rapist", "whore", "slut",
  "pussy", "porn", "nazi", "hitler", "retard", "kys", "asshole", "bastard", "motherf",
];
/** Names that would impersonate the game itself. */
const RESERVED = ["admin", "moderator", "official", "sparechange", "แอดมิน"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

/** Trim, drop control/invisible characters, cap length. */
export function cleanName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const name = x
    .replace(/[\p{C}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(name);
  return chars.length >= 1 && chars.length <= 20 ? name : null;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c])
    .replace(/[^\p{L}\p{M}]/gu, "")
    .replace(/(.)\1+/gu, "$1");
}

export function isNameAllowed(name: string): boolean {
  const n = normalizeName(name);
  if (!n) return true;
  // collapse repeats in the word lists the same way, or "fuck" would never match "fuk"-style input
  const hit = (w: string) => n.includes(normalizeName(w));
  return !BLOCKED_TH.some(hit) && !BLOCKED_EN.some(hit) && !RESERVED.some(hit);
}
