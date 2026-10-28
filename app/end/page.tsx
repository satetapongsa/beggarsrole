"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CharacterSprite from "@/components/CharacterSprite";
import CityBadge from "@/components/CityBadge";
import FeedbackModal from "@/components/FeedbackModal";
import RunPanel from "@/components/RunPanel";
import SurvivorPoster from "@/components/SurvivorPoster";
import Timeline from "@/components/Timeline";
import { DATA } from "@/lib/data";
import { cityOf } from "@/lib/conditions";
import { dailyNumber } from "@/lib/daily";
import { lifeStats } from "@/lib/engine";
import { fill, formatMoney, formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { startLife } from "@/lib/online";
import { makeSeed } from "@/lib/rng";
import { ACHIEVEMENT, lifeKey, TIER_STYLE } from "@/lib/achievements";
import { loadAchievements, loadEndingsFound, loadLastLife, type LastRun } from "@/lib/storage";
import { RARITY_STYLE } from "@/lib/ui";
import type { GameState } from "@/types/game";

export default function EndPage() {
  const router = useRouter();
  const { lang, setLang, t, sfx } = useSettings();
  const [life, setLife] = useState<GameState | null | undefined>(undefined);
  const [found, setFound] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [run, setRun] = useState<LastRun | null>(null);

  const [fresh, setFresh] = useState<string[]>([]);

  useEffect(() => {
    const l = loadLastLife();
    setLife(l);
    setFound(loadEndingsFound());
    if (l) {
      const key = lifeKey(l);
      setFresh(Object.entries(loadAchievements()).filter(([, v]) => v.life === key).map(([id]) => id));
    }
  }, []);

  const ending = life?.ended ? DATA.ending[life.ended.endingId] : null;

  const ogUrl = useMemo(() => {
    if (!life || !ending) return "";
    const city = cityOf(life);
    const st = lifeStats(life);
    const p = new URLSearchParams({
      lang,
      flag: city.flag,
      city: lang === "th" ? city.name_th : city.name_en,
      name: lang === "th" ? life.character.name_th : life.character.name_en,
      age: `${life.character.ageStart}–${life.ended!.age}`,
      ending: lang === "th" ? ending.title_th : ending.title_en,
      icon: ending.icon,
      rarity: ending.rarity,
      rarityLabel: t(`rarity.${ending.rarity}`),
      line: fill(lang === "th" ? ending.line_th : ending.line_en, life, lang),
      s1: `${formatNumber(st.days)} ${t("og.days")}`,
      s2: `${st.friends} ${t("og.friends")}`,
      s3: `${st.mealsGiven} ${t("og.meals")}`,
    });
    if (run?.score) {
      p.set("score", formatNumber(run.score));
      p.set("scoreLabel", t("og.score"));
      if (run.daily && run.dailyRank) p.set("rank", t("daily.rank", { n: dailyNumber(run.daily), rank: formatNumber(run.dailyRank) }));
      else if (run.rank) p.set("rank", t("lb.rank", { rank: formatNumber(run.rank) }));
    }
    return `/api/og?${p.toString()}`;
  }, [life, ending, lang, t, run]);

  if (life === undefined) return <div className="flex min-h-dvh items-center justify-center text-stone-500">…</div>;

  if (!life || !ending || !life.ended) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-stone-400">{t("end.noLife")}</p>
        <button type="button" onClick={() => router.push("/")} className="rounded-lg bg-lamp-500 px-5 py-2 font-medium text-black">
          {t("end.home")}
        </button>
      </main>
    );
  }

  const city = cityOf(life);
  const st = lifeStats(life);
  const deathEnding = !!ending.death;
  const shareText = t("end.shareText", {
    days: formatNumber(st.days),
    city: lang === "th" ? city.name_th : city.name_en,
    flag: city.flag,
    ending: lang === "th" ? ending.title_th : ending.title_en,
    rarity: t(`rarity.${ending.rarity}`),
    line: fill(lang === "th" ? ending.line_th : ending.line_en, life, lang),
  }) + (run?.score ? `
🏆 ${t("end.shareScore", { score: formatNumber(run.score) })}${run.daily ? ` · 📅 ${t("daily.badge", { n: dailyNumber(run.daily) })}` : ""}` : "");

  const start = (seed: number) => {
    sfx("good");
    startLife(seed);
    router.push("/play");
  };

  const share = async () => {
    const abs = `${window.location.origin}${ogUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "SPARE CHANGE", text: shareText, url: abs });
        return;
      }
    } catch {
      /* user cancelled or unsupported — fall through */
    }
    window.open(abs, "_blank", "noopener");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const stats: [string, string, string][] = [
    ["📅", t("end.days"), formatNumber(st.days)],
    ["💰", t("end.earned"), formatMoney(st.earned, city)],
    ["🍚", t("end.mealsGiven"), String(st.mealsGiven)],
    ["🤝", t("end.friends"), String(st.friends)],
    ["🌍", t("end.cities"), String(st.cities)],
    ["🫶", t("end.helped"), String(st.helped)],
    ["🛏️", t("end.nights"), String(st.nightsShelter)],
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <CityBadge city={city} showDifficulty={false} />
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
      </div>

      <section className="animate-fadeIn text-center">
        {deathEnding ? (
          <div className="mx-auto mb-3 inline-block rounded-full border border-red-900 bg-red-950/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
            🕯️ {t("end.gameOver")}
          </div>
        ) : (
          <div className="mx-auto mb-3 inline-block rounded-full border border-emerald-800 bg-emerald-950/50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
            🌅 {t("end.survived")}
          </div>
        )}
        <div className={`mx-auto mb-3 flex justify-center ${deathEnding ? "opacity-60 grayscale" : ""}`}>
          <CharacterSprite appearance={life.character.appearance} hygiene={life.stats.hygiene} size={56} dog={!!life.companion} />
        </div>
        <div className="text-xl font-semibold">{lang === "th" ? life.character.name_th : life.character.name_en}</div>
        <div className="text-sm text-stone-400">
          {deathEnding ? t("end.died", { age: life.ended.age }) : t("end.age", { age: life.ended.age })}
        </div>
        <div className="mt-6 animate-popIn text-6xl" aria-hidden>
          {ending.icon}
        </div>
        <h1 className={`mt-2 text-3xl font-bold ${deathEnding ? "text-red-200" : "lamp-glow text-lamp-300"}`}>{lang === "th" ? ending.title_th : ending.title_en}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${RARITY_STYLE[ending.rarity]}`}>
            {t(`rarity.${ending.rarity}`)}
          </span>
          {ending.hidden && <span className="rounded-full border border-fuchsia-700 px-3 py-0.5 text-xs text-fuchsia-300">✨ {t("end.hidden")}</span>}
        </div>
        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-stone-300">
          {fill(lang === "th" ? ending.epitaph_th : ending.epitaph_en, life, lang)}
        </p>
        <Link href="/endings" className="mt-3 inline-block text-xs text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline">
          📖 {t("end.endingsFound", { n: found.length, total: DATA.endings.length })}
        </Link>
      </section>

      {fresh.length > 0 && (
        <section className="mt-6 animate-fadeIn rounded-xl border border-yellow-700/60 bg-night-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-yellow-300">🏅 {t("ach.new")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {fresh.map((id) => ACHIEVEMENT[id]).filter(Boolean).map((a) => (
              <li key={a.id} className={`flex items-center gap-3 rounded-lg border bg-night-800 p-2.5 ${TIER_STYLE[a.tier]}`}>
                <span className="text-2xl" aria-hidden>{a.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-stone-100">{lang === "th" ? a.name_th : a.name_en}</span>
                  <span className="block text-xs text-stone-400">{lang === "th" ? a.desc_th : a.desc_en}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/achievements" className="mt-3 inline-block text-xs text-stone-500 hover:text-stone-300 hover:underline">
            {t("title.achievements")} →
          </Link>
        </section>
      )}

      <RunPanel life={life} onResult={setRun} />

      {!deathEnding && <SurvivorPoster life={life} ending={ending} run={run} />}

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("end.stats")}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map(([icon, label, value]) => (
            <div key={label} className="rounded-lg bg-night-800 p-3">
              <dt className="text-[11px] text-stone-400">
                {icon} {label}
              </dt>
              <dd className="font-medium tabular-nums text-lg text-stone-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("end.timeline")}</h2>
        <div className="scrollbar-thin max-h-[28rem] overflow-y-auto pr-2">
          <Timeline entries={life.timeline} fill={(s) => fill(s, life, lang)} />
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {ogUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ogUrl} alt={lang === "th" ? ending.title_th : ending.title_en} className="w-full rounded-xl border border-night-700" />
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={share} className="rounded-lg bg-lamp-500 px-4 py-3 font-semibold text-black hover:bg-lamp-400">
            📤 {t("end.share")}
          </button>
          <button type="button" onClick={copy} className="rounded-lg border border-night-600 bg-night-800 px-4 py-3 hover:bg-night-700">
            📋 {copied ? t("end.copied") : t("end.copy")}
          </button>
          <button type="button" onClick={() => start(makeSeed())} className="rounded-lg border border-night-600 bg-night-800 px-4 py-3 hover:bg-night-700">
            🎲 {t("end.again")}
          </button>
          <button type="button" onClick={() => start(life.seed)} className="rounded-lg border border-night-600 bg-night-800 px-4 py-3 hover:bg-night-700">
            🔁 {t("end.replay")} <span className="font-medium tabular-nums text-xs text-stone-500">#{life.seed}</span>
          </button>
        </div>
        <button type="button" onClick={() => router.push("/")} className="w-full py-2 text-sm text-stone-500 hover:text-stone-300">
          {t("end.home")}
        </button>
        <button type="button" onClick={() => setFeedback(true)} className="w-full py-1 text-xs text-stone-500 hover:text-stone-300">
          💬 {t("feedback.title")}
        </button>
      </section>

      <p className="mx-auto mt-8 max-w-md text-center text-[11px] leading-relaxed text-stone-500">{t("end.note")}</p>
      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}
    </main>
  );
}
