"use client";

// One finished life told in full on the leaderboard: how long it lasted, the money left, the exact
// place it ended, the ending scene, why it ended, and the timeline of what happened along the way.

import { useEffect, useState } from "react";
import type { LifeStory } from "@/app/api/records/route";
import { DATA } from "@/lib/data";
import { formatMoney, formatNumber, interpolate, tx as txl } from "@/lib/format";
import { useSettings } from "@/lib/i18n";

export default function LifeStoryPanel({ id }: { id: string }) {
  const { lang, t } = useSettings();
  const [life, setLife] = useState<LifeStory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLife(null);
    setFailed(false);
    fetch(`/api/records?life=${id}`)
      .then((r) => r.json())
      .then((res) => alive && (res.ok ? setLife(res.life) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (failed) return <p className="px-4 py-3 text-xs text-stone-500">{t("story.failed")}</p>;
  if (!life) return <p className="px-4 py-3 text-xs text-stone-500">…</p>;

  const tx = (o: object, key: string) => txl(o, key, lang);
  const ending = DATA.ending[life.endingId];
  const endCity = DATA.city[life.endCityId ?? life.cityId];
  const spot = endCity?.spots.find((s) => s.id === life.endSpotId);
  const charName = lang === "th" ? life.charTh : life.charEn;
  const origin = life.originId ? DATA.origin[life.originId] : null;
  // ending text can name the character, the city or the dog; the saved life no longer has the dog's name
  const vars = { name: charName ?? "", city: endCity ? tx(endCity, "name") : "", dog: t("story.dog") };
  const timeline = life.story?.timeline ?? [];
  // what turned the life: the last thing that happened before the ending itself
  const turn = [...timeline].reverse().find((e) => e.kind !== "ending" && e.kind !== "start");
  const money =
    life.money === null || !endCity
      ? "—"
      : endCity.currency.code === "THB" || life.moneyThb === null
        ? formatMoney(life.money, endCity)
        : `${formatMoney(life.money, endCity)} (≈฿${formatNumber(life.moneyThb)})`;

  return (
    <div className="space-y-3 px-4 pb-4 text-left text-xs">
      {charName && (
        <p className="text-stone-400">
          {t("story.who", { name: charName, age: life.age - Math.floor(life.days / 365) })}
          {origin && ` — ${tx(origin, "name")}`}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["⏳", t("story.survived"), t("lb.days", { days: formatNumber(life.days) })],
            ["💰", t("story.money"), money],
            ["📍", t("story.place"), endCity ? `${tx(endCity, "name")}${spot ? ` · ${tx(spot, "name")}` : ""}` : "—"],
            ["🎂", t("story.age"), t("rec.d.age", { age: life.age })],
          ] as const
        ).map(([icon, k, v]) => (
          <div key={k} className="rounded-lg bg-night-800 p-2">
            <dt className="text-[10px] text-stone-500">
              {icon} {k}
            </dt>
            <dd className="mt-0.5 font-medium text-stone-100">{v}</dd>
          </div>
        ))}
      </dl>

      {ending && (
        <div className={`rounded-lg border p-3 ${ending.death ? "border-red-900/60 bg-red-950/20" : "border-emerald-800/60 bg-emerald-950/20"}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{t("story.scene")}</div>
          <div className="mt-1 text-sm font-semibold text-stone-100">
            {ending.icon} {tx(ending, "title")}
          </div>
          <p className="mt-1 leading-relaxed text-stone-300">{interpolate(tx(ending, "epitaph"), vars)}</p>
          <p className="mt-2 italic text-stone-400">“{interpolate(tx(ending, "line"), vars)}”</p>
        </div>
      )}

      <div className="rounded-lg bg-night-800 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{t("story.why")}</div>
        <p className="mt-1 text-stone-200">
          {ending?.death
            ? t("story.died", { cause: t(`cause.${life.cause ?? ending.death[0]}`) })
            : t("story.escaped")}
          {turn && (
            <>
              {" "}
              {t("story.turn")} <span className="text-stone-100">{turn.icon} {lang === "th" ? turn.th : turn.en}</span>{" "}
              <span className="text-stone-500">({t("story.onDay", { day: turn.day })})</span>
            </>
          )}
        </p>
      </div>

      {life.story ? (
        <>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-stone-400">
            <div>💵 {t("story.earned")}: <span className="text-stone-200">{endCity ? formatMoney(life.story.earned, endCity) : "—"}</span></div>
            <div>🤝 {t("story.friends")}: <span className="text-stone-200">{formatNumber(life.story.friends)}</span></div>
            <div>💛 {t("story.helped")}: <span className="text-stone-200">{formatNumber(life.story.helped)}</span></div>
            <div>🛏️ {t("story.shelter")}: <span className="text-stone-200">{formatNumber(life.story.nightsShelter)}</span></div>
          </dl>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{t("story.timeline")}</div>
            <ol className="max-h-64 space-y-1 overflow-y-auto border-l border-night-600 pl-3">
              {timeline.map((e, i) => (
                <li key={i} className={e.kind === "ending" ? "font-semibold text-lamp-300" : "text-stone-300"}>
                  <span className="mr-1.5 tabular-nums text-stone-500">{t("story.day", { day: e.day })}</span>
                  {e.icon} {lang === "th" ? e.th : e.en}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <p className="text-stone-500">{t("story.old")}</p>
      )}
    </div>
  );
}
