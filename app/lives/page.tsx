"use client";

// Past lives: every finished life on this device, newest first, with a way to live it again.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CharacterSprite from "@/components/CharacterSprite";
import Flag from "@/components/Flag";
import { DATA } from "@/lib/data";
import { dailyNumber } from "@/lib/daily";
import { formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { startLife } from "@/lib/online";
import { loadNickname, loadPastLives, type PastLife } from "@/lib/storage";
import { RARITY_STYLE } from "@/lib/ui";

type Filter = "all" | "escaped" | "died";
type Sort = "recent" | "score" | "days";

export default function LivesPage() {
  const router = useRouter();
  const { lang, setLang, t, sfx } = useSettings();
  const [lives, setLives] = useState<PastLife[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  useEffect(() => setLives(loadPastLives()), []);

  const shown = useMemo(() => {
    const list = (lives ?? []).filter((l) => {
      const e = DATA.ending[l.endingId];
      if (!e) return false;
      return filter === "all" || (filter === "died" ? !!e.death : !e.death);
    });
    if (sort === "score") return [...list].sort((a, b) => b.score - a.score);
    if (sort === "days") return [...list].sort((a, b) => b.days - a.days);
    return list;
  }, [lives, filter, sort]);

  const replay = (seed: number) => {
    // every life starts under a name: without one, go pick it on the title screen first
    if (!loadNickname()) return router.push("/");
    sfx("good");
    startLife(seed);
    router.push("/play");
  };

  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short" });
  const tab = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-lamp-500 bg-lamp-500/15 text-lamp-200" : "border-night-700 text-stone-400 hover:bg-night-800"}`;

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

      <h1 className="lamp-glow text-center font-pixel text-4xl font-bold text-lamp-300">🕯️ {t("lives.title")}</h1>
      <p className="mt-2 text-center text-sm text-stone-400">{t("lives.sub")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["all", "escaped", "died"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={tab(filter === f)}>
              {t(`lives.filter.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["recent", "score", "days"] as Sort[]).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)} className={tab(sort === s)}>
              {t(`lives.sort.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {lives !== null && shown.length === 0 && <p className="mt-10 text-center text-sm text-stone-500">{t("lives.empty")}</p>}

      <ul className="mt-4 space-y-3">
        {shown.map((l) => {
          const e = DATA.ending[l.endingId];
          const died = !!e.death;
          return (
            <li key={l.key} className={`flex gap-3 rounded-xl border p-3 ${died ? "border-night-700 bg-night-900" : "border-emerald-900/70 bg-night-900"}`}>
              <div className={`shrink-0 ${died ? "opacity-60 grayscale" : ""}`}>
                <CharacterSprite appearance={l.appearance} hygiene={60} size={40} dog={l.dog} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-medium text-stone-100">
                    {lang === "th" ? l.name_th : l.name_en}
                    <span className="ml-1.5 text-xs font-normal text-stone-500">
                      {l.ageStart === l.ageEnd ? t("poster.ageOne", { age: l.ageStart }) : t("poster.age", { from: l.ageStart, to: l.ageEnd })}
                    </span>
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {l.daily ? `${t("daily.badge", { n: dailyNumber(l.daily) })} · ` : ""}
                    {date(l.at)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span aria-hidden>{e.icon}</span>
                  <span className={`text-sm ${died ? "text-red-200" : "text-lamp-200"}`}>{lang === "th" ? e.title_th : e.title_en}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RARITY_STYLE[e.rarity]}`}>{t(`rarity.${e.rarity}`)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    {l.cities.map((c) => (
                      <Flag key={c} cityId={c} size={16} />
                    ))}
                    <span className="ml-0.5">{l.cities.map((c) => (lang === "th" ? DATA.city[c]?.name_th : DATA.city[c]?.name_en)).join(" → ")}</span>
                  </span>
                  <span>{t("lives.days", { n: formatNumber(l.days) })}</span>
                  {l.score > 0 && <span>{t("lives.score", { n: formatNumber(l.score) })}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => replay(l.seed)}
                title={t("end.replay")}
                className="shrink-0 self-center rounded-lg border border-night-600 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-night-800"
              >
                {t("lives.replay")}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
