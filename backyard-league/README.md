# ⚽ Recess Rivals (working title)

A hand-drawn 2D cartoon life sim and sports team management game, seen from a 3/4 top-down view. You're a 3rd grader starting a sports team: you recruit kids from around town, earn money for shirts and the league fee, keep your grades up, and take a backyard team all the way to the championship.

The full design is in [`GAME_DESIGN.md`](GAME_DESIGN.md). This folder holds a **playable build** of it.

## Play it

A hosted build is at **https://claude.ai/artifact/91GKDai5uH5ttdYFT7dinr** (private until shared from the page's Share menu). It is the same single file as `dist/index.html`. Saves stay in your browser.

## Run it

```bash
cd backyard-league
npm install
npm run build          # -> dist/index.html (one self-contained file, works offline)
open dist/index.html   # or: npm run dev (serves it on localhost:8090)
npm run electron       # desktop window (the Steam build)
npm test               # simulation unit tests
node tests/e2e.mjs     # browser playthroughs (also e2e-jobs.mjs, e2e-input.mjs for touch + controller)
```

**Controls** (it plays with any of these, and switches as soon as you use one):
- **Keyboard & mouse:** WASD or arrows to walk (Shift to run), or click the ground to walk there (click a kid, door or counter to walk over and use it). **E** to talk and interact. **M** for the town map. **Tab** for your phone (a home screen of apps: Team, League, Social, Bank, School, Maps and more). **I** opens your backpack. **Z** passes time, including skipping to your next game. Drag the mouse or use Q/R to turn the camera, and the mouse wheel to zoom. **Esc** closes windows.
- **Touch (phones & tablets):** drag anywhere on the left side for a thumbstick (push it to the edge to run), tap the ✋ button to talk or interact, drag the right side to look around, tap the ground to walk there, pinch to zoom. The paper route gets big throw buttons. Settings → Controls can force touch controls on or off.
- **Controller:** left stick to walk (RT to run), right stick for the camera, **A** talk / select, **B** back, **X** clutch moments, **Y** map, **Start** phone, **LB/RB** turn the camera, switch phone apps and throw papers. Every menu works with the d-pad: it moves a highlight and A presses it.

## What's in this build

**The town and its kids**
- **216 unique kids** generated from `data/kids.json`, the same in every playthrough. Each one has their own name, look (skin, hair style and color, eyes, build, height, accessories), home address, siblings, personality, traits, likes, 14 stats, a growth curve, and a full weekday and weekend routine.
- **Every kid can be talked to.** Chatting raises friendship and reveals one fact about their routine. Gifts matter: they love items tied to what they like. You can also play minigames with them, invite them to tryouts, ask "what would it take?" (each kid has their own condition), do favors, hire them as staff, or tutor them.
- **Kids are where their routine says they are.** Each grade is split into two class sections that move together from room to room. During class kids sit at their desks, between classes they crowd the hallway by their next door, at recess they're at their favorite playground spot, lunch is in the cafeteria, after school they go to the mall, library, museum, grocery store or their own front yard, and weekends have their own spots. Private-school and homeschooled kids can only be found outside school. The map shows which kids you know should be at each place right now.

**Places** (pick a destination on the map, then explore it)
- **Your house:** seen from outside, it's a roofed house. Step inside and the roof lifts off and the walls drop, Sims-style. Inside are Mom & Dad (ask for money, do chores), your bed, your computer (team HQ, homework), the garage, a basement trophy shelf, and the backyard field.
- **6 neighborhoods**, each with its own style: houses for every kid's address, a cul-de-sac, a driveway hoop, a creek, lemonade stand spots, paper routes and mowing jobs.
- **School:** a main hallway lined with blue lockers, with a classroom for every subject at every grade. Each room has a chalkboard, a teacher's desk, a flag, subject posters and 24 desks facing the front. There's also a cafeteria, gym, library, band room, nurse, principal's office, detention, and a playground with swings, tetherball, four square, a kickball diamond and more.
- **Mall:** sporting goods, game shop, shoe store, dollar store, pet store, arcade with a claw machine, food court and fountain.
- **Library:** the league desk where you register, study tables, and a book sale cart.
- **Museum:** dinosaur hall with trivia, space wing, bug zoo and gift shop.
- **Grocery store:** checkout, bottle return (5¢ per can), free samples, and a bulletin board with jobs.

