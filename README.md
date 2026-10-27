# SPARE CHANGE — A Street Life Simulator

A browser life-sim where you're rolled into a random life on the streets of one of 15 real cities.
Survive day by day, find your people, and maybe find a way out. Every life ends differently.

Thai is the primary language (toggle to English any time). No login and no external APIs for
gameplay — everything runs in the browser and autosaves to `localStorage`. An optional Redis
database adds play statistics and a verified leaderboard (see [Online features](#online-features)).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run validate` | Validates every JSON data file + cross-references (items, actions, traits, flags, i18n parity) |
| `npm run verify-replay -- 100` | Plays N lives through `step()` like the UI does, then checks the server-side replay reproduces each one — run it after changing the engine |
| `npm run simulate -- 300 balanced` | Plays N lives headlessly with the auto-pilot (`safe` / `balanced` / `risky`) and prints ending distribution — use it to check balance after changing data |

## Project layout

```
app/            page.tsx (title) · play/ (game) · end/ (life summary) · leaderboard/
                api/og/ (share card) · api/track · api/runs · api/leaderboard · api/stats
components/     StatBar, ChoiceCard, EventModal, PixelScene, CharacterSprite, Timeline,
                InventoryPanel, CityBadge, Flag, RevealScreen, SpotPicker, SkipPanel, DeltaChips,
                RunPanel
data/           cities, origins, actions, events, endings, traits, items (JSON)
lib/            engine.ts (pure game logic) · rng.ts (seeded mulberry32) · conditions.ts
                format.ts · data.ts (load + validate) · storage.ts · i18n.tsx · sound.ts · ui.ts
                score.ts · replay.ts · online.ts (client API calls) · redis.ts (server only)
i18n/           th.json · en.json (UI strings)
types/game.ts   all shared types
scripts/        validate-data.ts · simulate.ts · verify-replay.ts
```

**Engine rules:** `lib/engine.ts` is pure — `step(state, action) => newState`, no React, no
`Math.random`. The RNG state lives in `GameState.rngState`, so a life replays identically from its
seed ("Replay same seed" on the end screen). Malformed JSON entries are skipped with `console.warn`.

## Game data cheat sheet

Money in data files is always in **meal units** (`cash: 2` = the price of two cheap meals in the
current city), so one event works in every currency. Stats are 0–100.

### Conditions (used by actions, events, choices, endings)

`minDay maxDay minAge maxAge ageGroups cities notCities climates spots scenes weather phases months
festival festivals traits anyTraits notTraits flags anyFlags notFlags items notItems origins
min{} max{} counters{} maxCounters{} companion hasFamily sheltered shelter inSeason afterActions chance`

`min`/`max` keys: any stat plus `cash`, `stash`, `wealth` (cash + stash), in meal units.

### Effects

`health hunger thirst hygiene hope energy rep heat cash` take a number or `[min, max]`.
Also: `cashPct stashPct items{} flags[] unflags[] counters{} addTraits[] companion sheltered cause`.
`cause` (`cold|heat|illness|hunger|storm|injury`) decides the death ending if that damage is fatal.

Useful counters the engine/UI reads: `friends mealsGiven helped viral idProgress ngoVisits
charityVisits familyCalls laborDays busks taught nightsShelter`.

## How to add…

### …an event
Append to `data/events.json`:

```json
{
  "id": "street_poet",
  "icon": "📝",
  "weight": 2,
  "trigger": "any",
  "tags": ["kindness"],
  "cooldown": 30,
  "conditions": { "minDay": 5, "cities": ["paris"] },
  "title_th": "กวีข้างถนน", "title_en": "The Street Poet",
  "text_th": "…", "text_en": "…",
  "choices": [
    { "label_th": "ฟัง", "label_en": "Listen", "effects": { "hope": 8 },
      "text_th": "…", "text_en": "…" },
    { "label_th": "ขอเขียนด้วย", "label_en": "Write one too", "chance": 0.5,
      "success": { "text_th": "…", "text_en": "…", "effects": { "rep": 5, "flags": ["poet"] } },
      "fail":    { "text_th": "…", "text_en": "…" } }
  ]
}
```

- `trigger`: `day` (start of day), `action` (after an action — combine with `afterActions`), `any`, or `birthday`.
- `once: true` fires only once; `forced: true` fires automatically the first time conditions are met.
- `major: true` adds the choice to the life timeline and pauses the week/month auto-skip.
- Text may use `{name}`, `{city}`, `{dog}`, `{charity}`, `{spot}`.
- Flags you set can unlock later events/endings via `conditions.flags`.

Run `npm run validate`, then `npm run simulate` to see it fire.

### …an ending
Append to `data/endings.json` with `id`, `title_th/en`, `rarity` (`common…legendary`), `icon`,
`priority` (higher is checked first), `conditions`, `epitaph_th/en`, `line_th/en` (the share-card
quote). Death endings add `"death": ["cold", …]`. Mark secret ones `"hidden": true`.
Usually an event sets a flag and the ending requires it.

### …a city
Append to `data/cities.json`: names, flag emoji, `weight`, `currency`, `meal` (local price of a
cheap meal), `dailyIncome`, `milestoneCash`, seasons (`hotMonths / wetMonths / coldMonths / snow`),
`shelter`, `difficulty`, `charity_th/en`, 5 `spots` (each with `scene`, `income`, `risk`, `police`,
`tourists`, optional `minRep`), 2–3 `festivals` and 6 `names`. Then add an SVG flag case in
`components/Flag.tsx` (keyed by city id) — flag emoji don't render on Windows.

## Online features

All optional — without a database the game runs exactly as before and online panels say so.

- **Play stats** (`/api/track`, `/api/stats`): lives started/finished, unique players (an anonymous
  random id in `localStorage`, counted with HyperLogLog), players today, ending and city counts.
- **Leaderboard** (`/api/runs`, `/api/leaderboard`, page `/leaderboard`): all-time, this week
  (ISO week, UTC) and per starting city, top 50 shown, best 1000 kept.

**Anti-cheat:** the play page records every action that changed the state (`GameState.actions`).
When a life ends, the client sends only `seed` + `actions`; `/api/runs` replays them with the same
pure engine (`lib/replay.ts`) and computes the score itself (`lib/score.ts`). Identical runs are
deduplicated, and every endpoint is rate-limited per IP. If you change the engine in a way that
changes outcomes, bump `SAVE_VERSION` — old in-progress lives can no longer be verified.

**Score** = (days survived × 10 + escape bonus by ending rarity [0 for death endings] + friends × 20
+ times helped × 15 + meals shared × 5) × starting-city difficulty (easy 1 · normal 1.25 · hard 1.5 ·
brutal 2).

**Database:** [Upstash Redis](https://upstash.com) (free tier is plenty). Set either
`KV_REST_API_URL` + `KV_REST_API_TOKEN` (added automatically by Vercel’s Upstash integration) or
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. For local dev put them in `.env.local`.

Page views and visitors come from Vercel Web Analytics (`<Analytics />` in `app/layout.tsx`) —
enable it under the project’s **Analytics** tab.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repo. Framework is detected as Next.js.
3. Project → **Storage → Create Database → Upstash (Redis)**, connect it to the project. This adds
   the `KV_REST_API_*` env vars. Redeploy so they take effect.
4. Deploy. The share card (`/api/og`) runs on the Edge runtime and fetches the Kanit font from
   Google Fonts at render time; if that fetch fails it falls back to the default font.

Or from the CLI: `npx vercel` (preview) / `npx vercel --prod`.

## Notes

- City weights roughly reflect estimated street populations and are approximations for gameplay.
- Satori (used by `next/og`) can't stack Thai tone marks on upper vowels; `app/api/og/route.tsx`
  overlays them manually so share cards read correctly.
- Behind every number in this game is a real person. Consider supporting your local shelters.
