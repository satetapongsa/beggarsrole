"use client";

import Flag from "@/components/Flag";
import { DATA } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import type { TimelineEntry } from "@/types/game";

const DOT: Record<TimelineEntry["kind"], string> = {
  start: "bg-amber-400",
  milestone: "bg-emerald-400",
  event: "bg-sky-400",
  life: "bg-fuchsia-400",
  ending: "bg-red-400",
};

export default function Timeline({ entries, fill }: { entries: TimelineEntry[]; fill?: (s: string) => string }) {
  const { lang, t } = useSettings();
  return (
    <ol className="relative ml-2 border-l border-night-600">
      {entries.map((e, i) => {
        const text = lang === "th" ? e.th : e.en;
        return (
          <li key={i} className="mb-3 ml-4 animate-fadeIn">
            <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${DOT[e.kind]}`} />
            <div className="text-[11px] text-stone-500">
              {t("hud.day", { day: e.day })} · {t("hud.age", { age: e.age })}
            </div>
            <div className="text-sm text-stone-200">
              {(() => {
                const c = DATA.cities.find((x) => x.flag === e.icon);
                return c ? <Flag cityId={c.id} size={18} className="mr-1 align-[-2px]" /> : <span aria-hidden>{e.icon} </span>;
              })()}
              {fill ? fill(text) : text}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
