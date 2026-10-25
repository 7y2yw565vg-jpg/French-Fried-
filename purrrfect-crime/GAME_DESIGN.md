# Purrrfect Crime — Game Design

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
who has just arrived in the city to make a name for himself. You sneak through grand museums, galleries and
mansions at night and steal what's on display. Then you fence the loot on the black market for **Catnip**
and spend it on Leo's skills and lair. Somewhere in the city, the legendary **NightClaw** is watching.

There is no combat. If you're caught, you restart the level.

**Status:** planning. Nothing is built yet. Decisions made so far are logged in §15.

**Platforms:** web (playable in a browser, for playtests) and Steam (Windows, macOS, Linux).
**Length:** 15–20 hours for the story, NightClaw Challenge included.

---

## 1. Pillars

1. **Think, then move.** Every turn is a small puzzle: guard routes, camera sweeps, shadows, vents. You win
   by reading the level, not by reflexes.
2. **Grand nighttime spaces.** Every level is a showpiece: marble halls, moonlit skylights, glass display
   cases, gilded frames. You should want to steal everything you see.
3. **A greedy risk curve.** The safe route grabs a little. The best loot sits behind the best security.
   How much you take is up to you.
4. **A cartoon caper with style.** Animated cats, bulldog guards, rival thieves with personality, and a
   newspaper headline after every job.

## 2. Core loop

```
 Lair (plan) ──► Heist (sneak, steal, escape) ──► Newspaper (what the haul was worth)
   ▲                                                    │
   │                                                    ▼
 Spend Catnip: skills, stats, lair ◄── Black Market (sell loot) ◄── XP / level-ups
```

1. **Plan** at the lair. Choose a heist from the city map and read the intel your lair upgrades have
   revealed, including whether a rival is after the same centrepiece (§5.2).
2. **Heist.** Get in, steal as much as you dare, and reach an exit.
3. **Newspaper.** Leo leaves his calling card, and the next morning's paper spins in from the centre of the
   screen.
4. **Sell** the loot on the black market. Better prices come with your level.
5. **Spend** Catnip on attributes, skills and the lair, then pick the next job.

## 3. Camera, grid and turns

### 3.1 Presentation

- **2D isometric** tiles. Hand-painted art, with walls drawn as separate pieces so they can be cut away.
- **Rotating camera** in 90° steps (Q/E or on-screen buttons) with a quick animated turn. All four views
  are drawn from the same tile data. Walls between the camera and Leo turn see-through or cut down to
  stubs, as in XCOM.
- **Floors:** levels can have several storeys plus a separate **vent layer**. You switch the visible floor
  with Page Up/Down or on-screen buttons. The vent layer draws as a blueprint-style overlay on top of the
  dimmed floor.
- **Night lighting:** dark-blue ambient light, warm pools from lamps, cool moonbeams through skylights,
  sweeping torch and camera cones. Light isn't only decoration: it feeds straight into detection (§4).

### 3.2 Turns and actions (XCOM-style)

- Leo gets **2 Action Points (AP)** per turn.
  - **Move:** spend 1 AP to walk up to *Move* tiles (blue zone), or 2 AP to dash up to double that (yellow
    zone). Dashing is noisy.
  - **Interact** (1 AP): pick a lock, open a case, disable a device, climb into or out of a vent, hide in a
    container, pick up loot.
  - Some skills are **free actions** or cost a set amount of AP (§7).
- When you hover a tile, the game shows the path, the AP it costs, how lit and how noisy the destination
  is, and which guards or cameras could see it. **No hidden information about what you can already see.**
- **Enemy turn:** guards, cameras and timed traps act in a fixed, readable order, animated quickly with an
  option to skip.
- **Overwatch-style stealth:** guard sight is checked *during* their move as well as at the end, so a
  guard who walks past an open doorway sees through it.
- **Undo:** one undo per turn for a move that hasn't revealed anything new (an XCOM-like safety net).
  Available on Casual and Professional only.

## 4. Stealth and detection

### 4.1 What gives Leo away

