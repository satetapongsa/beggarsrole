# SPARE CHANGE — A Street Life Simulator

SPARE CHANGE is a browser game about living on the street. Every new game rolls you into a random
life: a person with a name, an age, a backstory and a few personality traits, dropped into one of
15 real cities — Bangkok, Mumbai, Lagos, Tokyo, New York, Paris and others. You have no home and
almost no money. Your job is to get through each day, and, if you can, find a way out.

The game is played in Thai by default, with a full English translation one click away. It runs
entirely in the browser with no login; your life autosaves as you play.

## What playing looks like

- **A day has three parts** — morning, afternoon and night. In each one you choose a single
  action: beg at a busy spot, busk, collect recycling, take day labour, buy food or water, wash,
  rest, visit a clinic or an NGO, talk to people, look after a dog, call your family, save money,
  apply for an ID card, move to another city, rent a room or open a food stall.
- **Eight needs are always moving**: health, hunger, thirst, hygiene, hope, energy, street
  reputation and police attention ("heat"). Let one of the first few hit zero and the life can end.
- **The city matters.** Each city has its own currency and prices, its own seasons (monsoon,
  heat waves, snow), real neighbourhoods to work in with different income, risk and police
  presence, local festivals, and a difficulty from *easy* to *brutal*.
- **Things happen to you.** Over 180 events — a stranger buying you lunch, a police sweep, a
  flood, a stray dog that follows you home, a talent scout at your busking spot. Most of them ask
  you to choose, and some choices stay with you for the rest of the life.
- **Every life ends.** There are 29 endings: 16 that take you off the street one way or another (a job and a flat, going
  home to family, becoming a monk, a record deal, a lottery ticket — or prison and deportation) and 13 ways
  to die (cold, heat, illness, hunger, storms, violence, accidents, old age). Some endings are
  hidden until you find them.
- **Skip ahead** a week or a month with an auto-pilot (safe, balanced or risky) when you just want
  to see how the life goes; it stops for anything important.

When a life ends you get a summary: your timeline, the numbers of your life, a share card, and for
lives that made it out, a keepsake poster you can save as an image.

## Beyond a single life

- **Score and leaderboard.** Each finished life is scored. Getting off the street pays far more than
  surviving forever, escaping sooner pays a speed bonus, kindness to other people adds points, and
  harder starting cities multiply the total. Scores are verified on the server (see below).
- **Daily challenge.** Everyone gets the same life each day; only your first attempt counts.
- **Endings album.** Every ending you have reached, with a recovery code to move the collection to
  another device.
- **Achievements.** 27 goals that look at a single life (escape within 90 days, make 10 friends,
  escape a brutal city) or your whole career (finish 50 lives, live in every city, find every
  ending). Earning them unlocks extra poster themes. The achievements page also keeps career
  totals: lives played, escapes, total days, best score and cities seen.
- **Seeds.** Any life can be replayed exactly from its seed, or started from a seed you type in.
- **Install it like an app.** The site is a progressive web app: add it to your home screen on a
  phone, or install it from the browser on a computer. After the first visit it loads and plays
  offline; only the leaderboard and other online panels need a connection.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run validate` | Checks every JSON data file and its cross-references (items, actions, traits, flags, translation parity) |
| `npm run simulate -- 300 balanced` | Plays N lives with the auto-pilot (`safe` / `balanced` / `risky`) and prints how they ended — use after changing data |
| `npm run verify-replay -- 100` | Plays N lives through `step()` like the UI does, then checks the server replay reproduces each one — run after changing the engine |
| `npm run check-achievements -- 150` | Plays N lives into one career and reports how often each achievement is earned |

## How the code is organised

```
app/            page.tsx (title) · play/ (the game) · end/ (life summary) · endings/ (album)
                achievements/ · leaderboard/ · admin/
                api/: og (share card) · track · runs · leaderboard · stats · daily · profile · admin
components/     game UI: StatBar, ChoiceCard, EventModal, PixelScene, CharacterSprite, Timeline,
                InventoryPanel, SpotPicker, SkipPanel, RunPanel, SurvivorPoster, Flag, ...
data/           cities, origins, actions, events, endings, traits, items (JSON)
lib/            engine.ts (pure game logic) · rng.ts (seeded) · conditions.ts · data.ts (load + validate)
                score.ts · achievements.ts · replay.ts · storage.ts · online.ts · db.ts · i18n.tsx
