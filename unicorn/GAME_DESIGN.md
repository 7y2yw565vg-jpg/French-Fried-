# UNICORN (working title) — Game Design Document (v0.1)

> **A playable prototype exists (M1: SaaS, Garage → Series A).** See [README.md](README.md) for what's implemented and where it differs from this document.

> *Working title. Alternates: "Burn Rate", "Pivot", "Series Z", "Serial Founder".*

**Platform:** Steam (Windows, Mac, Linux; Steam Deck Verified target)
**Genre:** Incremental / idle business sim with branching, permanent decisions
**Price target:** $6.99 (no microtransactions). Free demo covering the Garage and Seed phases.
**Run length:** 2–3 hours per startup; 20+ hours to see every ending, category and synergy
**Tone:** Satire of startup culture. Funny, a little cynical, never mean to the player.
**Player fantasy:** *"I started a company in my garage, and every call I made shaped what it became."*

**References**
- *Kingdom Inc.* (Leaping Turtle): minimalist automation pipeline, stations, teams sent on missions.
- *Plutocracy* (Redwood): buildings on a city map, workers, a stock market, rivals, lobbying.
- *AdVenture Capitalist* / *Cookie Clicker*: generator scaling, milestones, prestige.
- *Reigns* / *Universal Paperclips*: choices that close doors, a story that comes out of systems.

---

## 1. Design Pillars

1. **Every choice closes a door.** Forks are permanent for the run. The game shows the doors you closed, greyed out, with the reason. Replays are driven by "what if I'd gone the other way?"
2. **Numbers go up, and the decisions decide how.** The incremental engine never stops. Decisions change its multipliers, unlock and lock upgrade lines, and reshape the pipeline.
3. **Your startup is a machine you tune.** Departments are stations in a pipeline. Bottlenecks are the puzzle. Automation is the reward.
4. **The world pushes back.** Rivals, factions and the board react to what you do and remember it.
5. **Failure is a run, not a loss.** Every startup ends in something, even bankruptcy. Every ending makes the next founder stronger.

---

## 2. Core Loops

| Loop | Length | What happens |
|---|---|---|
| **Moment** | seconds | Click to code / pitch / ship, hire a person, buy a channel, answer an event card |
| **Sprint** | 3–5 min | Bottleneck appears → fix it (hire, upgrade, automate) → a mission returns → a decision card arrives |
| **Phase** | 15–40 min | Reach the valuation gate → funding round / phase fork → new systems unlock |
| **Run** | 2–3 h | One startup from garage to ending. Payout turns into Founder Reputation. |
| **Career** | 20+ h | Spend Reputation on perks, fill the Founder's Journal, unlock categories, run the Venture Fund |

---

## 3. Resources

| Resource | Source | Spent on / used for | Notes |
|---|---|---|---|
| **Cash ($)** | Revenue, funding, debt, missions | Hiring, upgrades, channels, rent, missions | Running out = Shut Down (unless rescued) |
| **Burn rate ($/s)** | Wages + rent + channel spend + compute etc. | — | Shown next to revenue; **Runway** = Cash ÷ (burn − revenue) |
| **Users** | Marketing channels, word of mouth | Turned into revenue; drive valuation | Lost to churn every tick |
| **Dev Points (DP)** | Engineering (and Design for Quality) | Building features, refactoring tech debt | Spent on the Roadmap |
| **Quality (0–100)** | Design, features, Polish | Multiplies acquisition, lowers churn | Drops when tech debt is high |
| **Hype (0–∞)** | Launches, stunts, press, viral events | Multiplies user acquisition | Decays 5% per minute |
| **Tech Debt (0–100)** | Ship Fast, rushed features, outages | — | Raises churn and slows DP |
| **Equity (%)** | Starts at 100% (you + cofounder) | Sold in rounds, granted to staff | Sets your payout share |
| **Valuation ($)** | Calculated (see §4.6) | Phase gates, payout, score | The headline number |
| **Faction standing** | Decisions and events | Opens or blocks opportunities | 5 factions, 0–100 (see §9) |
| **Skeletons (hidden)** | Shady choices | — | Triggers scandals (see §9.3) |
| **Category resource** | Category-specific | Category-specific | One per category (see §6) |

---

## 4. The Incremental Engine

### 4.1 Departments (generators)

You buy **staff** in each department. Each hire costs more than the last.

```
cost(n) = base × growth^n        (n = staff already owned)
```

| Department | Unlock | Base cost | Growth | Output per staff | Role in pipeline |
|---|---|---|---|---|---|
| **Engineering** | Start | $10 | 1.12 | 1 DP/s | Builds the product |
| **Design** | Seed | $25 | 1.13 | +0.05 Quality/s, raises cap | Quality and retention |
| **Marketing** | Start (you) / Seed (staff) | $15 | 1.12 | Runs channels (+1 channel slot / 5 staff) | User acquisition |
| **Sales** | Seed | $40 | 1.14 | Converts users / closes deals | Revenue |
| **Support** | Series A | $30 | 1.12 | −0.2% churn per staff (diminishing) | Retention |
| **Ops** | Series A | $100 | 1.15 | Raises station caps, cuts burn | Scale and efficiency |
| **Legal** | Growth | $500 | 1.15 | Lawsuit defense, lowers Skeletons gain | Rivals and politics |
| **Category station** | Varies | Varies | Varies | See §6 | Category twist |

Wages: each staff member adds **2% of their hire cost per minute** to burn (so big teams are a real cost).

**Buy modes:** ×1, ×10, ×100, Max (Shift / Ctrl modifiers, as in Every Possible Book).

### 4.2 Headcount milestones

Every department doubles its output at **10, 25, 50, 100, 250, 500 and 1,000 staff**. At 25, 100 and 500 a department also gets a named upgrade card (e.g. Engineering 100: *"Monorepo"* — DP ×1.5, tech debt gain −25%).

### 4.3 Upgrade tiers

Each department has 4 office tiers, bought with cash, that multiply output and raise station caps:

| Tier | Name | Cost (×dept base) | Output | Cap |
|---|---|---|---|---|
| 1 | Garage | — | ×1 | 10 staff |
| 2 | Office | ×500 | ×2 | 50 |
| 3 | Campus | ×50,000 | ×4 | 250 |
| 4 | Global HQ | ×5,000,000 | ×8 | ∞ |

On top of tiers, **fork-specific upgrade lines** appear (see §7). Every permanent fork unlocks 4–8 upgrades and locks the other options' lines, so each run's upgrade shop is different.

### 4.4 Managers and automation

- A **manager** per department (bought once, ~×1,000 base) auto-hires up to a budget % you set and buys upgrades when affordable.
- **Mission autopilot** (Series A perk): repeat a mission with the same team until cancelled.
- **Decision delegation** (late game): a COO can auto-answer *small* event cards using a policy you set (e.g. "always side with employees"). Permanent forks are **never** delegated.

### 4.5 Growth formulas