| Factor | Effect |
| --- | --- |
| **Sight** | Guards have a vision cone: 90°, 6 tiles; shorter in darkness, longer under bright light. Cameras have a fixed or sweeping cone. |
| **Light** | Each tile is **Dark / Dim / Lit**. In a Dark tile Leo is invisible beyond 2 tiles; Dim halves sight range; Lit means full range. |
| **Noise** | Each action makes noise in a radius: walk 1, dash 3, failed lock pick 2, broken glass 5. Guards inside the radius turn and investigate. Floor type adds to it (marble louder, carpet quieter). |
| **Disturbances** | Guards notice an empty plinth, an open case or a disabled camera on their route and raise suspicion. |

### 4.2 Guard alert states

`Patrol → Suspicious (?) → Searching (!) → Caught`

- **Patrol:** walks a set route. Routes are visible if the lair's Intel is high enough, or once you've
  watched them for a turn.
- **Suspicious:** walks to the last noise or sighting and looks around for 2 turns, then goes back to the
  route.
- **Searching:** moves faster and checks nearby hiding spots. Other guards nearby join in. Cameras raise
  their sensitivity.
- **Caught:** a guard ends a move next to Leo while he's seen, or a full alarm runs out its countdown.
  Then the level restarts (§4.4).
- **Being seen** isn't instant failure. A sighting fills a **detection meter** over the guard's head:
  partial in Dim light, faster in Lit. If the meter fills, Leo is caught; if Leo breaks line of sight
  first, the guard drops to Searching.

### 4.3 Guards are bulldogs

The bulldogs come in several types, each with a clear silhouette and behaviour:

| Type | Behaviour |
| --- | --- |
| **Night Watch Bulldog** | Standard patrol, torch cone. |
| **Sleepy Bulldog** | Stationary and dozing; wakes to noise. Snores, so you can hear him in the dark. |
| **Sniffer Bulldog** | Short sight, but smells Leo through walls within 2 tiles (scent trail). Vents block scent. |
| **Captain Bulldog** | Longer sight, and calls the other guards when Searching. |
| **Robo-Bulldog** (late game) | Doesn't sleep or get distracted; scans for heat. Can be powered down at a fuse box. |

Distractions work on bulldogs: a thrown bottle cap, a squeaky toy, a fake treat. Each guard type reacts
differently.

### 4.4 Getting caught

- Caught means **restart the level**. There's a short comic "busted" sting first (the bulldog grins, Leo
  sighs).
- **Checkpoints:** on the two easier difficulties (Casual and Professional) every level has **one
  checkpoint**. It's a fixed, authored spot about halfway through, usually just before the room with the
  centrepiece, marked on the map by a chalk paw print. Reaching it saves Leo's position, the loot he's
  carrying and the state of the level. Being caught after that restarts from the checkpoint instead of
  the entrance. Mastermind and Legendary have no checkpoints.
- Without a checkpoint, anything stolen on a failed attempt is lost. What carries over is your *knowledge*
  of the level.

## 5. Security measures

| Measure | Counter |
| --- | --- |
| **Security camera** (fixed / sweeping / motion-triggered) | Stay outside the cone, shut it off at the control room, put a loop on its feed (skill), or time your moves to its sweep. |
| **Laser grid** (static / pulsing / moving) | Time your moves, jump through a gap (skill), or cut it at a fuse box. |
| **Pressure plates** | Seen with Intel or Keen Eye; step over them or jam them. |
| **Motion sensors** | Move only 1 tile per turn while inside their zone, or move during the Slow Steps skill. |
| **Locked doors / display cases / safes** | Lockpicking with a tiered difficulty, keycards found on the map, glass cutter (skill), safe-cracking minigame. |
| **Alarm panels** | Once an alarm trips, a countdown runs until the level locks down. Disarm the panel or escape before it ends. |
| **Spotlights and searchlights** | Moving light sources that sweep areas on a timer. |
| **Guard dogs' kennels / bells / squeaky floorboards** | Noise traps. |
| **Vault doors** (late game) | Several steps: a code found somewhere in the level plus timed dials. |

### 5.1 Air ducts

- Each level has a **vent network** on its own layer, with grates in rooms and corridors.
- In a vent Leo **can't be seen by guards or cameras**, but movement costs more (crawling) and vents can
  be noisy (metal). Some vents have fans to stop at a switch, lasers, or dead ends.
