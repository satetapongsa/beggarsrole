"use client";

import { DATA } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import type { Companion } from "@/types/game";

interface Props {
  items: Record<string, number>;
  traits: string[];
  hiddenTraits: string[];
  companion: Companion | null;
}

export default function InventoryPanel({ items, traits, hiddenTraits, companion }: Props) {
  const { lang, t } = useSettings();
  const entries = Object.entries(items).filter(([id, n]) => n > 0 && DATA.item[id]);
  return (
    <div className="space-y-3">
      <section>
        <h3 className="mb-1.5 text-xs uppercase tracking-wider text-stone-500">{t("panel.traits")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {[...traits, ...hiddenTraits].map((id) => {
            const tr = DATA.trait[id];
            if (!tr) return null;
            return (
              <span
                key={id}
                title={lang === "th" ? tr.desc_th : tr.desc_en}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  tr.positive ? "border-emerald-800 bg-emerald-950/50 text-emerald-200" : "border-rose-900 bg-rose-950/50 text-rose-200"
                }`}
              >
                {tr.icon} {lang === "th" ? tr.name_th : tr.name_en}
              </span>
            );
          })}
        </div>
      </section>
      {companion && (
        <section>
          <h3 className="mb-1.5 text-xs uppercase tracking-wider text-stone-500">{t("panel.companion")}</h3>
          <div className="text-sm text-stone-200">🐕 {lang === "th" ? companion.name_th : companion.name_en}</div>
        </section>
      )}
      <section>
        <h3 className="mb-1.5 text-xs uppercase tracking-wider text-stone-500">{t("panel.inventory")}</h3>
        {entries.length === 0 ? (
          <p className="text-xs italic text-stone-500">{t("panel.empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1.5">
            {entries.map(([id, n]) => {
              const it = DATA.item[id];
              return (
                <li
                  key={id}
                  title={lang === "th" ? it.desc_th : it.desc_en}
                  className="flex items-center gap-1.5 rounded border border-night-700 bg-night-900 px-2 py-1 text-xs"
                >
                  <span aria-hidden>{it.icon}</span>
                  <span className="truncate text-stone-200">{lang === "th" ? it.name_th : it.name_en}</span>
                  {n > 1 && <span className="ml-auto font-medium tabular-nums text-amber-300">×{n}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