```
acquisition/s = Σ channel_output × (1 + Hype/100) × (Quality/50) × synergy_mults
churn/s       = Users × base_churn × (1 + TechDebt/50) × price_pressure ÷ (1 + Support_power)
Users        += (acquisition − churn) × dt

paying_users  = Users × conversion(model, price, brand)
revenue/s     = paying_users × price × model_mult + deal_revenue (Sales/Enterprise)
```

- **base_churn** = 0.5% of users per minute (categories modify).
- **conversion(price)** = base_conv × (ref_price ÷ price)^elasticity (see §8.2).
- **Channel saturation:** `channel_output = raw ÷ (1 + raw ÷ cap)`, where `cap` grows with market size (cities, product lines). Spamming one channel gives diminishing returns.

### 4.6 Valuation

```
Valuation = (annual_revenue × revenue_multiple + Users × user_value) × growth_factor × hype_factor
growth_factor = clamp(1 + growth_rate_last_10min, 0.5, 3)
hype_factor   = 1 + Hype/500
```

`revenue_multiple` and `user_value` depend on category (§6). After the IPO, valuation is replaced by **market cap** from the stock sim (§8.5).

### 4.7 Scale of numbers in a run

| Phase | Valuation gate | Typical cash/s | Typical staff |
|---|---|---|---|
| Garage | — | $0–5 | 2 founders |
| Seed | $1M | $50 | 5–15 |
| Series A | $10M | $2K | 30–80 |
| Growth | $100M | $100K | 200–600 |
| IPO | $1B | $5M | 1,000–5,000 |
| Megacorp | $50B+ | $200M+ | 10,000+ |

Numbers stay below 1e15, so plain doubles are fine; display uses K / M / B / T / Qa suffixes (scientific notation option).

### 4.8 Offline progress

- Simulates up to **8 hours** offline (perks extend to 24 h) at reduced fidelity: revenue, users, churn, missions finishing.
- **Decisions never resolve while you're away.** Event cards pile into an inbox (max 5; older optional cards expire, forks wait forever).
- Cash can't drop below a safety floor offline: if runway would run out, the company enters **Hibernation** (staff paused, burn frozen) instead of dying.
- Welcome-back screen: what happened, what's waiting, "Collect".

---

## 5. Pipeline and Missions

### 5.1 The pipeline (Kingdom Inc. style)

The main HQ screen is a left-to-right flow of **stations**. Each station has a throughput and a buffer; arrows show the flow and turn red at the bottleneck.

```
Ideas ─► Engineering ─► Product ─► Marketing ─► Sales ─► Revenue
                          ▲            │
                       Design      Support (churn ◄── Users)
```

- **Ideas** are generated by founders (clicking "Brainstorm") and later by Design / R&D.
- **Engineering** turns Ideas + DP into **Features**.
- **Product** ships Features: each ship gives Quality, a Hype burst, and sometimes a new channel or pricing tier.
- Categories add or swap stations (§6).

Clicking matters early: **Code** (+DP), **Pitch** (+Users), **Brainstorm** (+Ideas), **Hustle** (+Cash). Click power scales with founder level and stops being important once managers arrive.

### 5.2 Missions

Missions are timed jobs you staff with a **team of 1–5 named employees** (the "adventurers" of Kingdom Inc.).

```
success% = clamp(base + Σ(member_stat − difficulty) × 4 + trait_bonuses, 5, 95)
```

| Mission | Unlock | Duration | Key stat | Reward | Failure |
|---|---|---|---|---|---|
| Hackathon | Garage | 2 min | Eng | Ideas + DP | Burnout on 1 member |
| Client Pitch | Seed | 3 min | Sales | Deal ($) / customer | Customers −2 |
| Trade Show | Seed | 5 min | Sales + Design | Users, Hype, contacts | Cash lost |
| Product Launch | Seed | 4 min | Design + Eng | Hype ×burst, Users | Hype crash, Press −5 |
| Funding Roadshow | Each round | 6 min | Founder + Sales | Better term sheets | Fewer offers |
| Poaching Raid | Growth | 4 min | Ops | Steal a rival's star hire | Lawsuit |
| Recruiting Drive | Series A | 3 min | Ops | Pool of rare-trait hires | — |
| Expansion Scout | Growth | 8 min | Ops + Sales | Opens a new city | Cash lost |
| Lobbying Trip | IPO | 10 min | Legal + Founder | Bill progress | Press −10, Skeletons |
| Category missions | Varies | Varies | Varies | See §6 | See §6 |

### 5.3 Staff

Every hire in a department is a number; **key staff** (shown as cards, max 5 + perks) are named people who go on missions.

- **Stats (1–10):** Eng, Design, Sales, Ops.
- **Morale (0–100):** below 30 they may quit; burnout from Hustle culture and failed missions.
- **Traits (one or two each):**

| Trait | Effect |
|---|---|
| Workaholic | +50% output, 2× burnout |
| 10x Engineer | Eng +4, refuses Support missions |
| Rainmaker | Sales deals ×2 |
| Visionary | +Ideas, ignores Ship Fast debt penalty… sometimes |
| Loyal | Never poached |
| Mercenary | Leaves for the highest bidder |
| Leaker | Rivals learn your next fork 1 minute early |
| Ex-Goliath | Knows the incumbent's secrets (+takeover odds), lawsuit risk |
| Burnt Out | −30% output until a vacation |
| Influencer | Every launch +Hype; posts about you when they quit |
| Compliance Nerd | Skeletons gain −50% on their missions |
| Chaos Agent | Missions swing to 5% or 95%, nothing between |

---

## 6. Product Categories (all 6 at launch)

At founding you pick **one category** 🔒. It reshapes the pipeline, adds one station and one category resource, brings two category rivals, five category missions, its own extra forks, three synergies and one unique ending.