- Vents are the main **alternate routes**. Every objective should have at least one route through the
  vents and one on the floor.

### 5.2 Rival thieves (only when they want the same prize)

Rivals are **not** on every level. A rival turns up only when they are **planning to steal the same
centrepiece as Leo** that night. They don't fight Leo; it's a race for the prize.

**When a rival appears**

- When a heist becomes available, the game rolls once to decide whether a rival is after its
  centrepiece. The chance starts at 0% for the first three heists after the tutorial, then about 20%,
  rising to about 35% in the later districts. One rival at most per heist, never the same one twice in a
  row.
- The result is fixed until that heist is played, so reloading doesn't reroll it.
- **Warnings at the lair:** the Rumour Board (part of the Planning Table) shows a rival's calling card
  pinned to the heist, *"Word is Luna Luck has her eye on the Star of Siam."* Planning Table tier 2 also
  shows which entrance the rival will use and when they arrive (for example, turn 6).
- Rivals never appear in the tutorial, the challenge museum or NightClaw's Lair.

**How the race works**

- The rival enters on a set turn and follows their own route toward the centrepiece, taking turns after
  the guards. The rival's path and their progress toward the prize are shown on screen.
- Rivals are subject to the guards too: a bulldog who spots a rival raises the alert, which can work for
  or against Leo.
- **If Leo takes the centrepiece first**, the rival flees with a parting line, and the newspaper reports
  that Leo beat them to it.
- **If the rival takes it first**, it's gone for that attempt. Leo can still steal the rest and leave. The
  newspaper credits the rival with the centrepiece. The level is marked *"centrepiece lost to a rival"*,
  the rival won't come back for it, and Leo can replay the level to steal it himself.
- Losing to a rival **never blocks the NightClaw Challenge**: the challenge only asks that Leo has stolen
  each centrepiece at some point.

| Rival | How they race |
| --- | --- |
| **Mischief Mittens** | Chaotic. Sets off an alarm somewhere on purpose to pull guards away from her own route, which can help *or* ruin Leo. |
| **Luna Luck** | Fast and lucky. Takes the most direct route and dodges guards a little too easily. The hardest to beat to the prize. |
| **Sammy Swipes** | Pickpocket. Slower, but steals any keycard or tool Leo leaves lying on the way, sometimes the one Leo needed. |
| **Professor Paws** | Planner. Disables security along his route (handy if Leo follows him), but locks doors behind himself. |

Each rival has a short comic exchange the first time Leo meets them, a rivalry record (races won and
lost), and achievements for beating each one.

## 6. Loot, the black market and Catnip

- **Loot** ranges from small items on shelves (coins, figurines) to cased artefacts, paintings and the
  level's **centrepiece**, its most valuable and best-protected item. Each level has **6–12 stealable
  pieces**.