**School**
- **Four subjects: Math, Language Arts, Science and History**, each taught by its own teacher in its own room. Classes are at least 90% full: the same classmates move with you all day.
- **Passing periods:** when the bell rings you're out in the hallway with a countdown to reach your next room. Chat with kids on the way, but get there before the timer runs out or you're **tardy**. Walk into the right room and you sit down as the bell rings. Skip a class and you're **absent**, and the school calls home.
- Classes are seen from the back of the room, looking past the desks to the chalkboard. Only your room is drawn while you're inside it.
- **Class mode:** pay attention (quiz prep), **pass notes** seat to seat (kids can intercept them), whisper to the kids next to you, ask to **switch seats**, get a hall pass, or **sneak out** past the **hall monitor**.
- **Troublemakers dare you** to do things like a whoopee cushion on the teacher's chair or yelling "PIZZA PARTY!" in class. Get caught, or get **ratted out by kids who don't like you**, and you face consequences: your name on the board, losing recess, a note home, or the principal's office with detention and grounding.
- **Weekly Friday quizzes and pop quizzes** in math, language arts, science and history, matched to your grade level. Prep gives you hints and more time.
- **Grades gate your team.** Two weeks below a C- and you're **grounded from sports**: no practices or tryouts, and your games are forfeited. An F grounds you from everything.

**Money**
- Ask Mom & Dad (asking for too much backfires), do chores, pick up cans, find loose change, and do favors for kids.
- **Lemonade stand:** set the price and recipe. The stand faces the road, and customers walking the sidewalk step up to buy. Weather and price decide how many.
- **Paper route:** unlocks after you've earned $50, and you need to **buy a bike** ($45, which also makes travel faster). Every house on your street, at least 10, gets a paper. Ride and throw left and right at the porches. Hit a window and you pay for it.
- **Lawn mowing:** unlocks after you've earned $150. Push the mower over real grass, and nice stripes earn a tip.
- Home games earn admission and concessions money. In the backyard, Mom & Dad take 50%.