i18n/           th.json · en.json (interface text)
types/game.ts   shared types
scripts/        validate-data · simulate · verify-replay · check-achievements · test-online
```

**The engine is pure.** `lib/engine.ts` exposes `step(state, action) => newState` with no React and
no `Math.random`. The random-number state lives inside `GameState`, so the same seed and the same
choices always produce the same life. That is what makes replays, the daily challenge and
server-side score verification possible. Malformed data entries are skipped with a console warning
instead of crashing the game.

## Adding content

Almost everything in the game is data. Money in data files is written in **meal units**
(`cash: 2` means the price of two cheap meals in whatever city you are in), so one event works in
every currency. Stats run from 0 to 100.

### Conditions

Used by actions, events, choices and endings to decide when they apply:

`minDay maxDay minAge maxAge ageGroups cities notCities climates spots scenes weather phases months
festival festivals traits anyTraits notTraits flags anyFlags notFlags items notItems origins
min{} max{} counters{} maxCounters{} companion hasFamily sheltered shelter inSeason afterActions chance`

`min` / `max` take any stat plus `cash`, `stash` and `wealth` (cash + stash), in meal units.

### Effects

`health hunger thirst hygiene hope energy rep heat cash` take a number or a `[min, max]` range.
Also: `cashPct stashPct items{} flags[] unflags[] counters{} addTraits[] companion sheltered cause`.
`cause` (`cold | heat | illness | hunger | storm | injury`) decides which death ending you get if
that damage is fatal.

Counters the engine and UI read: `friends mealsGiven helped viral idProgress ngoVisits
charityVisits familyCalls laborDays busks taught nightsShelter gambleWins`.

### An event

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

- `trigger`: `day` (start of a day), `action` (after an action — combine with `afterActions`),
  `any`, or `birthday`.
- `once: true` fires only once per life; `forced: true` fires automatically the first time its
  conditions are met.
- `major: true` puts the choice on the life timeline and pauses the auto-pilot.
- Text may use `{name}`, `{city}`, `{dog}`, `{charity}` and `{spot}`.
- Flags you set can unlock later events and endings through `conditions.flags`.

Then run `npm run validate` and `npm run simulate` to see it fire.

### An ending

Append to `data/endings.json` with `id`, `title_th/en`, `rarity` (`common` to `legendary`), `icon`,
`priority` (higher is checked first), `conditions`, `epitaph_th/en` and `line_th/en` (the quote on
the share card). Death endings add `"death": ["cold", ...]`. Secret ones get `"hidden": true`.
Usually an event sets a flag and the ending requires it.

### A city

Append to `data/cities.json`: names, flag, `weight`, `currency`, `meal` (local price of a cheap
meal), `dailyIncome`, `milestoneCash`, seasons (`hotMonths / wetMonths / coldMonths / snow`),
`shelter`, `difficulty`, `charity_th/en`, five `spots` (each with `scene`, `income`, `risk`,
`police`, `tourists`, optional `minRep`), two or three `festivals` and six `names`. Then add an SVG
flag for it in `components/Flag.tsx`, because flag emoji do not render on Windows.

### An achievement

Add an entry to `ACHIEVEMENTS` in `lib/achievements.ts` with a `test` that receives the finished
life, the career totals and the set of endings found. Add a `progress` function for long-term goals
so the achievements page can show a progress bar, then run `npm run check-achievements` to make sure
it is reachable and not trivially easy.

## Online features

Everything online is optional. Without a database the game plays exactly the same, and the online
panels say they are unavailable.

- **Play statistics** (`/api/track`, `/api/stats`): lives started and finished, unique players
  (an anonymous random id kept in the browser), players today, ending and city counts.
- **Leaderboard** (`/api/runs`, `/api/leaderboard`, page `/leaderboard`): all-time, this week,
  daily challenge and per starting city, top 50 each. Nicknames go through a Thai and English
  word filter (`lib/moderation.ts`).
- **Daily challenge** (`/api/daily`): one seed per day on Bangkok time, derived from
  `DAILY_SECRET`; only a player's first daily run each day counts.
- **Profiles** (`/api/profile`): the endings collection is synced to the server, and a recovery
  code moves it to another device.
- **Admin** (`/api/admin`, page `/admin`): a 30-day player chart, how long lives last, and
  hiding or restoring leaderboard names. Needs `ADMIN_TOKEN` (12+ characters).

**Anti-cheat.** The play page records every action that changed the state. When a life ends the
client sends only the seed and that action list; `/api/runs` replays it with the same pure engine
(`lib/replay.ts`) and computes the score itself (`lib/score.ts`). Identical runs are de-duplicated
and every endpoint is rate-limited per IP. If you change the engine in a way that changes outcomes,
bump `SAVE_VERSION` — lives already in progress can then no longer be verified.

**Score** (`lib/score.ts`) = (survival `1200 · ln(1 + days/60)` + escape bonus by ending rarity
[2000–9000, none for death endings] + speed bonus `3000 · (1 − days/730)` for escapes + kindness
[friends × 20 + helped × 15 + meals shared × 5, at most 1500]) × starting-city difficulty (easy 1,
normal 1.25, hard 1.5, brutal 2). The log curve makes escaping beat farming days; check with
`npm run simulate -- 300 safe x farm`.

**Database.** Postgres on [Neon](https://neon.tech) through `@neondatabase/serverless` (the free
tier is plenty). Tables are created automatically on first use (`lib/db.ts`).

| Variable | |
| --- | --- |
| `DATABASE_URL` | Neon connection string (required for online features) |
| `ADMIN_TOKEN` | password for `/admin` |
| `DAILY_SECRET` | any random string — keeps future daily seeds secret |

For local development put them in `.env.local` (gitignored). `npm run test:online` runs an
end-to-end check against the dev server and the database and deletes its test data afterwards.

Page views come from Vercel Web Analytics (`<Analytics />` in `app/layout.tsx`); enable it in the
project's Analytics tab.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel choose Add New, Project, and import the repository. Next.js is detected automatically.
3. Under Settings, Environment Variables, add `DATABASE_URL`, `ADMIN_TOKEN` and `DAILY_SECRET`,
   then redeploy so they take effect.
4. The share card (`/api/og`) runs on the Edge runtime and loads the Kanit font from Google Fonts
   when it renders; if that fails it falls back to the default font.

From the command line: `npx vercel` for a preview, `npx vercel --prod` for production.

## Notes

- City weights roughly follow estimated street populations and are approximations for gameplay.
- Satori (used by `next/og`) cannot stack Thai tone marks above upper vowels, so
  `app/api/og/route.tsx` positions them by hand to keep share cards readable.
- Behind every number in this game is a real person. If you can, support your local shelters and
  street outreach.
