# ⚽ Backyard League

A 3D cartoon life sim and sports team management game. You're a 3rd grader starting a sports team: you recruit kids from around town, earn money for shirts and the league fee, keep your grades up, and take a backyard team all the way to the championship.

The full design is in [`GAME_DESIGN.md`](GAME_DESIGN.md). This folder holds a **playable build** of it.

## Run it

```bash
cd backyard-league
npm install
npm run build          # -> dist/index.html (one self-contained file, works offline)
open dist/index.html   # or: npm run dev (serves it on localhost:8090)
npm run electron       # desktop window (the Steam build)
npm test               # simulation unit tests
```

**Controls:** WASD or arrows to walk (Shift to run). **E** to talk and interact. **M** for the town map. **Tab** for your phone. Drag the mouse or use Q/R to turn the camera, and the mouse wheel to zoom. **Esc** closes windows.

## What's in this build

**The town and its kids**
- **216 unique kids** generated from `data/kids.json`, the same in every playthrough. Each one has their own name, look (skin, hair style and color, eyes, build, height, accessories), home address, siblings, personality, traits, likes, 14 stats, a growth curve, and a full weekday and weekend routine.
- **Every kid can be talked to.** Chatting raises friendship and reveals one fact about their routine. Gifts matter: they love items tied to what they like. You can also play minigames with them, invite them to tryouts, ask "what would it take?" (each kid has their own condition), do favors, hire them as staff, or tutor them.
- **Kids are where their routine says they are.** During class they sit at their desks, at recess they're at their favorite playground spot, B lunch is in the cafeteria, specials mix kids from different homerooms, after school they go to the mall, library, museum, grocery store or their own front yard, and weekends have their own spots. Private-school and homeschooled kids can only be found outside school. The map shows which kids you know should be at each place right now.

**Places** (pick a destination on the map, then explore it in 3D)
- **Your house:** a cutaway dollhouse with Mom & Dad (ask for money, do chores), your bed, your computer (team HQ, homework), the garage, a basement trophy shelf, and the backyard field.
- **6 neighborhoods**, each with its own style: houses for every kid's address, a cul-de-sac, a driveway hoop, a creek, lemonade stand spots, paper routes and mowing jobs.
- **School:** 12 homerooms, specials rooms, cafeteria, gym, nurse, principal's office, detention, and a playground with swings, tetherball, four square, a kickball diamond and more.
- **Mall:** sporting goods, game shop, shoe store, dollar store, pet store, arcade with a claw machine, food court and fountain.
- **Library:** the league desk where you register, study tables, and a book sale cart.
- **Museum:** dinosaur hall with trivia, space wing, bug zoo and gift shop.
- **Grocery store:** checkout, bottle return (5¢ per can), free samples, and a bulletin board with jobs.

**School**
- A real bell schedule. Be in your seat when the bell rings or you're **tardy**. Miss a class and you're **absent**, and the school calls home.
- **Class mode:** pay attention (quiz prep), **pass notes** seat to seat (kids can intercept them), whisper to the kids next to you, ask to **switch seats**, get a hall pass, or **sneak out** past the **hall monitor**.
- **Troublemakers dare you** to do things like a whoopee cushion on the teacher's chair or yelling "PIZZA PARTY!" in class. Get caught, or get **ratted out by kids who don't like you**, and you face consequences: your name on the board, losing recess, a note home, or the principal's office with detention and grounding.
- **Weekly Friday quizzes and pop quizzes** in math, reading, science, social studies and spelling, matched to your grade level. Prep gives you hints and more time.
- **Grades gate your team.** Two weeks below a C- and you're **grounded from sports**: no practices or tryouts, and your games are forfeited. An F grounds you from everything.

**Money**
- Ask Mom & Dad (asking for too much backfires), do chores, pick up cans, find loose change, and do favors for kids.
- **Lemonade stand:** set the price and recipe. Weather and customers walking by decide how much you sell.
- **Paper route:** unlocks after you've earned $50. Ride your bike and throw papers left and right at porches. Hit a window and you pay for it.
- **Lawn mowing:** unlocks after you've earned $150. Push the mower over real grass, and nice stripes earn a tip.
- Home games earn admission and concessions money. In the backyard, Mom & Dad take 50%.

