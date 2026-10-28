"use client";

// Achievements and career totals across every life played on this device.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS, EMPTY_CAREER, POSTER_UNLOCKS, TIER_STYLE, type Achievement, type Career } from "@/lib/achievements";
import { formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { loadAchievements, loadCareer, loadEndingsFound, type Earned } from "@/lib/storage";

export default function AchievementsPage() {
  const { lang, setLang, t } = useSettings();
  const [earned, setEarned] = useState<Earned>({});
  const [career, setCareer] = useState<Career>(EMPTY_CAREER);
  const [endings, setEndings] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEarned(loadAchievements());
    setCareer(loadCareer());
    setEndings(new Set(loadEndingsFound()));
  }, []);

  const count = Object.keys(earned).length;
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const card = (a: Achievement) => {
    const got = earned[a.id];
    const hidden = !got && a.secret;
    const prog = !got && a.progress ? a.progress({ career, endings }) : null;
    return (
      <li key={a.id} className={`flex gap-3 rounded-xl border p-3 ${got ? `bg-night-800 ${TIER_STYLE[a.tier]}` : "border-dashed border-night-700 bg-night-900/60"}`}>
        <div className={`text-3xl ${got ? "" : "opacity-30 grayscale"}`} aria-hidden>
          {hidden ? "❔" : a.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-sm font-medium ${got ? "text-stone-100" : "text-stone-400"}`}>{hidden ? t("ach.secret") : lang === "th" ? a.name_th : a.name_en}</span>
            <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-80">{t(`ach.tier.${a.tier}`)}</span>
          </div>
          <p className="text-xs text-stone-400">{hidden ? "???" : lang === "th" ? a.desc_th : a.desc_en}</p>
          {got && <p className="mt-1 text-[10px] text-stone-500">{t("ach.earnedOn", { date: date(got.at) })}</p>}
          {prog && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-night-700">
                <div className="h-full bg-lamp-500" style={{ width: `${Math.round((prog[0] / prog[1]) * 100)}%` }} />
              </div>
              <span className="text-[10px] tabular-nums text-stone-500">
                {formatNumber(prog[0])}/{formatNumber(prog[1])}
              </span>
            </div>
          )}
        </div>
      </li>
    );
  };

  const stats: [string, string][] = [
    [t("ach.lives"), formatNumber(career.lives)],
    [t("ach.escapes"), formatNumber(career.escapes)],
    [t("ach.deaths"), formatNumber(career.deaths)],
    [t("ach.days"), formatNumber(career.days)],
    [t("ach.bestDays"), formatNumber(career.bestDays)],
    [t("ach.bestScore"), formatNumber(career.bestScore)],
    [t("ach.cities"), formatNumber(career.cities.length)],
    [t("ach.friendsTotal"), formatNumber(career.friends)],
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">
          ← {t("end.home")}
        </Link>
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
      </div>

      <h1 className="lamp-glow text-center font-pixel text-4xl font-bold text-lamp-300">🏅 {t("ach.title")}</h1>
      <p className="mt-2 text-center text-sm text-stone-400">{t("ach.count", { n: count, total: ACHIEVEMENTS.length })}</p>

      <section className="mt-8 rounded-xl border border-night-700 bg-night-900 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("ach.career")}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-night-800 p-3">
              <dt className="text-[11px] text-stone-400">{label}</dt>
              <dd className="text-lg font-medium tabular-nums text-stone-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("ach.rewards")}</h2>
        <ul className="space-y-1 text-sm">
          {POSTER_UNLOCKS.map((u) => (
            <li key={u.theme} className={count >= u.need ? "text-emerald-300" : "text-stone-400"}>
              {count >= u.need ? "✔" : "🔒"} {t("ach.reward", { theme: t(`poster.theme.${u.theme}`), n: u.need })}
            </li>
          ))}
        </ul>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">{ACHIEVEMENTS.map(card)}</ul>
    </main>
  );
}