- Loot has **weight**. Leo's Carry capacity limits how much he can take at once. Some levels have **stash
  points** (a window ledge, an accomplice's drop chute) for a second run.
- **Selling:** after a heist the loot goes to your inventory. At the black market:
  - Each item has a **base value**. The fence's price is `base × (0.55 + 0.02 × level, capped at 0.95) ×
    market demand`.
  - **Demand** rotates per category (paintings, jewels, artefacts, curiosities): "This week's buyers want
    jewels, +25%".
  - Higher levels unlock **better fences** and special buyers (a collector who pays ×1.5 for one listed
    item).
  - You can **hold** items for a better market, or sell straight away.
- **Catnip** is the only currency. It's spent on attributes, skills and the lair.
- **Replays:** any finished level can be replayed. Its loot is back on display, but sells for **50% of
  its value** after the first clear (the fences say it's "hot"). The centrepiece does count toward the
  NightClaw Challenge on a replay. This lets players earn Catnip by replaying without making the economy
  trivial.

## 7. Progression

### 7.1 Experience and levels

- XP for a successful heist: base by heist + bonuses for stealth (never seen, no alarms), loot value, the
  centrepiece, speed (turn count) and difficulty multiplier.
- **Level cap 30.** Each level gives +1 attribute point and improves black-market prices. Some skills and
  levels need a minimum player level.

### 7.2 Attributes (bought with attribute points and Catnip)

| Attribute | Effect |
| --- | --- |
| **Agility** | Move range per AP, climbing, vent crawl speed. |
| **Stealth** | Smaller sight profile, slower detection meter fill. |
| **Quiet Paws** | Less noise from every action. |
| **Dexterity** | Lockpicking and safe-cracking difficulty, interact AP refunds. |
| **Carry** | Loot weight capacity. |
| **Perception** | Spots traps and pressure plates, longer hover preview of guard routes. |

### 7.3 Skills (Catnip + level requirement)

Three trees, roughly 8 skills each, with prerequisites inside each tree:

- **Shadow:** *Blend* (Dim counts as Dark), *Ghost Step* (one move per level makes no noise),
  *Decoy Card* (drop a calling card that distracts), *Smoke Pellet* (lvl 12: blocks sight for 2 turns),
  *Vanish* (lvl 20: break detection once per heist).
- **Tech:** *Camera Loop* (loop a camera for 3 turns), *Laser Mirror*, *Keycard Clone*, *Fuse Kit*,
  *EMP Collar* (lvl 18: disables every device in a radius for 1 turn).
- **Acrobat:** *Pounce* (jump 2 tiles), *Ceiling Climb* (crawl along rafters as a second route),
  *Tightrope* (cross gaps), *Cat Nap* (lvl 15: wait out a guard's whole route while hidden), *Nine Lives*
  (lvl 25: survive being caught once per heist; not on Legendary).

## 8. The lair

- After the tutorial, Leo buys an **abandoned building** for his lair. It starts run-down, and each upgrade
  visibly improves it (windows, lights, furniture, a neon sign).
- **Buying the first lair unlocks the black market**, which runs out of the lair's back room.
- Upgrade rooms (each with 3 tiers):

| Room | Effect |
| --- | --- |
| **Planning Table** (Intel) | Before a heist, see more: tier 1 shows the floor plan, exits and the Rumour Board (which rival, if any, is after the centrepiece); tier 2 camera positions and cones, plus the rival's entrance and arrival turn; tier 3 guard routes and trap locations. |
| **Workshop** | Gadget charges per heist (bottle caps, smoke pellets). |
| **Fence's Office** | Better black-market prices; a second buyer. |
| **Gym / Scratching Tower** | Cheaper attribute upgrades. |
| **Trophy Room** | Displays every centrepiece you've stolen (a collection to fill in); small bonus to fame. |
| **Mailbox** | Where NightClaw's letters arrive (purely story). |

## 9. Story

### 9.1 Opening

1. **Tutorial heist** (Level 0: *The Corner Gallery*). A narrator voice walks through movement, AP,
   light and shadow, noise, a single camera, one vent, one locked case and stealing an item, in short,
   skippable steps (§10).
2. After the heist, the **narrator buys the tutorial loot** himself to give Leo his first Catnip. He says
   Leo needs a headquarters, and the **city map** opens with an abandoned building flashing.
3. The player **clicks the building to buy it** for exactly the starting Catnip. It's run-down; upgrades
   cost more.
4. Buying the lair unlocks the black market, skills, attributes and the heist list. From here the game is
   free-form.

### 9.2 NightClaw's letters

Two triggers, handled **in whichever order they happen**:

- **Trigger A:** 10 successful heists completed.
- **Trigger B:** 10,000 Catnip of items sold on the black market (lifetime total).

| Order | Letter |
| --- | --- |
| **First trigger reached** | **Letter 1, "A fan":** "I've been watching your work, and I'm becoming a fan of it." Signed **— NC**. |
| **Second trigger reached** | **Letter 2, "A challenge":** NC challenges Leo to steal a named item from a highly secure museum, and that heist unlocks. |

So if Leo hits 10,000 Catnip sold before his 10th heist, the 10,000-Catnip moment brings Letter 1 and the
10th heist brings Letter 2. Letter 2 always waits for the second trigger, whichever it is.

Then the story runs in order:

1. **Letter 3, hidden inside the challenge item:** NC reveals that he *is* the legendary NightClaw and
   has been searching a long time for his equal. He sets **the NightClaw Challenge**:
   - Finish **every level** (25 at launch).
   - Steal each level's **centrepiece**.
   - On Mastermind and Legendary, every centrepiece has to be stolen in a **flawless** heist: never
     detected, no alarms and no checkpoint used. A centrepiece stolen in a messy heist still counts for
     the level, but that level has to be replayed flawlessly to tick it off the challenge.
2. When the challenge is done, **Letter 4** arrives at the lair: an invitation to NightClaw's secret lair for a final
   test, to steal his *prized possession*. The letter doesn't say what it is.
3. **NightClaw's Lair** appears on the city map as a new location. It's the hardest level in the game,
   with a mix of every security system seen so far, plus a NightClaw who stalks the level himself.
4. **Ending:** steal the prized possession (**the collar NightClaw wore as a pet**, revealed only when
   picked up) *and* sneak up on NightClaw undetected. NightClaw names Leo **Legendary** and retires in
   peace, now that the city has a new best thief.
5. **After the credits:** free play continues. A newspaper headline: "NIGHTCLAW'S SUCCESSOR?"

### 9.3 Calling card and newspaper

- At the end of every successful heist, Leo **automatically leaves his calling card** at the scene, a
  short animated beat at the exit, so the paper credits him.
- Then a **newspaper spirals in** from the centre of the screen (the classic spinning-paper shot):
  - A headline written for the heist and how it went ("TUXEDO CAT STRIKES AGAIN, MUSEUM LEFT WITHOUT ITS
    EMERALD").
  - **Photos of the empty displays** for each stolen item, with captions.
  - An **estimated value** for each item and for the whole haul. This is where the player sees what the
    haul was worth before selling.
  - Side stories: rival thieves' antics, police quotes, NightClaw rumours, ads.
- An archive of past front pages is kept at the lair.

## 10. Tutorial (Level 0)

Short, clear prompts that each wait for the player to do the thing:

1. **Move:** click a blue tile. "Each turn you have 2 action points."
2. **Dash:** yellow tiles; it's noisy.
3. **Camera:** rotate the view with Q/E. Walls cut away.
4. **Light:** hide in a shadow while a guard walks by. Explains the Dark / Dim / Lit icon.
5. **Noise:** a squeaky floorboard turns a guard to Suspicious. Wait until he gives up.
6. **Cameras:** time a move between sweeps.
7. **Vents:** climb in, crawl past a laser hallway, climb out.
8. **Lockpicking:** open a display case (spends 1 AP).
9. **Loot and weight:** pick two small items and the tutorial centrepiece.
10. **Escape:** reach the exit, the calling card is left, and the first newspaper appears.

Each step can be repeated, and a "Tutorial hints" setting stays on for the first few heists.

## 11. Levels

- **25 levels at launch** in five districts of 5, plus the NightClaw challenge museum and NightClaw's Lair.
- Every level is **at night** and **grand**: high ceilings, chandeliers, display halls, gardens, roofs.
- Each level has **6–12 pieces of loot**, a **centrepiece**, **2+ entry points**, **2+ exits**, a **vent
  network** and at least one **optional room** with a secret (a safe, a hidden gallery).
- **Difficulty is chosen once, when starting a new game**, and applies to every level in that save:
  *Casual / Professional / Mastermind / Legendary*. It can't be changed later, so it is shown clearly on
  the new-game screen. Each save keeps its own difficulty.

| | Casual | Professional | Mastermind | Legendary |
| --- | --- | --- | --- | --- |
| Security | Base layout | + guards and cameras | + more guards, cameras covering vent exits, traps | Everything, tighter timings |
| Checkpoint per level | Yes | Yes | No | No |
| Undo per turn | Yes | Yes | No | No |
| NightClaw Challenge | Steal every centrepiece | Steal every centrepiece | Steal every centrepiece flawlessly | Steal every centrepiece flawlessly |
| Loot value and XP | ×1 | ×1.4 | ×1.9 | ×2.5 |

  The extra guards, cameras and traps on harder difficulties are **placed by hand per level**, not at
  random, so every difficulty still reads fairly.

| District | Levels (working names) |
| --- | --- |
| **Old Town** | Corner Gallery (tutorial), Cobblestone Coin Museum, The Clocktower Archive, Pawnbroker Penthouse, Opera House Costume Vault |
| **Museum Mile** | Natural History (dinosaur hall), Egyptian Wing, Modern Art Atrium, Gem & Mineral Hall, The Planetarium |
| **The Heights** | Millionaire's Mansion, Sky Garden Hotel, Glass Tower Auction, The Yacht Club, The Observatory Estate |
| **Harbour** | Customs Warehouse, The Lighthouse Collection, Shipwreck Museum, Fish Market Bank (cat joke), The Aquarium Gala |
| **Downtown** | The Grand Bank, Casino Royale-Paws, The Mint, The Museum of Modern Mischief, City Hall Treasury |
| **Special** | NightClaw's challenge museum (*The Midnight Museum*), NightClaw's Lair |

A level-design checklist for each map: readable sight lines, at least three valid routes to the
centrepiece (floor, vents, high road), a "tempting greedy detour", a lit hall that has to be crossed or
avoided, and an escape that changes once an alarm trips.

## 12. Art and audio direction

- **Art:** expressive 2D cartoon (a mix of Disney-era noir and *Sly Cooper*). Leo has a crisp tux, bow tie
  and swagger; a 4-direction rig to match the four camera angles. Bulldogs are chunky, sleepy and
  menacing in turn.
  - Nighttime palette: indigo shadows, moonlight cyan, warm gold lamplight, ruby and emerald gem glints.
  - Displays get small shine animations; stolen items leave an obvious empty plinth.
- **UI:** an Art Deco heist-poster look, with a "case file" for planning.

### 12.1 Generated sprites: what to produce

Sprites will be generated. To make them fit together in game, every sprite should follow these rules:

- **Projection:** 2:1 isometric (the standard pixel-art "isometric" angle). Floor tiles are diamonds
  **128 × 64 px**; a full-height wall piece is 128 × 192 px. Characters stand about 96 px tall, on a
  canvas of **128 × 128 px** with the feet at the bottom centre.
- **Format:** PNG with a transparent background, no drop shadows baked in (the game draws its own), lit
  from the top left with a neutral night tone. The game adds the moonlight and lamplight on top.
- **Four views:** because the camera rotates, characters need **4 facing directions** (north-east,
  south-east, south-west, north-west). Walls and large props need **2 versions** (left-facing and
  right-facing); symmetrical props need 1.
- **Consistent style:** use one shared style prompt for everything (for example *"2D cartoon, clean
  ink outlines, flat cel shading, film-noir night palette, Sly Cooper meets 1960s Disney"*) plus a
  reference sheet of Leo, so the cats stay on model.

| Group | Sprites | Animations (frames, at 12 fps) |
| --- | --- | --- |
| **Leo Tuxedo** | 4 directions | idle 6, walk 8, sneak 8, dash 6, crawl (vent) 8, pick lock 6, grab loot 6, hide 4, leave calling card 10, caught 8, victory pose 10 |
| **Bulldog guards** (5 types) | 4 directions each | idle 6, walk 8, look around 8, suspicious "?" 4, alert "!" 4, run 6, sleep (Sleepy) 6, sniff (Sniffer) 6, catch 8 |
| **Rivals** (4) | 4 directions each | idle 6, walk 8, sneak 8, grab 6, flee 6, taunt 8 |
| **NightClaw** | 4 directions | idle 6, stalk 8, turn 4, reveal pose 10, retire 10 |
| **Narrator** | portrait | 3 expressions for the tutorial and the opening |
| **Tiles** | per district | 6–8 floor types (marble, parquet, carpet, tile, stone, metal grate), wall sets with doors, windows, archways and vent grates |
| **Props** | ~150 | display cases (open, closed, empty), plinths, paintings in frames, chandeliers, statues, desks, crates, plants |
| **Loot** | ~120 | an icon (64 × 64) plus an in-world sprite for every item, and a newspaper photo of each empty display |
| **Security devices** | 4 directions where they turn | cameras, laser emitters, pressure plates, alarm panels, fuse boxes, vault doors |
| **Screens** | painted | the city map (day and night), the lair at each of its upgrade stages, the newspaper template, NightClaw's letters, ending art |

All files are named `group_name_direction_animation_frame.png` (for example `leo_se_walk_03.png`) and
stored in `purrrfect-crime/art/`. A build script packs them into sprite sheets.
- **Audio:** sneaky jazz (upright bass, brushed drums) that adds layers as suspicion rises, and switches to
  a big-band chase stinger when an alarm trips. Footstep sounds change with the floor type; bulldog snores
  and grumbles; the newspaper's spinning-press whoosh.

## 13. Tech plan

- **Stack:** TypeScript + PixiJS 8, matching the repo's other games. **Two builds from one codebase:**
  - **Web:** a static build served on the repo's GitHub Pages site at `/purrrfect-crime/`, saving to the
    browser. This is the playtesting build. Generated sprites are packed into compressed atlases so it
    loads quickly.
  - **Steam:** the same build wrapped in Electron, with Steam achievements and cloud saves.
  - Mouse and keyboard first, with touch for tablets in the web build and controller support later.
- **Isometric renderer** with four rotation states. Tiles, walls and props are sorted per rotation, walls
  are cut away by occluding Leo, and floors and the vent layer draw as layers.
- **Pure game-logic core** (no rendering): grid, AP, pathfinding (A* on tiles with move costs), sight
  (shadowcasting with cones), light map, noise propagation, guard AI state machines, enemy turn scheduler,
  undo stack. Everything is deterministic and seeded, so it can be unit-tested.
- **Data-driven levels:** a JSON level format with tiles, walls, vents, lights, guards and their routes,
  devices, loot and per-difficulty overlays. A **simple in-game level editor** (developer build) to author
  the 25 maps quickly.
- **Save system:** profile (level, XP, Catnip, skills, lair, story flags, letter order, challenge
  progress), plus a separate per-level best record.
- **Testing:**
  - Unit tests for sight, noise, pathfinding and AI.
  - A **solver bot** that proves every level can be finished at every difficulty tier, by searching
    through guard timings.
  - Story-trigger tests for both letter orders.

## 14. Milestones

| # | Milestone | Contents |
| --- | --- | --- |
| **M0** | Grey-box prototype | One flat test map, iso grid, 4-way rotation, AP movement, one guard with sight and patrol, caught = restart. Proves the core turn loop is fun. |
| **M1** | Stealth sandbox | Light map, noise, alert states, cameras, lasers, vents, lockpicking, loot and carry weight, escape. |
| **M2** | Vertical slice | Tutorial level with final art direction, narrator, calling card + newspaper, black market, Catnip, XP, the lair purchase. |
| **M3** | Progression | Attributes, all three skill trees, lair upgrades and the Intel reveal, difficulty tiers, saves. |
| **M4** | Content | Levels 1–25, rivals, bulldog types, letters 1–2 and the challenge museum. |
| **M5** | Endgame | NightClaw Challenge tracking, Letter 4, NightClaw's Lair, ending, credits, post-game. |
| **M6** | Ship | Steam (achievements, cloud saves), settings, accessibility, balance pass with the solver bot, polish. |

The web build goes live from M0 onward, so every milestone can be playtested from a link.

**Length budget (15–20 hours):**

| Part | Hours |
| --- | --- |
| Tutorial, opening, lair | 0.5 |
| First pass through the 25 levels (about 25–30 minutes each, including restarts) | 11–12 |
| Replays for loot, centrepieces lost to rivals, skill grinding | 2–4 |
| NightClaw Challenge clean-up (flawless replays on harder difficulties) | 1–2 |
| Challenge museum and NightClaw's Lair | 1–1.5 |

## 15. Decisions log

| # | Question | Decision |
| --- | --- | --- |
| 1 | Art pipeline | **Generated sprites**, following the spec in §12.1. |
| 2 | Difficulty | **Chosen once for the whole game** when starting a new save (§11). |
| 3 | Checkpoints | **One checkpoint per level on the easier difficulties** (Casual and Professional); none on Mastermind or Legendary (§4.4). |
| 4 | Rivals | **Only appear when they're after the same centrepiece** as Leo, warned about at the lair. Losing a race never blocks the NightClaw Challenge (§5.2). |
| 5 | Replays | **Yes**, loot is back on display at 50% value after the first clear (§6). |
| 6 | Platforms | **Both** a web build and a Steam build (§13). |
| 7 | Length | **15–20 hours** (§14). |
