"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChoiceCard from "@/components/ChoiceCard";
import CityBadge from "@/components/CityBadge";
import CharacterSprite from "@/components/CharacterSprite";
import DeltaChips from "@/components/DeltaChips";
import GuideTip from "@/components/GuideTip";
import FeedbackModal from "@/components/FeedbackModal";
import HelpModal from "@/components/HelpModal";
import EventModal from "@/components/EventModal";
import InventoryPanel from "@/components/InventoryPanel";
import PixelScene from "@/components/PixelScene";
import RevealScreen from "@/components/RevealScreen";
import SpotPicker from "@/components/SpotPicker";
import StatBar from "@/components/StatBar";
import Timeline from "@/components/Timeline";
import TracesPanel from "@/components/TracesPanel";
import { SkipButtons, SummaryModal } from "@/components/SkipPanel";
import { DATA } from "@/lib/data";
import { activeFestivals, ageGroupOf, cityOf } from "@/lib/conditions";
import { dailyNumber } from "@/lib/daily";
import { actionViews, spotViews, step } from "@/lib/engine";
import { fill, formatMoney } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { clearGame, loadGame, loadNickname, saveGame, saveLastLife } from "@/lib/storage";
import { hasDeltas, isHelpKey, keyDigit, lockText, WEATHER_ICON } from "@/lib/ui";
import type { ActionCategory, GameAction, GameState } from "@/types/game";
import { STAT_KEYS } from "@/types/game";

type Act = GameAction | { type: "load"; state: GameState };

function reducer(s: GameState | null, a: Act): GameState | null {
  if (a.type === "load") return a.state;
  if (!s) return s;
  const next = step(s, a);
  // record only actions that did something, so the server can replay this life exactly
  return next === s ? s : { ...next, actions: [...(s.actions ?? []), a] };
}

const CATS: ActionCategory[] = ["earn", "survive", "people", "future"];
const CAT_ICON: Record<ActionCategory, string> = { earn: "🪙", survive: "🍲", people: "🤝", future: "🔑" };
const CAT_KEY: Record<string, ActionCategory> = { KeyQ: "earn", KeyW: "survive", KeyE: "people", KeyR: "future" };