**Your team**
- Pick soccer, baseball, basketball or flag football. Each has its own roster minimum and startup costs.
- **Tryouts:** invited kids line up in your backyard. **Sprints is a real race** and reveals Speed. Buy equipment to unlock the other 13 drills, one per stat. Grades run from **A++ to F--**, shown as a range until you buy Laser Timing Gates.
- Roster, auto lineup (you always start), practice days and focus skill, and eligibility (age band and school grades).
- **Fields:** the backyard (free, tiny, parents take half), the school field (needs the principal's OK), or Old Town Park (needs a permit).
- **10 upgrade categories, each with 5 tiers, all visible on the field.** For example, goals go from crooked wooden frames with no nets to pro goals, lines from wobbly spray paint to a logo at midfield, and seating, scoreboard, announcer, concessions, benches, flags, uniforms and training each have their own tiers.
- **Team gear:** footwear (cleats, court shoes), balls and bats, gloves, and conditioning gear, each with 3 tiers named for your sport. Gear boosts the stats it fits (cleats add Speed and Agility, bats add Hand-Eye and Strength, and so on) for every kid on your roster.
- **Uniforms:** choose shorts or pants. Baseball and football default to pants with a team-color stripe.
- **Staff:** hire kids as announcer, ticket gate, assistant coach or scout. Grown-ups like Coach Dave at the mall and Mrs. Pham at the library cost more, and won't sign until your team is attractive enough.
- **Team attraction** combines roster, results, history, trophies *on display*, facilities, how much kids like you, fan buzz and coaching, minus any scandal penalty.

**The league**
- **One league per grade** (the Grade 3 League for third graders), with up to **8 teams** counting yours. Season stats (goals, assists, saves...), league leaders, team OVR ratings, and an MVP plus stat awards at season's end. The 10-week season is a round robin with no byes. **They sign free agents before each season**, competing with you for the same kids. Some kids are poachable, and some are loyal to their team.
- Preseason registration, then 8 Saturday games, then semifinals and a final. The game simulation is event-based for all four sports.
- **Game day:** both teams take the field in uniform with fans watching. Play-by-play commentary gets better as you upgrade your announcer, and the scoreboard updates live. **Clutch moments put you in control** with a timing minigame that decides the play.
- **Knowledge from past runs** (toggle on the new-game screen and in Settings): pick one of your saves to remember. The new run replaces that save, and you start knowing every kid you knew there (names, scouted stats, routines, likes, traits), though they don't know you. Social's 🧠 Scouted filter lists everyone you've scouted.
- **Phone calls:** every kid you meet gives you their number. Call them from Contacts, Calls or their Social profile.
- **Season sign-ups** after each Crest Cup: pick next season's sport (free) from the ones you haven't played this school year, then recruit a new team, or skip to next school year. Kid stat cards star the skills that matter in the current sport.
- Standings, schedule, a news feed, season history, **trophies you place on your shelf**, and a game ball for your first win.
- **The ringer scandal:** a shady kid offers to "fix" an older kid's paperwork. Every game they play risks getting caught, which brings forfeited wins, playing one kid short for the rest of the season, a **3-year playoff ban**, a fine and grounding. A second offense gets your team expelled.
- **Growing up:** every school year everyone moves up a grade. Stats follow each kid's growth curve (Phenom, Late Bloomer, Early Peaker, Dud, Morale Machine, and so on), kids get taller, and your team moves up to the next grade's league with your class.

**Presentation:** buildings show their full exterior and roof until you walk in. At school only the room you're in is drawn, against a dark backdrop. Doors swing open as you approach. Arriving at a location fades in with a broadcast-style banner. There are three graphics levels (Phone → Settings → Graphics), auto-picked for your GPU.

**Steam-ready:** an Electron shell with the steamworks.js bridge, 21 achievements (also in `steam/achievements.csv`), `steam/app_build.vdf`, autosave and save export/import.

## Not built yet (from the design doc)

- The **High School League**, school sanctioning and state eligibility rules.
- Facility tiers beyond the backyard and basement: offices, buying land, building a stadium.
- Running more than one sport's team at once.
- **Fully playable arcade sports.** Right now games are simulated and you control the clutch moments.
- Unique hand-written dialogue per kid, music, and voice acting. Dialogue is currently written per personality.
- Production art. Characters (painted faces, sculpted bodies, 30 hair styles grown from the head shape, real caps/beanies/bucket hats, 11 tops and 7 bottoms), buildings and props are all built procedurally in code. They use PBR materials with procedural textures, an HDR sky and environment lighting, soft shadows, ambient occlusion, bloom and color grading. A commercial release would swap in artist-modeled assets on top of the same data.
- Teen appearances change in height and proportions only. There are no new outfits yet.

## Engine note

The design doc recommends Unity. This build uses a **2D canvas renderer + Electron** instead, because it can be built and tested from this repository and it reuses the Steam pipeline French Fried already ships with. Maps are described as simple shapes that the renderer draws flat-shaded with ink outlines in the 3/4 view (cached in tiles); trees and bushes are painted 2D pieces, and every character is a sprite drawn from its character sheet (front and back views, walk cycle). All game rules are plain JavaScript in `src/game/`, separate from rendering, so they could be ported if you move engines.

## Layout

```
data/kids.json           216 kids (generated by tools/generate_kids.py, fixed seed)
src/data/                world data, dialogue, quiz banks
src/game/                simulation: time, routines, stats, social, economy, school, team, league, sim, clock
src/world2d/             2D engine, shape projector, painted props, sprites, fields, locations
src/ui/                  game controller, HUD, map, phone, talk, classroom, minigames, tryouts, matches, jobs
src/dev/                 dev-only pages for screenshots (gallery, scenes)
tests/logic.test.mjs     simulation unit tests (npm test)
tests/e2e*.mjs           headless-browser playthroughs that screenshot every screen
electron/, steam/        desktop shell and Steam upload config
```

End-to-end tests need Playwright: `PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node tests/e2e.mjs`.
