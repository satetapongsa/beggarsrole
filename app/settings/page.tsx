"use client";

// Player settings: language, sound, text speed, motion and first-time tips.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/i18n";
import { playSfx } from "@/lib/sound";
import { loadTips, saveTips, type Motion, type TextSpeed, type TipState } from "@/lib/storage";
import type { Lang } from "@/types/game";

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-night-950 p-1" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-md px-2.5 py-1.5 text-sm ${value === v ? "bg-night-700 text-lamp-300" : "text-stone-400 hover:text-stone-200"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-night-700 bg-night-900 p-4">
      <h2 className="font-medium text-stone-100">{title}</h2>
      {hint && <p className="mb-2.5 mt-0.5 text-xs text-stone-400">{hint}</p>}
      <div className={hint ? "" : "mt-2.5"}>{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { lang, setLang, sound, setSound, textSpeed, setTextSpeed, motion, setMotion, t } = useSettings();
  const [tips, setTips] = useState<TipState | null>(null);
  const [tipsReset, setTipsReset] = useState(false);

  useEffect(() => setTips(loadTips()), []);

  const updateTips = (next: TipState) => {
    setTips(next);
    saveTips(next);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">
          ← {t("end.home")}
        </Link>
      </div>
      <h1 className="mb-5 text-2xl font-semibold text-lamp-300">{t("settings.title")}</h1>

      <div className="space-y-3">
        <Row title={t("settings.lang")}>
          <Choice<Lang>
            value={lang}
            options={[
              ["th", "ไทย"],
              ["en", "English"],
            ]}
            onChange={setLang}
          />
        </Row>

        <Row title={t("settings.sound")} hint={t("settings.soundHint")}>
          <Choice<"on" | "off">
            value={sound ? "on" : "off"}
            options={[
              ["on", t("settings.on")],
              ["off", t("settings.off")],
            ]}
            onChange={(v) => {
              setSound(v === "on");
              // play a sample right away so the player hears what they turned on
              if (v === "on") playSfx("coin");
            }}
          />
        </Row>

        <Row title={t("settings.textSpeed")} hint={t("settings.textSpeedHint")}>
          <Choice<TextSpeed>
            value={textSpeed}
            options={(["slow", "normal", "fast", "instant"] as const).map((v) => [v, t(`settings.speed.${v}`)])}
            onChange={setTextSpeed}
          />
        </Row>

        <Row title={t("settings.motion")} hint={t("settings.motionHint")}>
          <Choice<Motion>
            value={motion}
            options={(["system", "reduce", "full"] as const).map((v) => [v, t(`settings.motion.${v}`)])}
            onChange={setMotion}
          />
        </Row>

        <Row title={t("settings.tips")} hint={t("settings.tipsHint")}>
          {tips && (
            <div className="space-y-2">
              <Choice<"on" | "off">
                value={tips.off ? "off" : "on"}
                options={[
                  ["on", t("settings.on")],
                  ["off", t("settings.off")],
                ]}
                onChange={(v) => updateTips({ ...tips, off: v === "off" })}
              />
              <button
                type="button"
                disabled={tips.seen.length === 0}
                onClick={() => {
                  updateTips({ seen: [], off: false });
                  setTipsReset(true);
                }}
                className="w-full rounded-lg border border-night-600 px-3 py-2 text-sm text-stone-300 hover:bg-night-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tipsReset ? t("settings.tipsResetDone") : t("settings.tipsReset")}
              </button>
            </div>
          )}
        </Row>
      </div>
    </main>
  );
}
