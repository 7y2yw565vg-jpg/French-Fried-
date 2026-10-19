# Unicorn (working title)

An incremental startup game where every decision closes a door. Design: [GAME_DESIGN.md](GAME_DESIGN.md).

This folder holds the **M1 prototype**: one category (SaaS) from the Garage to Series A, about 30–45 minutes of play.

## Run it

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (`ELECTRON_SKIP_BINARY_DOWNLOAD=1` if you only want the web build) |
| `npm run dev` | Build with source maps and serve on http://localhost:8096 |
| `npm run build` | Release bundle in `dist/` (open `dist/index.html` through any static server) |
| `npm run electron` | Run the desktop build |
| `npm test` | Unit tests plus pacing tests (a bot plays eight fork paths to Series A, about 6 s) |
| `npm run sim [-- minutes]` | Print the bot's timeline for 13 fork paths |
| `SIM=debug.sim.ts npm run sim -- pricing=ads funding=bootstrap` | Minute-by-minute breakdown of one path |
| `npm run typecheck` | `tsc --noEmit` |

**Controls:** `B` brainstorm, `Space` code, `P` pitch, `H` hustle, `S` ship a feature, `1`–`3` hire in Engineering /
Marketing / Sales (`Shift` for ×10), `Tab` to cycle screens, `Esc` to close dialogs.

## What's in the prototype

- **The incremental engine** (`src/core/engine.ts`): Engineering, Marketing and Sales, with costs that grow per hire
  and output that doubles at 10/25/50/100… staff. Ideas + code ship **features**, which raise Quality and Hype and bring
  users. Word of mouth, outreach and three saturating paid channels bring users; churn, conversion and the pricing
  model turn them into revenue; wages, rent and channel upkeep make up the burn. Valuation = users × $50 + ARR × the
  model's multiple.
- **7 permanent forks:** category (SaaS only for now; the other five are shown as coming later), cofounder, build
  philosophy, pricing model (6 models), first funding (VC / Bootstrap / Crowdfund), and two SaaS forks (Self-serve vs
  Sales-led, Vertical vs Horizontal). Most options open their own upgrade line; the others show as **closed** in the
  Upgrades screen, and the Board Room shows the decision tree and which endings each choice has closed.
- **49 upgrades**, **6 missions** staffed by named key people with stats and traits, **24 event cards** (with
  timers), **5 factions**, hidden **Skeletons**, a revenue-based loan for bootstrappers, the crowdfunding promise,
  and tech debt with refactor sprints.
- Contract work in the garage, payroll (miss it for 90 seconds and the company shuts down), and a "next goal" hint.
- **Saves:** autosave every 30 s to `localStorage` (and to a file in the desktop build), export/import strings,
  **offline progress** up to 8 hours. Decisions wait for you while you're away, and a company that would run out of
  cash hibernates instead.

## Differences from the design doc so far

- Forks arrive earlier than the doc's §12 table, so the first 15 minutes have choices: build philosophy after the
  first feature, pricing at 150 users (both in the Garage).
- Funding is the Garage → Seed gate. Series A is the end of the prototype (you can keep playing in sandbox mode).
- Departments are Engineering, Marketing and Sales only; Design, Support, Ops and Legal come with M2.
- No rivals, map, synergies or Founder Reputation yet.

## Pacing (bot, 3 clicks/s, answers every card)

Seed lands at 13–17 minutes and Series A at 28–46 minutes depending on the path. VC is fastest; Bootstrap is slowest
but keeps all the equity. `tests/pacing.test.ts` fails if any tested path leaves the Seed window (10–25 min) or the
Series A window (20–50 min).

## Layout

| Path | What |
| --- | --- |
| `src/core/` | state, engine (rates, tick, actions, offline), saves, formatting, RNG |
| `src/content/` | forks, upgrades, missions, staff and traits, event cards, endings |
| `src/ui/` | DOM screens (HQ, Team, Growth, Missions, Upgrades, Board Room), modals, inbox |
| `tests/` | unit tests, the bot, pacing tests and simulations |
| `electron/` | desktop shell (saves to disk, Steam achievements hook) |