**Your team**
- Pick soccer, baseball, basketball or flag football. Each has its own roster minimum and startup costs.
- **Tryouts:** invited kids line up in your backyard. **Sprints is a real 3D race** and reveals Speed. Buy equipment to unlock the other 13 drills, one per stat. Grades run from **A++ to F--**, shown as a range until you buy Laser Timing Gates.
- Roster, auto lineup (you always start), practice days and focus skill, and eligibility (age band and school grades).
- **Fields:** the backyard (free, tiny, parents take half), the school field (needs the principal's OK), or Old Town Park (needs a permit).
- **10 upgrade categories, each with 5 tiers, all visible in 3D.** For example, goals go from crooked wooden frames with no nets to pro goals, lines from wobbly spray paint to a logo at midfield, and seating, scoreboard, announcer, concessions, benches, flags, uniforms and training each have their own tiers.
- **Staff:** hire kids as announcer, ticket gate, assistant coach or scout. Grown-ups like Coach Dave at the mall and Mrs. Pham at the library cost more, and won't sign until your team is attractive enough.
- **Team attraction** combines roster, results, history, trophies *on display*, facilities, how much kids like you, fan buzz and coaching, minus any scandal penalty.

**The league**
- Each sport has 4 rival Jr League teams. **They sign free agents before each season**, competing with you for the same kids. Some kids are poachable, and some are loyal to their team.
- Preseason registration, then 8 Saturday games, then semifinals and a final. The game simulation is event-based for all four sports.
- **Game day in 3D:** both teams take the field in uniform with fans watching. Play-by-play commentary gets better as you upgrade your announcer, and the scoreboard updates live. **Clutch moments put you in control** with a timing minigame that decides the play.
- Standings, schedule, a news feed, season history, **trophies you place on your shelf**, and a game ball for your first win.
- **The ringer scandal:** a shady kid offers to "fix" an older kid's paperwork. Every game they play risks getting caught, which brings forfeited wins, playing one kid short for the rest of the season, a **3-year playoff ban**, a fine and grounding. A second offense gets your team expelled.
- **Growing up:** every school year everyone moves up a grade. Stats follow each kid's growth curve (Phenom, Late Bloomer, Early Peaker, Dud, Morale Machine, and so on), kids get taller, and at 6th grade you move up to the Middle League.

**Steam-ready:** an Electron shell with the steamworks.js bridge, 21 achievements (also in `steam/achievements.csv`), `steam/app_build.vdf`, autosave and save export/import.

## Not built yet (from the design doc)

- The **High School League**, school sanctioning and state eligibility rules.
- Facility tiers beyond the backyard and basement: offices, buying land, building a stadium.
- Running more than one sport's team at once.
- **Fully playable arcade sports.** Right now games are simulated and you control the clutch moments.
- Unique hand-written dialogue per kid, music, and voice acting. Dialogue is currently written per personality.
- Production art. All characters and props are built procedurally in code with toon shading. A commercial release would replace them with modeled and animated assets, using the same data.
- Teen appearances change in height and proportions only. There are no new outfits yet.

## Engine note

The design doc recommends Unity. This build uses **Three.js + Electron** instead, because it can be built and tested from this repository and it reuses the Steam pipeline French Fried already ships with. All game rules are plain JavaScript in `src/game/`, separate from rendering, so they could be ported if you move engines.

## Layout

```
data/kids.json           216 kids (generated by tools/generate_kids.py, fixed seed)
src/data/                world data, dialogue, quiz banks
src/game/                simulation: time, routines, stats, social, economy, school, team, league, sim, clock
src/world3d/             toon renderer, character builder, props, fields, locations, engine
src/ui/                  game controller, HUD, map, phone, talk, classroom, minigames, tryouts, matches, jobs
src/dev/                 dev-only pages for screenshots (gallery, scenes)
tests/logic.test.mjs     simulation unit tests (npm test)
tests/e2e*.mjs           headless-browser playthroughs that screenshot every screen
electron/, steam/        desktop shell and Steam upload config
```

End-to-end tests need Playwright: `PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node tests/e2e.mjs`.