export default function PlayPage() {
  const router = useRouter();
  const { lang, setLang, t, has, sound, setSound, sfx } = useSettings();
  const [state, dispatch] = useReducer(reducer, null);
  const [cat, setCat] = useState<ActionCategory>("earn");
  const [picking, setPicking] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [sideTab, setSideTab] = useState<"log" | "timeline">("log");
  const [help, setHelp] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const prevLog = useRef<number>(0);
  const onKeyRef = useRef<(e: KeyboardEvent) => void>();

  // keyboard shortcuts; the handler is rebuilt every render so it always sees the current state
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onKeyRef.current?.(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // load save
  useEffect(() => {
    const s = loadGame();
    // no life, or no player name yet (every life is played under a name): back to the title screen
    if (!s || !loadNickname()) router.replace("/");
    else dispatch({ type: "load", state: s });
  }, [router]);

  // autosave
  useEffect(() => {
    if (!state) return;
    if (state.ended) {
      saveLastLife(state);
      if (!state.eventResult) clearGame();
      else saveGame(state);
    } else saveGame(state);
  }, [state]);

  // milestone toasts
  useEffect(() => {
    if (!state || state.newMilestones.length === 0) return;
    const city = cityOf(state);
    const items = state.newMilestones.map((m, i) => ({
      id: Date.now() + i,
      text: `🏁 ${t(`milestone.${m}`, { amount: formatMoney(city.milestoneCash, city) })}`,
    }));
    setToasts((x) => [...x, ...items]);
    sfx("milestone");
    const timer = window.setTimeout(() => setToasts((x) => x.filter((tt) => !items.some((i) => i.id === tt.id))), 3300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.newMilestones]);

  // sound for new log lines + events
  useEffect(() => {
    if (!state) return;
    const top = state.log[0];
    const key = state.log.length + (top ? top.day * 10 + top.th.length : 0);
    if (prevLog.current && key !== prevLog.current && top) {
      sfx(top.tone === "bad" ? "bad" : top.deltas && top.deltas.cash > 0 ? "coin" : "click");
    }
    prevLog.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.log]);

  useEffect(() => {
    if (state?.pendingEvent) sfx("event");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.pendingEvent]);

  useEffect(() => {
    if (state?.ended && !state.eventResult) sfx("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ended, state?.eventResult]);

  const views = useMemo(() => (state ? actionViews(state) : []), [state]);

  if (!state) {
    return <div className="flex min-h-dvh items-center justify-center text-stone-500">…</div>;
  }

  const city = cityOf(state);
  const festivals = activeFestivals(state);
  const spot = city.spots.find((sp) => sp.id === state.lastSpot) ?? city.spots[0];
  const name = lang === "th" ? state.character.name_th : state.character.name_en;
  const busy = !!state.pendingEvent || !!state.eventResult || !!state.summary || !!state.ended;
  const sick = state.flags.includes("sick");
  const catViews = views.filter((v) => v.def.category === cat);
  const ended = !!state.ended && !state.eventResult;

  const act = (actionId: string, pickSpot?: boolean) => {
    if (busy) return;
    if (pickSpot) {
      setPicking(actionId);
      return;
    }
    dispatch({ type: "act", actionId });
  };

  const statusBadges = [
    sick && { k: "sick", text: `🤒 ${t("hud.sick")}`, c: "bg-rose-950 text-rose-200" },
    state.flags.includes("injured") && { k: "inj", text: `🩹 ${t("hud.injured")}`, c: "bg-rose-950 text-rose-200" },
    state.sheltered && { k: "bed", text: `🛏️ ${t("hud.sheltered")}`, c: "bg-sky-950 text-sky-200" },
    state.flags.includes("has_id") && { k: "id", text: `🪪 ${t("hud.id")}`, c: "bg-emerald-950 text-emerald-200" },
    state.flags.includes("has_job") && { k: "job", text: `👷 ${t("hud.job")}`, c: "bg-emerald-950 text-emerald-200" },
    state.flags.includes("has_housing") && { k: "home", text: `🏠 ${t("hud.housing")}`, c: "bg-emerald-950 text-emerald-200" },
  ].filter(Boolean) as { k: string; text: string; c: string }[];

  const fillT = (s: string) => fill(s, state, lang);

  onKeyRef.current = (e) => {
    if (help || feedback || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const n = keyDigit(e);
    if (picking) {
      if (e.key === "Escape") setPicking(null);
      const sv = n ? spotViews(state)[n - 1] : undefined;
      if (sv && !sv.lock) {
        dispatch({ type: "act", actionId: picking, spotId: sv.spot.id });
        setPicking(null);
      }
      return;
    }
    if (busy || !state.revealed) return;
    if (isHelpKey(e)) {
      e.preventDefault();
      setHelp(true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const i = CATS.indexOf(cat) + (e.key === "ArrowLeft" ? -1 : 1);
      setCat(CATS[(i + CATS.length) % CATS.length]);
    } else if (CAT_KEY[e.code]) {
      setCat(CAT_KEY[e.code]);
    } else if (n) {
      const v = catViews[n - 1];
      if (v && !v.lock) act(v.def.id, v.def.pickSpot);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-3 pb-24 pt-2 sm:px-4">
      {state.revealed ? null : <RevealScreen state={state} onBegin={() => dispatch({ type: "revealDone" })} />}

      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-30 -mx-3 mb-3 border-b border-night-700 bg-night-950/90 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CityBadge city={city} />
          {state.daily && (
            <span className="rounded-full bg-sky-900/60 px-2 py-0.5 text-xs text-sky-200">📅 {t("daily.badge", { n: dailyNumber(state.daily) })}</span>
          )}
          <span className="text-sm text-stone-300">
            {t("hud.day", { day: state.day })} · <span className="text-lamp-300">{t(`phase.${state.phase}`)}</span> ·{" "}
            {WEATHER_ICON[state.weather]} {t(`weather.${state.weather}`)}
          </span>
          {festivals.map((f) => (
            <span key={f.id} className="rounded bg-fuchsia-950 px-1.5 py-0.5 text-[11px] text-fuchsia-200">
              🎉 {lang === "th" ? f.name_th : f.name_en}
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="font-medium tabular-nums text-sm text-emerald-300" title={t("hud.cash")}>
              💰 {formatMoney(state.cash, city)}
            </span>
            {state.stash > 0 && (
              <span className="font-medium tabular-nums text-xs text-stone-400" title={t("hud.stash")}>
                🫙 {formatMoney(state.stash, city)}
              </span>
            )}
            <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2 py-0.5 text-xs hover:bg-night-800">
              {t("lang.toggle")}
            </button>
            <button type="button" onClick={() => setHelp(true)} className="rounded border border-night-600 px-2 py-0.5 text-xs hover:bg-night-800" aria-label={t("help.open")} title={t("help.open")}>
              ?
            </button>
            <button type="button" onClick={() => setFeedback(true)} className="rounded border border-night-600 px-2 py-0.5 text-xs hover:bg-night-800" aria-label={t("feedback.open")} title={t("feedback.open")}>
              💬
            </button>
            <button type="button" onClick={() => setSound(!sound)} className="rounded border border-night-600 px-2 py-0.5 text-xs hover:bg-night-800" aria-label={sound ? t("sound.on") : t("sound.off")}>
              {sound ? "🔊" : "🔇"}
            </button>
            <button type="button" onClick={() => router.push("/")} className="rounded border border-night-600 px-2 py-0.5 text-xs hover:bg-night-800" aria-label="Menu">
              ☰
            </button>
          </div>
        </div>
        {/* compact stats (mobile) */}
        <div className="mt-2 grid grid-cols-4 gap-x-2 gap-y-1 lg:hidden">
          {STAT_KEYS.map((k) => (
            <StatBar key={k} stat={k} value={state.stats[k]} label={t(`stat.${k}`)} compact />
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* ---------- left panel (desktop) / details (mobile) ---------- */}
        <aside className={`${showDetails ? "block" : "hidden"} order-2 space-y-4 lg:order-1 lg:block`}>
          <div className="rounded-xl border border-night-700 bg-night-900 p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterSprite appearance={state.character.appearance} hygiene={state.stats.hygiene} sick={sick} size={44} dog={!!state.companion} />
              <div>
                <div className="text-lg font-semibold">{name}</div>
                <div className="text-xs text-stone-400">
                  {t("hud.age", { age: state.age })} · {lang === "th" ? city.name_th : city.name_en}
                </div>
              </div>
            </div>
            <div className="hidden space-y-1.5 lg:block">
              {STAT_KEYS.map((k) => (
                <StatBar key={k} stat={k} value={state.stats[k]} label={t(`stat.${k}`)} />
              ))}
            </div>
            {statusBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {statusBadges.map((b) => (
                  <span key={b.k} className={`rounded px-1.5 py-0.5 text-[11px] ${b.c}`}>
                    {b.text}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-night-700 bg-night-900 p-4">
            <InventoryPanel items={state.items} traits={state.character.traits} hiddenTraits={state.character.hiddenTraits} companion={state.companion} />
          </div>
          <div className="rounded-xl border border-night-700 bg-night-900 p-4">
            <div className="mb-2 flex gap-2 text-xs">
              {(["log", "timeline"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSideTab(tab)}
                  className={`rounded px-2 py-1 ${sideTab === tab ? "bg-night-700 text-lamp-300" : "text-stone-400 hover:text-stone-200"}`}
                >
                  {tab === "log" ? t("panel.log") : t("panel.timeline")}
                </button>
              ))}
            </div>
            <div className="scrollbar-thin max-h-72 overflow-y-auto pr-1">
              {sideTab === "log" ? (
                <ul className="space-y-2">
                  {state.log.slice(0, 20).map((l, i) => (
                    <li key={`${l.day}-${i}`} className="text-xs">
                      <div className="text-[10px] text-stone-500">
                        {t("hud.day", { day: l.day })} · {t(`phase.${l.phase}`)}
                      </div>
                      <div className={l.tone === "bad" ? "text-rose-200" : l.tone === "good" ? "text-emerald-100" : "text-stone-300"}>
                        {lang === "th" ? l.th : l.en}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Timeline entries={[...state.timeline].reverse()} fill={fillT} />
              )}
            </div>
          </div>
        </aside>

        {/* ---------- right: scene + cards ---------- */}
        <section className="order-1 space-y-3 lg:order-2">
          <PixelScene
            scene={spot.scene}
            phase={state.phase}
            weather={state.weather}
            appearance={state.character.appearance}
            hygiene={state.stats.hygiene}
            sick={sick}
            dog={!!state.companion}
            ageGroup={ageGroupOf(state.age)}
            festival={festivals.length > 0}
            label={lang === "th" ? spot.name_th : spot.name_en}
          />

          {/* on narrow screens the place name takes its own line so nothing wraps mid-word */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
            <span className="min-w-0 basis-full truncate sm:flex-1 sm:basis-auto">📍 {lang === "th" ? spot.name_th : spot.name_en}</span>
            <div className="flex items-center gap-1 whitespace-nowrap" aria-label="phase">
              {(["morning", "afternoon", "night"] as const).map((p) => (
                <span
                  key={p}
                  className={`rounded px-2 py-0.5 transition-colors ${state.phase === p ? "bg-lamp-500 text-black" : "bg-night-800 text-stone-500"}`}
                >
                  {p === "morning" ? "🌅" : p === "afternoon" ? "☀️" : "🌙"} {t(`phase.${p}`)}
                </span>
              ))}
            </div>
            <button type="button" className="ml-auto whitespace-nowrap rounded border border-night-600 px-2 py-0.5 lg:hidden" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? t("hud.hide") : t("hud.details")}
            </button>
          </div>

          {/* latest result */}
          {state.log[0] && (
            <div key={state.log.length + state.log[0].th} className="animate-fadeIn rounded-lg border border-night-700 bg-night-900/80 p-3">
              <p className={`text-sm ${state.log[0].tone === "bad" ? "text-rose-200" : "text-stone-200"}`}>{lang === "th" ? state.log[0].th : state.log[0].en}</p>
              {hasDeltas(state.log[0].deltas) && (
                <div className="mt-1.5">
                  <DeltaChips deltas={state.log[0].deltas!} city={city} small />
                </div>
              )}
            </div>
          )}

          <TracesPanel state={state} spotId={spot.id} />

          {!busy && <GuideTip state={state} onCat={setCat} />}

          {/* category tabs */}
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-night-900 p-1">
            {CATS.map((c) => {
              const available = views.filter((v) => v.def.category === c && !v.lock).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`rounded-md px-1 py-1.5 text-xs sm:text-sm ${cat === c ? "bg-night-700 text-lamp-300" : "text-stone-400 hover:text-stone-200"}`}
                >
                  {CAT_ICON[c]} {t(`cat.${c}`)}
                  <span className="ml-1 font-medium tabular-nums text-[10px] text-stone-500">{available}</span>
                </button>
              );
            })}
          </div>

          <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {catViews.map(({ def, lock, energy }, i) => (
              <ChoiceCard
                key={def.id}
                icon={def.icon}
                title={fillT(lang === "th" ? def.name_th : def.name_en)}
                desc={fillT(lang === "th" ? def.desc_th : def.desc_en)}
                energyLabel={energy > 0 ? t("card.energy", { n: energy }) : t("card.free")}
                costLabel={def.cost ? formatMoney((def.kind === "clinic" && state.items.medicine ? 0 : def.cost) * city.meal, city) : undefined}
                lockReason={lock ? lockText(lock, t, has, lang) : null}
                hotkey={i < 9 ? i + 1 : undefined}
                onClick={() => act(def.id, def.pickSpot)}
              />
            ))}
          </div>

          <SkipButtons state={state} onSkip={(days, strategy) => dispatch({ type: "skip", days, strategy })} />
        </section>
      </div>

      {/* ---------- overlays ---------- */}
      {picking && (
        <SpotPicker
          state={state}
          title={fillT(lang === "th" ? (views.find((v) => v.def.id === picking)?.def.name_th ?? "") : (views.find((v) => v.def.id === picking)?.def.name_en ?? ""))}
          onCancel={() => setPicking(null)}
          onPick={(spotId) => {
            dispatch({ type: "act", actionId: picking, spotId });
            setPicking(null);
          }}
        />
      )}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      {feedback && <FeedbackModal life={state} onClose={() => setFeedback(false)} />}
      {state.summary && <SummaryModal state={state} onClose={() => dispatch({ type: "clearSummary" })} />}
      {!state.summary && state.revealed && (state.pendingEvent || state.eventResult) && (
        <EventModal state={state} onChoose={(i) => dispatch({ type: "choose", choiceIndex: i })} onDismiss={() => dispatch({ type: "dismiss" })} />
      )}

      {ended && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/80 p-6 text-center">
          <div>
            <div className="mb-2 text-5xl">{DATA.ending[state.ended!.endingId]?.death ? "🕯️" : DATA.ending[state.ended!.endingId]?.icon ?? "✨"}</div>
            <h2 className="mb-6 text-2xl font-semibold text-lamp-300">
              {DATA.ending[state.ended!.endingId]?.death ? t("ended.title") : t("ended.titleGood")}
            </h2>
            <button type="button" onClick={() => router.push("/end")} autoFocus className="rounded-lg bg-lamp-500 px-6 py-3 font-semibold text-black hover:bg-lamp-400">
              {t("ended.see")}
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed left-1/2 top-16 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((tt) => (
          <div key={tt.id} className="animate-toast rounded-full border border-emerald-700 bg-emerald-950/95 px-4 py-2 text-sm text-emerald-100 shadow-lg">
            {tt.text}
          </div>
        ))}
      </div>
    </main>
  );
}
