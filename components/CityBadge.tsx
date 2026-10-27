"use client";

import Flag from "@/components/Flag";
import { useSettings } from "@/lib/i18n";
import type { City } from "@/types/game";

const DIFF_STYLE: Record<string, string> = {
  easy: "text-emerald-300 border-emerald-700",
  normal: "text-amber-300 border-amber-700",
  hard: "text-orange-300 border-orange-700",
  brutal: "text-red-300 border-red-800",
};

export default function CityBadge({ city, showDifficulty = true }: { city: City; showDifficulty?: boolean }) {
  const { lang, t } = useSettings();
  return (
    <div className="inline-flex items-center gap-2">
      <Flag cityId={city.id} size={24} />
      <span className="font-medium text-stone-100">{lang === "th" ? city.name_th : city.name_en}</span>
      {showDifficulty && (
        <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${DIFF_STYLE[city.difficulty]}`}>
          {t(`difficulty.${city.difficulty}`)}
        </span>
      )}
    </div>
  );
}
