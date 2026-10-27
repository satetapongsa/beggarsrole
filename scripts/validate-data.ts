// Validates /data JSON: shape (via lib/data guards) plus cross-references
// (item ids, action ids, trait ids, city ids, festival ids, i18n keys).
// Run: npm run validate

import { DATA, dataWarnings } from "../lib/data";
import en from "../i18n/en.json";
import th from "../i18n/th.json";
import type { Conditions, Effects, GameEvent } from "../types/game";

const errors: string[] = [...dataWarnings];
const warn: string[] = [];

const itemIds = new Set(DATA.items.map((i) => i.id));
const actionIds = new Set(DATA.actions.map((a) => a.id));
const traitIds = new Set(DATA.traits.map((t) => t.id));
const cityIds = new Set(DATA.cities.map((c) => c.id));
const festivalIds = new Set(DATA.cities.flatMap((c) => c.festivals.map((f) => f.id)));
const originIds = new Set(DATA.origins.map((o) => o.id));

function checkCond(where: string, c?: Conditions) {
  if (!c) return;
  c.items?.forEach((i) => itemIds.has(i) || errors.push(`${where}: unknown item ${i}`));
  c.notItems?.forEach((i) => itemIds.has(i) || errors.push(`${where}: unknown item ${i}`));
  c.afterActions?.forEach((a) => actionIds.has(a) || errors.push(`${where}: unknown action ${a}`));
  [...(c.traits ?? []), ...(c.anyTraits ?? []), ...(c.notTraits ?? [])].forEach(
    (t) => traitIds.has(t) || errors.push(`${where}: unknown trait ${t}`),
  );
  [...(c.cities ?? []), ...(c.notCities ?? [])].forEach(
    (x) => cityIds.has(x) || errors.push(`${where}: unknown city ${x}`),
  );
  c.festivals?.forEach((f) => festivalIds.has(f) || errors.push(`${where}: unknown festival ${f}`));
  c.origins?.forEach((o) => originIds.has(o) || errors.push(`${where}: unknown origin ${o}`));
  c.spots?.forEach((sp) => {
    if (!DATA.cities.some((city) => city.spots.some((x) => x.id === sp)))
      errors.push(`${where}: unknown spot ${sp}`);
  });
}

function checkEff(where: string, e?: Effects) {
  if (!e) return;
  Object.keys(e.items ?? {}).forEach((i) => itemIds.has(i) || errors.push(`${where}: unknown item ${i}`));
  e.addTraits?.forEach((t) => traitIds.has(t) || errors.push(`${where}: unknown trait ${t}`));
}

const flagsSet = new Set<string>();
const flagsRead = new Set<string>();
const collect = (e?: Effects) => e?.flags?.forEach((f) => flagsSet.add(f));
const read = (c?: Conditions) =>
  [...(c?.flags ?? []), ...(c?.anyFlags ?? [])].forEach((f) => flagsRead.add(f));

DATA.origins.forEach((o) => o.flags?.forEach((f) => flagsSet.add(f)));
DATA.actions.forEach((a) => {
  checkCond(`action ${a.id}`, a.requires);
  checkCond(`action ${a.id}`, a.visible);
  checkEff(`action ${a.id}`, a.effects);
  collect(a.effects);
  read(a.requires);
  read(a.visible);
});
DATA.events.forEach((ev: GameEvent) => {
  checkCond(`event ${ev.id}`, ev.conditions);
  read(ev.conditions);
  ev.choices.forEach((c, i) => {
    const w = `event ${ev.id} choice ${i}`;
    checkCond(w, c.requires);
    read(c.requires);
    checkEff(w, c.effects);
    checkEff(w, c.success?.effects);
    checkEff(w, c.fail?.effects);
    collect(c.effects);
    collect(c.success?.effects);
    collect(c.fail?.effects);
  });
  if (ev.choices.every((c) => c.requires)) warn.push(`event ${ev.id}: every choice has requirements (could soft-lock)`);
});
DATA.endings.forEach((e) => {
  checkCond(`ending ${e.id}`, e.conditions);
  read(e.conditions);
});
// flags set by the engine itself
["has_id", "has_housing", "opened_stall", "sick", "injured"].forEach((f) => flagsSet.add(f));
flagsRead.forEach((f) => flagsSet.has(f) || errors.push(`flag "${f}" is required somewhere but never set`));

// i18n parity
const enKeys = Object.keys(en);
const thKeys = new Set(Object.keys(th));
enKeys.forEach((k) => thKeys.has(k) || errors.push(`i18n: th.json missing ${k}`));
Object.keys(th).forEach((k) => k in en || errors.push(`i18n: en.json missing ${k}`));

const byCat: Record<string, number> = {};
DATA.events.forEach((e) => e.tags.forEach((t) => (byCat[t] = (byCat[t] ?? 0) + 1)));

console.log(
  `cities ${DATA.cities.length} · origins ${DATA.origins.length} · actions ${DATA.actions.length} · events ${DATA.events.length} · endings ${DATA.endings.length} · traits ${DATA.traits.length} · items ${DATA.items.length}`,
);
console.log("event tags:", byCat);
warn.forEach((w) => console.log("warn:", w));
if (errors.length) {
  errors.forEach((e) => console.error("ERROR:", e));
  process.exit(1);
}
console.log("✓ data OK");