**Unlocking:** SaaS, Social App and Food Delivery are open from the start. **Hardware** unlocks after your first ending, **Fintech** after any ending with valuation ≥ $1B, **AI** after 5 distinct endings. An options toggle unlocks all (for players who've seen it before / streamers).

| Category | Difficulty | Revenue multiple | User value | Feel |
|---|---|---|---|---|
| SaaS Tool | ★☆☆ (tutorial) | 10× | $50 | Steady, deal-driven |
| Social App | ★★☆ | 3× | $200 | Huge user numbers, late revenue, volatile |
| Food Delivery | ★★☆ | 2× | $40 | Map-heavy, three-sided balancing |
| Hardware Gadget | ★★★ | 3× | $80 | Factory, inventory, cash-hungry |
| Fintech | ★★★ | 8× | $150 | Trust and regulation, high stakes |
| AI | ★★★★ | 25× | $300 | Compute-hungry, biggest swings |

### 6.1 SaaS Tool — *"It's like a spreadsheet, but for your spreadsheets."*

- **Pipeline twist:** Sales is the main engine. Revenue comes as **MRR**; big **Enterprise Deals** come from Client Pitch missions.
- **Station: Integrations Marketplace** — each integration built (DP cost) raises conversion and reduces churn for one customer segment.
- **Category resource: Net Revenue Retention (NRR)** — 80–150%. Above 100%, existing customers grow revenue on their own.
- **Extra forks 🔒**
  - **Vertical** (one industry, deals ×2, market cap capped) vs **Horizontal** (everyone, bigger market, more rivals).
  - **Self-serve** (users sign up alone; marketing matters) vs **Sales-led** (few big deals; Sales matters).
- **Missions:** Enterprise Pitch, Security Audit, Renewal Rescue, Conference Keynote, Migration Project.
- **Rivals:** *Spreadsheet Supreme* (the incumbent everyone hates but uses), *Notely* (fast copycat).
- **Synergies:** Land and Expand, Shelfware, Developer Darling (§11).
- **Unique ending — The Plumbing:** your tool becomes infrastructure every rival depends on.

### 6.2 Social App — *"Like a group chat, but with everyone."*

- **Pipeline twist:** Revenue is near zero until 1M users. Then Ads or Premium switch on.
- **Network effect:** `acquisition × (1 + log10(Users)/4)` — growth snowballs.
- **Station: Trust & Safety** — absorbs **Toxicity**.
- **Category resource: Toxicity (0–100)** — rises with growth and with some forks. High Toxicity raises churn, hurts Press/Regulators and can trigger an **Exodus** event (lose 30% of users to a rival).
- **Extra forks 🔒**
  - **Algorithmic feed** (engagement ×2, Toxicity ×2) vs **Chronological** (calm, slower).
  - **Real names** (Toxicity −50%, growth −30%) vs **Anonymous** (growth +50%, Toxicity +50%).
- **Missions:** Trend Hijack, Creator Fund Deal, Moderation Sprint, Meme Campaign, Congressional Hearing (late).
- **Rivals:** *Chirp* (the old guard), *Glimmr* (trendy, copies every feature within 2 minutes).
- **Synergies:** Main Character, Cozy Corner, Rage Engine.
- **Unique ending — The Town Square:** 1B users with Toxicity under 30. Fail variant: **Ghost Town** (users fall below 10% of peak).

### 6.3 Food Delivery — *"Fries at your door in 11 minutes or they're free (they're never free)."*

- **Pipeline twist:** a **three-sided marketplace**: Restaurants, Couriers and Customers. Orders/s = min(each side × its factor). The weakest side is the bottleneck.
- **Station: Dispatch** — matches orders. Its level sets delivery time, which drives customer churn.
- **Category resource: Marketplace Balance** — shown as a triangle; balanced = ×1.5 orders.
- **Map-heavy:** each city district has its own demand. Expansion is the main growth lever.
- **Extra forks 🔒**
  - **Couriers as employees** (reliable, costly, Employee faction +) vs **Gig contractors** (cheap, strikes, Regulators −).
  - **Partner restaurants** (variety, commission fights) vs **Ghost kitchens** (you own the food; margins ×2, Customers −10).
- **Missions:** Restaurant Signing Blitz, Rainy Night Surge, Courier Strike Talks, Health Inspection, Launch Party.
- **Rivals:** *GrubGrab* (deep pockets, subsidizes prices), *DashDash* (copycat).
- **Easter egg:** the *French Fried!* fry boat is a partner restaurant in every city; signing it unlocks the "Fry Day" synergy.
- **Synergies:** Fair Fleet, Ghost Empire, Fry Day.
- **Unique ending — Eat the City:** ≥50% share in every district of 5 cities with Marketplace Balance ≥ 80%.

### 6.4 Hardware Gadget — *"A smart toaster that knows how you feel."*

- **Pipeline twist:** adds a **factory**: Engineering designs → **Manufacturing** builds units in **batches** → **Inventory** → Sales. Units sold, not users, drive revenue.
- **Station: Factory Line** — throughput, defect rate and lead time. Kingdom Inc.-style production chain: Parts → Assembly → QA → Shipping.
- **Category resource: Inventory** — too little = lost sales; too much = cash tied up and a write-off event.
- **Pre-orders:** launches sell before the factory can build, so cash comes early but delivery delays anger customers.
- **Extra forks 🔒**
  - **Own factory** (expensive, margins ×2, control) vs **Contract manufacturer** (cheap, slower, leak risk).
  - **Repairable** (Customers +, repeat sales −) vs **Sealed** (upgrade cycle, Press −).
- **Missions:** GadgetCon Demo, Factory Audit, Supply Crunch Run, Recall (forced on defects), Teardown Review.
- **Rivals:** *Fruitco* (sleek, expensive), *KnockOff Electronics* (clones your gadget for half the price).
- **Synergies:** Right-to-Repair Hero, Planned Obsolescence, Made Here.
- **Unique ending — Household Name:** 100M units sold with defects under 2%.

### 6.5 Fintech — *"Banking, but the app is purple."*

- **Pipeline twist:** users bring **Deposits**. Revenue = interchange fees + **interest on deposits** (rates change during the run).
- **Station: Compliance** — must keep up with Deposits or the **Compliance Gap** grows (fines, Regulators −).
- **Category resource: Trust (0–100)** — if it drops under 20, a **Bank Run** event starts: deposits drain until you restore Trust or fold.
- **Extra forks 🔒**
  - **Get a banking license** (slow, safe, interest ×2) vs **Partner bank** (fast launch, your partner can drop you).
  - **Crypto** (Hype ×3, volatile, Regulators −) vs **Traditional** (boring, stable).
- **Missions:** License Application, Fraud Sweep, Rate Bet, Regulator Meeting, Card Launch.
- **Rivals:** *First National Goliath* (the big bank), *Moonvault* (crypto hype machine; may collapse on its own).
- **Synergies:** Fortress Bank, Degen Casino, Round-Up Revolution.
- **Unique ending — Too Big to Fail:** $1T in deposits and survive the Bank Run event (the government quietly bails you out if Regulators ≥ 70).

### 6.6 AI — *"It's a chatbot, but for chatbots."*

- **Pipeline twist:** adds **Compute** and **Training Runs**. Model capability drives everything; compute is the main cost.
- **Station: Data Center** — buy GPU racks (huge cost, huge burn). Training Runs are long missions (10–30 min) that raise **Capability**.
- **Category resource: Capability (0–100)** — sets product quality and unlocks product tiers (Autocomplete → Chatbot → Agent → "Something Else").
- **Extra forks 🔒**
  - **Open weights** (community DP, Press +, can't charge for the model) vs **Closed** (charge more, rivals catch up slower).
  - **Licensed data** (expensive, Regulators +) vs **Scrape everything** (cheap, lawsuits, Skeletons).
  - **Safety team size**: a slider that's locked once training passes Capability 50.
- **Missions:** Training Run, Benchmark Showdown, Data Deal, Red Team, Keynote Demo (can go hilariously wrong).
- **Rivals:** *OpenEnd* (everyone's first guess), *Deep Thinkr* (rich, secretive).
- **Synergies:** Open Frontier, Black Box, Safety First.
- **Unique ending — The Last Startup:** Capability 100. Your model starts founding startups on its own. Unlocks AI founder cards in the Venture Fund.

---

## 7. The Decision System

### 7.1 Kinds of decisions

| Kind | Frequency | Reversible? | Example |
|---|---|---|---|
| 🔒 **Fork** | At founding, at each phase gate, and at story beats (12–18 per run) | No (except by Pivot) | Pricing model, culture, first funding |
| ⏳ **Opportunity** | Every 3–6 min | Expires | Celebrity endorsement, government contract |
| 🃏 **Event card** | Every 1–3 min | Answer once | "Your engineer wants a 4-day week" |
| 🎚️ **Setting** | Any time | Yes, with a cooldown and a cost | Price, channel budget, cash/equity pay mix |

### 7.2 How forks lock things

Each fork option has:
- **Effects:** permanent multipliers and pipeline changes.
- **Unlocks:** an upgrade line (4–8 upgrades), new missions, new event cards, new opportunities.
- **Locks:** the other options' lines, plus listed endings, synergies and later forks.
- **Faction shifts:** immediate standing changes.

Forks also **chain**: choosing Bootstrap removes the Series A–C term sheet forks and replaces them with the "Debt or Discipline" fork.

### 7.3 Visible consequences

- The **Board Room** screen shows the run's decision tree: taken branches are lit, closed ones are greyed out with a tooltip — *"Closed: you chose Ads (Seed phase)."*
- Endings panel shows every ending as **Open / At risk / Closed**, and why.
- Before you commit a fork, a preview lists exactly what it opens and closes. No hidden locks for forks. (Synergies and secret endings stay hidden until discovered, but forks never trick you.)

### 7.4 Pivot

- One **Pivot** per run (+1 per perk, max 3).
- Reopens one fork and lets you pick a **different** option.
- Costs: 25% of users, 30% of cash, all Hype, −10 to every faction, and any synergy that depended on the old choice.
- Opens the "Pivot to ..." comedy event chain (*"We're not a toaster company. We're a data company."*).

---

## 8. Decision Areas

🔒 = permanent fork. 🎚️ = adjustable setting.

### 8.1 Product

| Decision | When | Options | Effects | Opens / Closes |
|---|---|---|---|---|
| 🔒 Category | Founding | 6 categories | §6 | Whole category content |
| 🔒 Build philosophy | Seed | **Ship Fast** / **Polish** | Ship Fast: DP ×2, +2 Tech Debt per feature. Polish: DP ×0.7, Quality cap +30, churn −25% | Ship Fast opens "Move Fast" upgrades, closes Beloved Brand unless Debt < 20 at the end. Polish opens "Craft" upgrades. |
| 🔒 Roadmap fork 1 | Series A | **Privacy-first** / **Data-driven** | Privacy: Customers +15, Regulators +10. Data: ad revenue ×2, conversion +20% | Data closes Beloved Brand and Cult Favorite; opens Dark Empire |
| 🔒 Roadmap fork 2 | Series A+ | **Open platform** / **Walled garden** | Open: community DP, +integration slots. Walled: churn −30%, price power +20% | Open opens Developer Darling / Open Source Darling |
| 🔒 Roadmap fork 3 | Growth | **Mobile-first** / **Web-first** / **Everywhere** | Mobile: acquisition +30%. Web: Sales deals +30%. Everywhere: +15% both, DP costs ×1.5 | — |
| 🔒 Product line | Growth | **Expand** (second product) / **Focus** | Expand: a second pipeline (new category-lite product, shares staff). Focus: ×3 on your single product | Focus is required for Quiet Millionaire |
| 🎚️ Refactor sprints | Any | On / Off | Halts features; Tech Debt −1/s | — |
| 🎚️ Feature priority | Any | Growth / Retention / Revenue features | Steers what each shipped feature boosts | — |

### 8.2 Pricing

**🔒 Pricing model (Seed):**

| Model | Conversion | Revenue / paying user | Churn | Notes |
|---|---|---|---|---|
| **Ads** | 100% (everyone "pays" by watching) | Tiny, scales with Users | Low | Best at huge scale; needs Data-driven for full value |
| **Freemium** | 3–8% | Medium | Low | Free users still spread word of mouth |
| **Subscription** | 20–40% | Medium, recurring | Sensitive to price | Unlocks Annual Plans line |
| **One-time** | 10–20% | High, once | — | Revenue needs constant new users; no recurring |
| **Enterprise contracts** | Deals only | Very high | Renewal events | Revenue comes from Client Pitch missions |
| **Usage-based** | 30–50% | Scales with your Quality | Low | Revenue rises as customers grow |

Each model opens its own upgrade line (e.g. Subscription → *Annual Plans*, *Family Plan*, *Win-back Emails*) and closes the others.

**🎚️ Price slider:** five steps from Bargain to Premium around a category reference price.

```
conversion = base_conv × (ref_price ÷ price) ^ elasticity
```

| Brand | Elasticity |
|---|---|
| Budget | 1.6 (price-sensitive customers) |
| Disruptor | 1.2 |
| Trustworthy | 1.0 |
| Luxury | 0.6 (high prices barely hurt) |

- Raising price more than one step per 5 minutes → Customers −5 and a churn spike.
- Rivals react to your price after 1–2 minutes (undercut or follow, by personality).

**Promotions (🃏 cards / 🎚️ buttons):**

| Promo | Effect | Cost |
|---|---|---|
| Free trial | Conversion +50% for 3 min | Revenue −20% for those users' first minute |
| Launch discount | Acquisition ×2 for 2 min | Revenue −40% for 2 min |
| Lifetime deal | Instant cash = 2 years of those users' revenue | Those users pay nothing ever again; once per run |
| Referral bonus | Word of mouth ×2 | $ per referred user |

**⚠️ Dark patterns (🔒 once taken):** *Hidden fees*, *Cancellation maze*, *Fake scarcity timer*. Each: +10% revenue permanently, Skeletons +15, Customers −10. Taking any closes Beloved Brand.

**🃏 Price war (event):** a rival cuts prices by 30%. Options: **Match** (keep share, margins −30%), **Hold** (lose 15% of users to them), **Go premium** (raise price, become Luxury-adjacent: Quality must be ≥70 or users flee).

### 8.3 Marketing

**🔒 Brand identity (Series A):**

| Brand | Strong channels | Weak channels | Customer mix | Events |
|---|---|---|---|---|
| **Disruptor** | Social ads, Stunts, Influencers | TV | Young, hype-driven, fickle | Feuds with rivals |
| **Trustworthy** | Word of mouth, Press | Stunts | Loyal, slow to move | Endorsements |
| **Luxury** | Influencers, Events | Social ads, Billboards | Few, rich | Waitlists |
| **Budget** | Billboards, Search ads | Influencers | Many, price-sensitive | Coupon wars |

Strong channels ×1.5, weak ×0.5.

**Channels (generators with saturation):**

| Channel | Unlock | Base cost | Users/s per level | Saturation cap (home city) |
|---|---|---|---|---|
| Word of mouth | Start | Free (Quality-driven) | Quality ÷ 20 | Market size × 5% |
| Search ads | Seed | $20 | 2 | Low |
| Social ads | Seed | $30 | 3 | Medium |
| Content / blog | Seed | $25 | 1 (grows over time) | High |
| Influencers | Series A | $500 | 40 | Medium |
| Billboards | Series A | $1,500 | 100 | City-limited |
| Podcasts | Series A | $800 | 60 | Medium |
| TV spots | Growth | $50K | 3,000 | High |
| Stadium naming rights | IPO | $50M | 1M (+Hype) | Very high, one per city |

Each channel has levels (cost ×1.15 per level). **Channel slots** are limited by Marketing staff (1 per 5), so you choose a mix.

**Hype:**
- **Launch events:** schedule a launch 2–5 minutes ahead. Teasers build Hype; on launch day it converts into a user burst. Shipping a big feature on launch doubles it. Missing the date costs Press −10.
- **Stunts (missions):** Viral Challenge, Guerrilla Pop-up, Celebrity Cameo, Blimp. Success = Hype ×3–5. Failure = **PR disaster** (Hype to 0, Press −15, possible Skeletons).
- **🃏 Attack ads:** target a rival: they lose 10% share, you gain some; Press −5; that rival becomes hostile (they retaliate within 5 minutes).

### 8.4 People & Culture

| Decision | When | Options | Effects | Opens / Closes |
|---|---|---|---|---|
| 🔒 Cofounder | Founding | **Hacker** (DP click ×3), **Hustler** (Pitch/Hustle ×3, better term sheets), **Designer** (Quality +20 cap, launches ×1.5) | Each has a story thread (5 events) | Betraying them (several cards allow it) → they leave, perk lost, they may found a rival |
| 🔒 Culture | Series A | **Hustle**, **Balanced**, **Remote-first**, **Mission-driven** | Hustle: output +50%, burnout ×2. Balanced: no extremes, morale +10. Remote: wages −30%, mission success −10%, hire from anywhere. Mission-driven: wages −20%, quitting −50%, but Skeletons hurt morale ×3 | Mission-driven needed for Employee Co-op; Hustle opens Blitzscale |
| 🎚️ Compensation mix | Seed+ | Cash ↔ Equity slider | Equity pay cuts wages up to 50%, but gives away up to 30% of the company over a run. Equity holders quit 50% less | Employee Co-op needs ≥50% to staff by the end |
| 🔒 Layoffs (event, at least once per VC run) | Down round, board demand | **Cut 20%** / **Pay cuts for all** / **Founders take no salary** | Different faction hits | "Cut" closes Mission-driven bonuses |
| 🃏 Key hires | Any | Named candidates with traits and baggage | e.g. *Rex Brightwater, ex-Goliath VP*: Sales +5, Ex-Goliath trait, Goliath lawsuit 40% | — |
| 🃏 Unionization (event) | Growth, if morale < 40 | **Recognize** / **Fight** / **Raise wages** | Recognize: Employees +30, wages +15%. Fight: Legal costs, Press −, Skeletons +10 | Fight closes Employee Co-op |

### 8.5 Funding & Finance

**🔒 First funding (Seed) — chooses your track:**

| Track | Cash | Equity | Board | Later options | Closes |
|---|---|---|---|---|---|
| **VC** | Big ($1M seed) | −15–25% per round | VC seats each round | Series A–C, IPO | Employee Co-op, Quiet Millionaire |
| **Bootstrap** | None | Keep 100% | None | Revenue-based financing, bank loans | IPO, Ousted, Swallow the Giant (unless Pivot) |
| **Crowdfund** | Medium (pre-orders + equity crowdfunding) | −10% per round, spread over thousands of fans | No board seats | Equity crowdfunding rounds, **Direct listing** instead of IPO; switching to VC at Series A angers backers (Customers −20) | Ousted |

**Rounds (VC track):** Seed → Series A → B → C → IPO. At each round you get **three term sheets** (more with a good Funding Roadshow):

| Term sheet | Cash | Dilution | Catch |
|---|---|---|---|
| **Rocket** | High valuation | Low | 2× liquidation preference: in Acquired endings investors take 2× their money first |
| **Standard** | Fair | Fair | +1 board seat |
| **Founder-friendly** | Low | Moderate | You keep board control; less cash |

**Board control:** you control the board while founder seats ≥ investor seats. Without control:
- **Board demands** (🃏): "Hit $X revenue in 10 minutes" or "Cut burn 30%". Fail → the board overrides one setting (e.g. forces Ads, forces layoffs).
- **Board vote** (event, Growth+): if Investors < 30 and you lack control → vote to replace you. Lose → **Ousted** ending.

**Debt:** bank loan (needs revenue, fixed repayments), revenue-based financing (takes 10% of revenue until paid ×1.5), venture debt (VC track; default = forced sale).

**🃏 Down round:** valuation fell since the last round. **Accept** (dilution ×2, Investors −10), **Layoffs** (see 8.4), **Bridge loan** (debt, buys 10 minutes).

**IPO / Direct listing (VC or Crowdfund track, valuation ≥ $1B):**
- Your company gets a **share price**, simulated from fundamentals (revenue growth, margins) + Hype + random walk.
- **Quarterly earnings** every 8 minutes: beat the guidance you set and the price jumps; miss it and it drops. Setting guidance is a 🎚️ risk dial.
- **Stock market screen:** all rivals are listed. Buy their shares; at 51% you trigger a **hostile takeover**. They can defend (poison pill event, white knight).
- **Buybacks** raise your equity %; **secondary offerings** raise cash but dilute.

### 8.6 Operations & Expansion

- **City map (Plutocracy-style):** your home city, **New Ventura**, has 6 districts:

| District | Rent | Talent | Customers | Perk |
|---|---|---|---|---|
| Garage Row | Cheapest | Low | — | Start here |
| Tech Park | High | Eng/Design pool | Early adopters | Hiring cost −20% |
| Downtown | Very high | Sales pool | Businesses | Enterprise deals +30% |
| Suburbs | Low | Ops pool | Families | Word of mouth +20% |
| Old Port | Low | Mixed | — | Warehouses/factories/data centers −40% |
| Uptown | Highest | — | Luxury | Luxury brand ×1.5 |

- Offices are **buildings you lease or buy**. Buying costs more upfront but removes rent and can be sold later (a late-game cash source). Some buildings have traits (*"Haunted: −10% morale, rent −50%"*).
- **🔒 In-house vs Outsourced** (Series A) for Support and manufacturing/Ops: Outsourced cuts costs 40%, Quality −10, a data-leak event chance.
- **Expansion (Growth+):** new cities via the Expansion Scout mission. Six cities, each a fresh market with its own saturation caps, demand curve and an established local rival. Some cities have rules (*"Port Royale bans gig work"*).
- **🔒 International strategy** (IPO): **Localize** (slow, high share) vs **Copy-paste** (fast, culture-clash events).

### 8.7 Rivals

4 general rivals + 2 category rivals per run. Each has a personality that sets how it reacts:

| Rival | Personality | Behavior |
|---|---|---|
| **Goliath Corp** | The incumbent | Huge, slow. Buys out anyone growing too fast. Offers to acquire you at least once. |
| **CopyCat Labs** | Copycat | Clones your last shipped feature within 2 minutes. |
| **Hypestack** | Hype-driven | Burns cash on marketing; may implode on its own (you can buy its remains). |
| **Small Batch Co.** | Idealist | Small, beloved; will only merge with you if Customers ≥ 70 and you've never used dark patterns. |
| *(2 category rivals)* | See §6 | — |

**Rival actions** (each rival acts every 2–4 min): undercut price, launch a competing feature, poach a key hire, sue (patents), attack ads, buyout offer, merger offer, lobby against you.

**Your actions against rivals:** poach, sue (Legal), attack ads, leak (Skeletons +20), partner, buy shares (post-IPO), merge, acquire.

**Rivals remember.** Each rival has a **Relationship** (−100 to +100). Suing or attack ads → hostile; partnering → friendly. Hostile rivals refuse mergers and partnerships; friendly ones offer joint deals.

**🃏 The Buyout Offer (Growth, guaranteed):** Goliath offers to buy you at 1.5× valuation.
- **Sell** → **Acquired** ending now (payout boosted).
- **Merge** → gain their tech line, Goliath becomes your partner, but you can never Swallow the Giant.
- **Refuse** → Goliath goes hostile and starts a price war.

### 8.8 Politics & Lobbying (IPO+)

- **City Hall / State / Federal** each have **Bills** that move through stages (Proposed → Committee → Vote → Law).
- **Lobbying Trips** (missions) push bills; **campaign donations** (🎚️ $/min) raise influence; **public opinion** (Press + Customers) sets how hard it is.
- Example bills: *Gig Worker Protection*, *Data Privacy Act*, *Fintech Sandbox*, *AI Safety Standards*, *Hardware Import Tariff*, *Right to Repair*. Each helps or hurts specific forks and categories (yours and rivals').
- **Writing your own bill:** at max influence you can draft one regulation aimed at a rival ("No purple banking apps").
- Every lobbying action adds Skeletons; **Regulators** react to how hard you push.

---

## 9. Factions, Skeletons and Scandals

### 9.1 Factions

Each starts at 50 (0–100). Standing changes come from forks, cards, missions and events.

| Faction | ≤ 20 blocks | ≥ 80 opens |
|---|---|---|
| **Investors** | Term sheets drop to 1; board vote risk | Rocket term sheets without the 2× preference |
| **Employees** | Strikes, mass quitting, Glassdoor-style events | Rare-trait hires, Employee Co-op ending |
| **Customers** | Exodus events, boycott | Beloved Brand ending, word of mouth ×2 |
| **Regulators** | Fines, government contracts, licensing | Government contracts, sandbox bills |
| **Press** | Launch Hype halved | Free Press coverage, Hype decay −50% |

### 9.2 Opportunities (⏳)

Timed offers. Most have faction requirements; some exclude each other.

| Opportunity | Requires | Reward | Conflicts with |
|---|---|---|---|
| Celebrity endorsement | Press ≥ 50 | Hype ×4 | — |
| Government contract | Regulators ≥ 70, no fraud history | $ deal, steady revenue | Data-driven + Skeletons > 40 |
| Exclusive partner (big retailer) | Series A | Users ×1.5 | Partnership with a rival |
| Rival partnership | Relationship ≥ 30 | Shared channel | Exclusive partner |
| Acqui-hire a failed startup | Cash | 3 key staff | — |
| University research deal | Polish or Open platform | DP ×1.3 | Scrape everything (AI) |
| Charity tie-in | Mission-driven or Trustworthy | Customers +10 | Dark patterns |
| Offshore tax structure | Legal ≥ 10 | Burn −15% | Skeletons +25, Government contract |
| TV show appearance | Founder level 5 | Hype, Press | — |
| Franchise license (Food) | Food Delivery | City opened free | — |

### 9.3 Skeletons and the Reckoning

- **Skeletons (hidden, 0–100)** rise with dark patterns, scraping, gig fights, offshore deals, leaks, cover-ups and lobbying.
- Above 40, **rumors** start appearing (hinting at the meter). Above 70, journalists start **investigating** (a visible timer).
- When the timer ends or Skeletons hit 100: **The Reckoning** (fork):
  - **Come clean** → big faction hits, Skeletons reset to 20, company survives.
  - **Cover up** → costs Legal + cash. Success = buys time. If Skeletons ≥ 100 at a second Reckoning → **Fraud Collapse** ending.
  - **Blame a cofounder** → Press recovers, cofounder lost forever (and their perk), cofounder thread ends in a tell-all memoir event.

---

## 10. Event Cards (🃏 sample)

About 150 event cards at launch: ~60 general, ~15 per category. Every card has 2–3 answers. Small cards change numbers; story cards set flags read by later cards.

| Card | Answers |
|---|---|
| "Our engineer wants a 4-day week." | Yes (morale +, output −10%) / No / Let everyone have it (Employees +15, output −15%) |
| "A server caught fire. Literally." | Rebuild (cash) / Move to cloud (burn +) / Blame interns (Press −) |
| "A blogger called the app 'mid'." | Ignore / Reply (Hype ±, coin flip) / Send free swag |
| "An investor wants their nephew hired." | Hire (Investors +, morale −) / Refuse (Investors −) |
| "Your cofounder wants a bigger title." | Give it / Refuse / Make *yourself* Chief Visionary Officer |
| "A rival is hosting a party at your office's front door." | Crash it / Host a bigger one / Call the city |
| "Users found a bug that's actually fun." | Fix it / Make it a feature (Hype +) |
| "The office dog is going viral." | Lean in (Hype +) / Protect the dog's privacy |
| "Someone leaked the roadmap." | Find the leaker (morale −) / Release it officially / Fake roadmap |
| "A whale customer threatens to leave." | Discount (revenue −) / Custom feature (DP −) / Let them go |

---

## 11. Synergies (30 to discover)

Synergies are hidden combinations of forks and settings. When the conditions are met, a banner announces it and the Founder's Journal records it. 12 are general, 18 are category-specific (3 per category).

### General

| Synergy | Requires | Effect |
|---|---|---|
| **Cult Favorite** | Freemium + Privacy-first + word of mouth ≥ 40% of acquisition | Users ×2, churn −50% |
| **Boring Money** | Subscription or Enterprise + Trustworthy + Sales ≥ 50 staff | Revenue ×3, Hype disabled |
| **Growth at All Costs** | Ads + Disruptor + Ship Fast | Users ×5, Skeletons gain ×3 |
| **Velvet Rope** | Luxury + Polish + Premium price | Elasticity halved; waitlist (users queue and convert at 2×) |
| **Lean Machine** | Bootstrap + Remote-first + Focus | Burn −40% |
| **Family Business** | Bootstrap + Mission-driven + Equity pay ≥ 30% | No one quits; Employees locked ≥ 80 |
| **Blitzscale** | VC + Hustle + Expand | Expansion cost −50%, burnout ×2 |
| **The Underdog** | Budget + matched a price war + word of mouth ≥ 30% | Steal 1% share/min from the largest rival |
| **Dark Empire** | Data-driven + Walled garden + any dark pattern | Revenue ×4; Regulators −1/min forever |
| **Open Source Darling** | Open platform + Privacy-first + Crowdfund | Community produces DP equal to 50% of your Engineering |
| **Hype Machine** | Crowdfund + Disruptor + 5 successful stunts | Hype decays half as fast |
| **Golden Handcuffs** | VC + Equity pay ≥ 40% | Key staff can't be poached; at IPO they all get Workaholic |

### Category

| Category | Synergy | Requires | Effect |
|---|---|---|---|
| SaaS | **Land and Expand** | Sales-led + Integrations ≥ 10 | NRR +30% |
| SaaS | **Shelfware** | Enterprise + annual plans + Support < 10 | Revenue ×2, renewals become coin flips |
| SaaS | **Developer Darling** | Open platform + Self-serve + Usage-based | Word of mouth ×3 |
| Social | **Main Character** | Algorithmic + Disruptor + Influencers channel | Viral events ×3 frequency |
| Social | **Cozy Corner** | Chronological + Real names + Mission-driven | Toxicity ×0.25, churn −40% |
| Social | **Rage Engine** | Algorithmic + Anonymous + Ads | Users ×3, Toxicity ×3 |
| Food | **Fair Fleet** | Couriers as employees + Mission-driven | Strikes impossible, delivery time −30% |
| Food | **Ghost Empire** | Ghost kitchens + Budget + Data-driven | Margin ×3, Customers −1/min |
| Food | **Fry Day** | Partner restaurants + the *French Fried!* fry boat signed in 3 cities | Orders ×1.5 on every 7th minute (Fry-day) |
| Hardware | **Right-to-Repair Hero** | Repairable + Trustworthy + One-time | Customers +30, Press +20 |
| Hardware | **Planned Obsolescence** | Sealed + Subscription | Repeat sales ×3, Skeletons +1/min |
| Hardware | **Made Here** | Own factory + Luxury | Price power +50%, defects −50% |
| Fintech | **Fortress Bank** | Banking license + Trustworthy + Polish | Bank Run immunity |
| Fintech | **Degen Casino** | Crypto + Disruptor + Ads | Deposits ×4, Trust swings ×3 |
| Fintech | **Round-Up Revolution** | Freemium + Mobile-first + Budget | Users ×2, deposits per user −50% |
| AI | **Open Frontier** | Open weights + Licensed data | Capability gain ×1.5 from community |
| AI | **Black Box** | Closed + Scrape everything + Walled garden | Revenue ×3, lawsuits ×3 |
| AI | **Safety First** | Safety team ≥ 30% + Trustworthy + Enterprise | Government contracts guaranteed; Keynote Demos can't fail |

---

## 12. Run Structure and Pacing

Target times for a first-time player; experienced players with perks go ~2× faster.

| Phase | Target time | Gate to next phase | Unlocks in this phase | Forks in this phase |
|---|---|---|---|---|
| **1. Garage** | 0–15 min | $1M valuation or 1,000 users | Clicking, Engineering, Word of mouth, Hackathon | Category, Cofounder |
| **2. Seed** | 15–40 min | $10M | Design, Sales, Marketing staff, channels, missions, pricing | First funding, Pricing model, Build philosophy |
| **3. Series A** | 40–80 min | $100M | Support, Ops, managers, city map, culture, launches | Brand, Culture, Roadmap 1–2, In-house/Outsourced, category fork 1 |
| **4. Growth** | 80–120 min | $1B | Legal, expansion, rivals at full strength, Buyout Offer | Roadmap 3, Expand/Focus, Buyout response, category fork 2 |
| **5. IPO** | 120–150 min | Ending conditions | Stock market, earnings, takeovers, politics | International strategy, Reckoning (if reached) |
| **6. Megacorp** | 150+ min (optional) | — | Writing bills, buying cities' naming rights | Ending choice |

**Ending a run:** when one or more endings' conditions are met, an **"End this chapter?"** button appears. You can keep playing to aim for a different open ending. Some endings trigger on their own (Ousted, Fraud Collapse, Shut Down, Acquired on Sell).

---

## 13. Endings

**Payout = Valuation (or market cap) × your Equity % × ending bonus − liquidation preferences.**

### General endings

| Ending | Conditions | Ending bonus |
|---|---|---|
| **IPO Titan** | IPO'd, board control at the IPO, market cap ≥ $10B | ×1.5 |
| **Acquired** | Accept a buyout (Goliath's or a later offer) | ×1.2 (minus liquidation preferences) |
| **Employee Co-op** | Bootstrap + Mission-driven + ≥ 50% equity to staff + Employees ≥ 80 | ×2 Reputation (payout itself is small) |
| **Beloved Brand** | Customers ≥ 90 and Press ≥ 70 at the end, no dark patterns, Tech Debt < 20 | ×2 |
| **Swallow the Giant** | Own ≥ 51% of Goliath Corp | ×2.5 |
| **Quiet Millionaire** *(secret)* | Bootstrap + Focus + never left New Ventura + $10M banked; choose "Close the laptop" | ×3 Reputation |
| **Ousted** | Lose the board vote | ×0.5 (but unlocks the "Revenge" founder perk) |
| **Fraud Collapse** | Second Reckoning with Skeletons ≥ 100 | ×0 payout, ×0.5 Reputation, darkly funny epilogue |
| **Shut Down** | Out of cash, no rescue | Minimum Reputation, unlocks one perk discount ("Lessons Learned") |

### Category endings

| Category | Ending | Conditions |
|---|---|---|
| SaaS | **The Plumbing** | 3+ rivals depend on your integrations, NRR ≥ 130% |
| Social | **The Town Square** / *Ghost Town* (fail) | 1B users, Toxicity < 30 / users drop below 10% of peak |
| Food | **Eat the City** | ≥ 50% share in every district of 5 cities, Balance ≥ 80% |
| Hardware | **Household Name** | 100M units sold, defects < 2% |
| Fintech | **Too Big to Fail** | $1T deposits, survive the Bank Run |
| AI | **The Last Startup** | Capability 100 |

Each ending has an **epilogue screen**: a newspaper front page written from your flags (*"Toaster Startup Founder Buys Former Rival, Renames It 'Toast'"*), your stats, and the decision tree of the run.

---

## 14. Career Progression (Prestige)

### 14.1 Founder Reputation

```
Reputation earned = floor( sqrt(payout ÷ $1M) × ending_bonus ) + journal bonuses
```

Spent in the **Founder Perk Tree** (3 branches, ~36 nodes, costs rising 1 → 500):

| Branch | Sample perks |
|---|---|
| **Builder** (product) | Start with 3 Engineers · DP ×1.25 per level · Tech Debt gain −20% · Start with one feature shipped · +1 Roadmap preview (see what a fork's synergies would be) |
| **Hustler** (growth) | Click power ×3 · +1 channel slot · Launch Hype ×1.5 · Hype decay −20% · Start with Word of mouth level 5 |
| **Dealmaker** (money & power) | +1 term sheet · Equity dilution −10% · +1 Pivot · Offline cap +8 h · Start with $10K · Rival relationships start at +10 |

### 14.2 Founder's Journal

A collection screen with:
- **Endings** (16, counting Ghost Town), **Synergies** (30), **Categories** won, **Fork branches** taken (a big tree of every option you've ever picked), **Event cards** seen.
- Completion milestones grant Reputation and cosmetics (office themes, founder outfits, hoodie colors).

### 14.3 Venture Fund (unlocks after 3 distinct endings)

The meta-idle layer: you become the investor.
- Every run, 3–5 **AI founder cards** appear (name, category, traits, pitch). You invest **Fund Cash** in them.
- Funded startups play out as **simplified idle simulations in the background**, during your runs and while offline. They make their own forks based on their traits (a *Reckless* founder takes Growth at All Costs).
- You can **intervene** once per startup: a board seat card lets you force one fork.
- Exits return Fund Cash (×0 to ×100). Fund Cash buys: starting cash for runs, permanent "LP perks", and stakes that pay out if *your* run's rival is a portfolio company.
- The AI category's **Last Startup** ending adds AI-founded startups that grow ×3 faster and sometimes go rogue.

---

## 15. Screens and UI

| Screen | Purpose |
|---|---|
| **HQ** | The pipeline: stations, flows, bottleneck highlights, click buttons, top bar (Cash, Burn, Runway, Users, Valuation, Hype) |
| **Team** | Departments, buy staff, managers, key staff cards, morale |
| **Missions** | Mission board, team assembly, success odds, timers |
| **Growth** | Channels, price slider, promotions, launch planner, funnel chart |
| **Map** | City districts, buildings, expansion to other cities |
| **Market** | Rivals' share, relationships, actions; stock market after IPO |
| **Board Room** | Decision tree, pending forks, endings tracker, faction meters, board control |
| **Capitol** | Bills and lobbying (IPO+) |
| **Journal** | Endings, synergies, fork history, perks |
| **Venture Fund** | Portfolio (after unlock) |

- **Inbox:** event cards and opportunities stack top right with countdowns.
- **Decision cards** are big, centered and pause the game (setting: pause or keep running).
- Keyboard: `1–8` buy in the selected department, `Shift`/`Ctrl` ×10/×100, `Space` click-action, `Tab` cycle screens, `I` inbox, `Esc` close. Full controller support for Steam Deck.

---

## 16. Art and Audio

- **Look:** minimalist 2D like Kingdom Inc.: flat shapes, a strong accent color per category, clean typography, little isometric office blocks that grow with each tier (garage → office → campus → tower).
- **The pipeline is the hero image:** dots (ideas, features, users) flow along lines between station icons; bottlenecks pulse red.
- **City map:** a stylized flat map with districts as colored blocks; your buildings light up in your brand color, rivals' in theirs.
- **Writing:** short, dry, satirical. Every event card, rival press release and epilogue is a joke opportunity. No real companies or people.
- **Audio:** synthesized at runtime (as in Every Possible Book): lo-fi office music that gets busier and more orchestral as the company grows; small UI blips; a cash-register cascade on milestones; one sad trombone for Shut Down.

---

## 17. Steam Features

- **Achievements (~80):** one per ending, category, synergy group, and milestone (first $1M, first unicorn, 1,000 staff, survive a Bank Run, never use a dark pattern in a $1B run…). Pipeline from the other games: `steam/achievements.csv` + generated icons.
- **Steam Cloud** saves, **Steam Deck Verified** (1280×800 layout, controller, readable text).
- **Rich presence:** "Series A — SaaS — $42M valuation".
- **Leaderboards:** fastest unicorn per category; highest payout; Venture Fund return.
- **Demo:** Garage + Seed with SaaS and Social App; saves carry over to the full game.
- **Trading cards** later (after launch).

---

## 18. Tech

- **Stack:** TypeScript + PixiJS 8 + Electron + `steamworks.js`, copied from `every-possible-book/` (build script, Electron shell, preload, Steam bridge, achievements tooling).
- **Folder:** `unicorn/` with `src/core` (simulation), `src/content` (categories, forks, cards, synergies, endings as data), `src/render`, `src/ui`, `tests`.
- **Simulation:** fixed 10 Hz tick, separate from rendering. Pure functions of `(state, input, rng)` with a seeded RNG, so runs are replayable and testable. Offline progress runs the same sim at a coarse 1 s step.
- **Content as data:** every fork, card, synergy, opportunity and ending is a typed definition with `requires`, `effects`, `unlocks`, `locks`. A content validator checks that every lock/unlock reference exists and that every ending is reachable in theory.
- **Saves:** versioned JSON with migrations, autosave every 30 s, export/import, Steam Cloud.

### 18.1 Testing and balance

- **Unit tests:** formulas, cost curves, saturation, conversion, payout, save migrations.
- **Pacing bot** (like `every-possible-book/tests/bot.ts`): plays a full run with a fork policy. CI runs it per category with a fixed set of policies and checks each phase gate lands inside its time window (§12).
- **Ending coverage test:** for each ending, a scripted policy that should reach it must reach it within 3 hours of sim time.
- **Dominance check:** runs ~200 random fork paths per category; flags any path whose payout is > 3× the median (an overpowered strategy) or any fork option that's never worth taking.
- **`npm run sim`**: prints a timeline per category/policy for balancing by hand.

---

## 19. Roadmap

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M1 — Prototype** | Core sim, Engineering/Marketing/Sales, Garage + Seed, SaaS only, pricing model fork, 20 cards, saves, offline | Bot reaches Seed in 15–25 min; fun to click through |
| **M2 — Decision slice** | Series A + Growth, all decision areas (§8) for SaaS, factions, Skeletons, 3 general rivals, 6 endings | 3 different fork paths feel different; ending coverage test green |
| **M3 — Categories** | Social, Food, Hardware, Fintech, AI with stations, forks, missions, rivals, synergies, endings | Each category passes its pacing and coverage tests |
| **M4 — Late game** | IPO, stock market, takeovers, politics, Megacorp, epilogues | Full run end to end in every category |
| **M5 — Career** | Perk tree, Journal, Venture Fund | 20-hour meta curve simulated by the bot |
| **M6 — Steam** | Achievements, Cloud, Deck, rich presence, demo build, store assets, trailer | Demo ready for a Next Fest |
| **M7 — Polish & balance** | Art pass, audio, writing pass (~150 cards), localization hooks | No dominant strategy; playtest feedback addressed |

---

## 20. Open Questions

1. **Title:** "Unicorn" is likely crowded on Steam. Alternatives: *Burn Rate*, *Pivot*, *Series Z*, *Serial Founder*.
2. **Pause on decisions:** should forks pause the game by default, or keep the clock running for tension?
3. **Run length:** 2–3 hours per run is long for a roguelite-style replay loop. Should there be a "Speedrun" mode (×3 sim speed, shorter gates)?
4. **Category unlock order:** gate Hardware / Fintech / AI behind endings (current plan), or open all six from the start?
5. **Multiplayer / async:** a weekly seeded challenge with a leaderboard is cheap with the deterministic sim — worth adding at launch?
