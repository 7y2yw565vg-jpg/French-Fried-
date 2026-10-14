# BACKYARD LEAGUE — Game Design Document (v0.2)

> **A playable build exists!** See `README.md` in this folder for what's implemented, how to run it, and what's next.

> *Working title. Alternates: "Lemonade to League", "Recess Moguls", "Kid Commissioner".*

**Platform:** Steam (Windows first; Steam Deck verified target; Mac/Linux later)
**Genre:** 3D open-world life sim + sports team management
**Art style:** Stylized cartoon, high fidelity (Pixar / *Fortnite* / *Sackboy* territory: soft lighting, chunky proportions, expressive faces)
**Rating target:** ESRB E10+ / PEGI 7. Mischief is cartoony and always has consequences.
**Player fantasy:** *"I'm 8 years old and I'm building a sports dynasty out of my parents' backyard."*

---

## 1. Design Pillars

1. **Every kid is a real person.** All 216+ kids are hand-defined, have fixed stats, homes, routines, personalities and friendships, and are the same in every playthrough. Knowing the world is a skill: veterans *know* that Atticus Ramirez is a phenom who eats lunch at 11:30.
2. **Hustle from nothing.** You start with $0, a crooked wooden goal and a parent who says "we'll see." Every upgrade is earned.
3. **School is the clock and the cage.** The school day is when you meet the most kids, and also where you can lose everything if your grades slip.
4. **Scheme with consequences.** Passing notes, sneaking out, bribing classmates and fudging paperwork are all on the table. Getting caught always costs something real.
5. **Kids grow up.** Your 3rd grade crew becomes a high school program, and the kids change in looks, ability and attitude along the way.

---

## 2. Core Loops

| Loop | Length | What happens |
|---|---|---|
| **Moment** | seconds | Talk to a kid, pass a note, sell a lemonade, take a quiz question |
| **Day** | ~20–25 real minutes | Before school → classes and halls → recess/lunch → after school (jobs, recruiting, practice) → evening (homework, asking parents, planning) |
| **Week** | ~2 hrs | Weekday school + jobs, Friday quiz, Saturday game day, Sunday free day / events |
| **Season** | ~10 in-game weeks | Tryouts → regular season (8 games) → playoffs → awards → offseason (upgrades, recruiting, aging) |
| **Run** | 3rd grade → 12th grade | 10 school years, 3 leagues, facility progression from backyard to stadium |

### Calendar
- **School year** = 3 sports seasons + summer.
  - **Fall:** Soccer & Football
  - **Winter:** Basketball
  - **Spring:** Baseball
  - **Summer:** No school. Jobs pay more, camps, tournaments, construction projects, big recruiting window.
- Time only moves while you're inside a location (like *Stardew Valley*). The map screen pauses the clock. Travelling costs time based on distance and vehicle (walk → bike → scooter → parent ride → older sibling's car → your own car at 16).

---

## 3. Getting Started (first ~2 hours)

1. **Character creator:** name, look, pronouns, home neighborhood (affects starting neighbors), and one **starting perk**:
   - *Smooth Talker* (+Charisma), *Teacher's Kid* (+grades, −street cred), *Big Family* (more allowance asks, less backyard space), *Born Hustler* (+job pay), *Gym Rat* (you're a better player yourself).
2. **Pick your first sport:** Soccer, Baseball, Basketball or Football (flag football in the Jr League).
3. **Tutorial day:** Mom & Dad, your bedroom, the backyard, walking to school, meeting your homeroom.
4. **Goal card ("Start a Team!")** stays pinned until it's done:

| Requirement | Soccer (7v7) | Baseball | Basketball (5v5) | Flag Football (7v7) |
|---|---|---|---|---|
| Min roster to enter league | 7 (you count) | 9 | 5 | 7 |
| Recommended roster | 10 | 12 | 8 | 10 |
| Basic shirts ($6 each) | $60 | $72 | $48 | $60 |
| League entry fee | $40 | $50 | $30 | $40 |
| Field setup minimum | 2 goals (wood) | bases + backstop (cardboard) | 1 hoop (driveway) | cones + flags |
| Setup cost | $15 | $20 | $0 (already in driveway) | $12 |
| **Total to launch** | **~$115** | **~$142** | **~$78** | **~$112** |

Basketball is the easy start, Baseball the hard one. Each sport's achievements and commentary packs encourage replays with all four.

---

## 4. World & Locations

**Grubbsville**, a sunny suburban town. The **town map** has clickable destinations. Inside each one you get a fully 3D open area to walk around, with every kid interactable.

| Location | 3D Zones | What it's for |
|---|---|---|
| **Your House** | bedroom (planning desk, computer), kitchen (parents), garage (equipment), backyard (field #1), basement (trophy room v1) | Asking for money, homework, managing the team, home games early on |
| **Neighborhoods** (6) | Maple Hollow, Sunnyside Acres, Pickle Creek, Oakridge Heights (rich), Riverside Apartments, Old Town | Kids' homes, lawns to mow, paper route houses, cul-de-sac pickup games, meeting parents |
| **School** | Grubbsville Elementary → Grubbsville Middle → (High School) | Classes, halls, cafeteria, playground, gym, nurse, principal's office |
| **Mall** | arcade, food court, shoe store, sporting goods, pet store, fountain, game shop | Buying equipment & uniforms, meeting private-school kids, coin fountain (rare $) |
| **Library** | kids' corner, computer row, reading nook, homework tables | Studying (+quiz prep), meeting bookworms, unlocking drill/playbook books |
| **Museum** | dinosaur hall, space wing, bug zoo, gift shop | Field trips, weekend events, trivia-based recruiting, rare collectibles |
| **Grocery Store** | candy aisle, bottle return, free samples, cereal aisle, parking lot | Lemonade ingredients, can/bottle recycling, concession stock, community bulletin board (job listings) |
| *Unlockable:* Town Park, Rec Center, Sporting Goods Warehouse, City Hall (permits), Lumber Yard (field building) | | Later-game facilities and permits |

### Finding kids
- Every kid follows a **routine** (see `data/kids.json`): homeroom, lunch period, recess spot, specials, after-school spot per weekday, weekend spots.
- **Kid Notebook** (your in-game journal) fills in automatically as you learn things. "Talked to Nina, she said she's always at the arcade on Thursdays." Unknown routine slots show as **"???"**.
- **Private-school & homeschooled kids** (~25% of the roster) are *never* at your school. You must find them at the mall, library, museum, grocery store or in their neighborhood.
- **Rumor system:** chatty kids (Gossip trait) reveal other kids' whereabouts: "I heard a kid at Pickle Creek can throw a football over a house!"

---

## 5. School

### The school day
Every grade has four core teachers: **Math, Language Arts, Science and History**, each with their own classroom. A grade is split into two sections that rotate through the rooms, so your classmates travel with you (classes are at least 90% full).

| Time | Block | Notes |
|---|---|---|
| 7:45 | Arrival / before-school | Bus loop, breakfast club, playground. Free recruiting time |
| 8:00 | Period 1 | Section A: Math, Section B: Language Arts |
| 9:10 | **Passing period (5 min)** | Class lets out into the hallway with a countdown to your next room |
| 9:15 | Period 2 | Section A: Language Arts, Section B: Math |
| 10:25 | **Recess (25 min)** | Big social hub |
| 10:55 | Period 3 | Section A: Science, Section B: History |
| 12:05 | **Lunch** | Cafeteria |
| 12:45 | Period 4 | Section A: History, Section B: Science |
| 2:00 | Dismissal | |

- **Passing periods aren't scheduled events, they're a race.** When the bell rings you're standing in the hallway outside your old room with a countdown (about a minute of real time). Talk to kids by the lockers, then get to the next room before it hits zero or you're tardy. Walking into the right room ends the passing period and you take your seat.
- **Hallways are real-time free roam.** You can be late on purpose to finish a conversation. Each teacher has a tardy tolerance (Mrs. Bramblebee forgives 2, Mr. Fussbudget forgives 0).
- 3 tardies = note home (parents' **Trust** −). 5 = detention (lose an after-school block).

### Quizzes & Grades
- **Weekly quiz every Friday** (plus pop quizzes). These are short, real but easy minigames:
  - Math: quick arithmetic / word problems, scaling with grade level
  - Reading: pick the right word, short comprehension
  - Science: true/false, sort-the-animals, label-the-planet
  - Spelling: unscramble / type the word
  - Social Studies: map pins, timeline ordering
- **Prep improves your odds:** studying at the library, doing homework in the evening, sitting next to a smart kid, being tutored by a Homework Helper friend. Prep adds hints, removes wrong answers, and slows the timer.
- **Accessibility setting:** "Quiz Assist" auto-answers for players who don't want academic minigames, but caps the result at B.
- **GPA gate:**

| Average | Status | Effect |
|---|---|---|
| A / B | ✅ Honor Roll | Parents +Trust, allowance asks succeed more often |
| C | ⚠️ Warning | Parents nag. No effect yet |
| D (2 weeks) | ⛔ **Grounded from sports** | Your organization **freezes**: no practices, no recruiting, **games are forfeited** until the average is back to C− |
| F | 🚫 Grounded from everything | Also no jobs, no mall. Recovery quest: tutoring + extra credit |

- Kids on your roster have grades too (see `school_average`). A kid who drops below the league rule (Jr: D, HS: state standard) is **benched**. Tutoring your own players is a valid strategy.

### Classroom mechanics
- **Seat chart:** each class has a 3D seat grid. You can only whisper to adjacent seats.
- **Pass a note:** pick a recipient. The note is handed kid-to-kid along a path, and each kid on the path rolls **Willingness** (friendship with you, personality, bribe). Snitches might hand it to the teacher, and the teacher may read it aloud (embarrassment −Charisma for the day).
- **Ask to switch seats:** the teacher says yes if your grade is good and you've had no recent trouble. The other kid has to agree too (friendship check, or a favor/payment).
- **Ask for the hall pass:** leave class for 3 real minutes. Meet a kid who's also out (bathroom kid, office runner) or sneak to another classroom's doorway to wave someone out. Hall monitors (5th grade Rule Followers) patrol.
- **Sneaking out:** risky. Leave without a pass, and use a stealth movement mode (crouch, hide behind lockers/trophy cases/janitor cart). Getting caught = principal's office.

### Mischief & the Troublemakers
Class Clowns, Troublemakers and Pranksters offer **Dares** with rewards:

| Dare | Reward | Catch chance (base) | If caught |
|---|---|---|---|
| Make a fart noise during silent reading | +Friendship with clown (big) | 20% | Name on board |
| Throw a paper airplane at the teacher's desk | Rare trading card | 35% | Lose recess ×3 |
| Yell "PIZZA PARTY!" in the middle of math | +Friendship with whole class (small) | 90% (it's loud) | Note home |
| Put a whoopee cushion on the teacher's chair | Their friendship maxed + they'll join your team | 50% | Principal's office, parents −Trust, Grounded 2 days |
| Swap the class hamster's name tag | Comedy points | 15% | Teacher disappointment (−quiz hints) |

- **Getting caught:** catch chance = base + teacher alertness − your Sneakiness − distraction from accomplices.
- **"Who did it?":** when the teacher interrogates the class, every witness rolls. Kids with **friendship < 40** or the **Snitch** trait might rat you out. **Vault** kids never do. High class-wide friendship = a wall of silence. *Your social network is your defense.*

---

## 6. Kids (the heart of the game)

### Roster facts
- **216 unique kids** in v0.1 data (target 240+ at launch, adding more middle/high schoolers that move into town over the years).
- All are fixed and authored: names, looks, home address, siblings, personality, traits, likes, stats, growth curve and routine. **The same in every run.**
- **Uniqueness rule:** each kid exists exactly once in the world and can be on **one team at a time**. If a rival has them, you don't.
- 30 **sibling pairs** share a house. Recruiting one often makes the other easier (or harder, if they're rivals).
- Grade distribution at game start: 2nd (30, future recruits), 3rd (68, your class), 4th (50), 5th (44), 6th (24, older "ringer" candidates who are ineligible for Jr League).

### Personalities (20)
Class Clown, Troublemaker, Teacher's Pet, Shy, Jock, Bookworm, Gamer, Artist, Drama Kid, Know-It-All, Sweetheart, Hothead, Daydreamer, Social Butterfly, Rule Follower, Prankster, Collector, Entrepreneur, Animal Lover, Conspiracy Kid.

Personality drives dialogue voice, mischief, what convinces them, how they react to losing, and locker room effects.

### Traits (2 per kid, 36 total)
Examples: *Snitch*, *Vault*, *Gossip*, *Sore Loser*, *Show-Off*, *Late Sleeper*, *Easily Bribed*, *Can't Be Bought*, *Stage Fright* (worse at home), *Crowd Lover*, *Injury Prone*, *Iron Kid*, *Loyal*, *Mercenary*, *Good Luck Charm*, *Jinx*, *Allergic to Grass*, *Sugar Rush* (better after concessions)…

### Talking to kids
Every kid gets a radial interaction menu:
- **Chat** (+friendship, reveals one routine slot or rumor)
- **Give gift** (likes/dislikes matter)
- **Ask a favor / Offer a favor** (generates mini-quests)
- **Play a minigame** (tetherball, four square, HORSE, thumb war, claw machine…)
- **Invite to tryout** (needs friendship ≥ their threshold, or a completed **Recruit Hook**)
- **Scout** (only with a scout hired: reveals a hidden stat hint)
- **Scheme** (unlocks with Troublemakers: dares, cheating rings, distractions)

### Recruitment status (data-driven)
| Status | Share | How to get them |
|---|---|---|
| **Free Agent** | ~54% | Friendship + invite. Some have a hook ("beat me at tetherball first") |
| **On Rival Team (Poachable)** | ~25% | Convince them: better facilities, friends on your roster, a task, beating their team, or a payment (Mercenary trait) |
| **On Rival Team (Loyal)** | ~8% | Locked this season. Can flip in the offseason if their team stinks or their friend joins you |
| **Not Into Sports (Yet)** | ~12% | Special quests. Often hidden gems (the Bookworm with an A+ Game Smarts) |

**Team Attraction** (see §11) multiplies every recruiting roll.

---

## 7. Stats, Grades & Positions

### Grade scale (17 tiers)
`A++ · A+ · A · A- · B+ · B · B- · C+ · C · C- · D+ · D · D- · F+ · F · F- · F--`

Internally each stat is 0–100. Grades are **relative to the kid's age band**, so a B 3rd grader is as good *for a 3rd grader* as a B 7th grader. Bands: 97+ A++, 93 A+, 89 A, 85 A-, 81 B+, 76 B, 71 B-, 66 C+, 60 C, 54 C-, 48 D+, 42 D, 36 D-, 29 F+, 21 F, 12 F-, below 12 F--.

### The 14 stats (shared across all 4 sports)

| Code | Stat | Revealed by drill | Unlock |
|---|---|---|---|
| SPD | Speed | **Sprints** | ★ Start |
| AGI | Agility | Cone Weave | Buy cones ($8) |
| STR | Strength | Tire Push | Find an old tire (junkyard quest) |
| STA | Stamina | The Long Lap | Field must have a marked perimeter |
| LEP | Leaping | Jump & Reach | Chalk + measuring tape |
| HND | Hands | Catch Gauntlet | Tennis ball machine (DIY version first) |
| ARM | Arm Power | Long Toss | Field length ≥ medium |
| ACC | Accuracy | Bucket Toss | Buckets from the grocery store |
| BCL | Ball Control | Dribble Maze | Cones + sport ball |
| EYE | Hand-Eye | Batting Tee & Free Throws | Batting tee / hoop |
| IQ | Game Smarts | Scrimmage | Need 2 full sides at tryout |
| CLU | Clutch | Pressure Cooker | Bleachers with fans + noisemaker |
| HUS | Hustle | Hustle Hill | Run Sprints *after* The Long Lap |
| TMW | Teamwork | Three-Legged Relay | Rope + Library book "Team Spirit!" |

**Hidden (never shown as a grade):** Potential, Growth Curve, Peak Grade, Coachability, Sneakiness. Hire a **Scout** to get star-rating hints, and watch practice over time to narrow them down.

**Tryout UI:** unrevealed stats show as `?`. A drill only shows the stats it measures, so early tryouts are basically "who's fast?". Better drill equipment (stopwatch → laser timing gates) shrinks the error bar: a cheap stopwatch shows "B or B+", laser gates show "B+".

### Position formulas
Position rating = weighted average of stats (weights add to 1.0). Height (from looks) affects basketball and football receivers/linemen.

**Soccer (7v7 Jr → 11v11 Middle/HS)**
| Position | Formula |
|---|---|
| Goalkeeper | LEP .25, HND .30, AGI .25, CLU .20 |
| Defender | STR .25, SPD .20, IQ .30, STA .25 |
| Midfielder | STA .30, BCL .25, IQ .25, ACC .20 |
| Forward | SPD .30, BCL .25, ACC .25, CLU .20 |

**Baseball**
| Position | Formula |
|---|---|
| Pitcher | ARM .30, ACC .35, CLU .20, STA .15 |
| Catcher | HND .30, ARM .25, IQ .30, STR .15 |
| Infield | HND .30, AGI .25, ARM .25, IQ .20 |
| Outfield | SPD .30, HND .30, ARM .25, IQ .15 |
| *Batting (all)* | EYE .45, STR .30, SPD .10, CLU .15 |

**Basketball**
| Position | Formula |
|---|---|
| Point Guard | BCL .30, IQ .30, SPD .20, ACC .20 |
| Shooting Guard | ACC .35, EYE .25, AGI .20, CLU .20 |
| Small Forward | AGI .25, ACC .25, LEP .25, STA .25 |
| Power Forward | STR .30, LEP .30, HND .20, HUS .20 |
| Center | LEP .30, STR .30, HND .20, height .20 |

**Football (Flag in Jr, Tackle from Middle League)**
| Position | Formula |
|---|---|
| QB | ARM .30, ACC .35, IQ .20, CLU .15 |
| RB | SPD .30, AGI .30, STR .20, HND .20 |
| WR | SPD .30, HND .35, LEP .15, AGI .20 |
| Lineman (tackle only) | STR .45, STA .25, IQ .15, HUS .15 |
| DB | SPD .30, AGI .30, IQ .25, HND .15 |
| LB | STR .30, SPD .25, IQ .25, HUS .20 |

**Teamwork & Hustle** also give a *team aura*: every player on the field gets a small boost from the roster's average TMW. That's how "not good, but great for morale" kids earn a spot.

---

## 8. Growing Up

Each kid has a **growth curve** (fixed per kid):

| Curve | Share | Story |
|---|---|---|
| Steady Climber | ~38% | Reliable. Gets a bit better every year |
| Late Bloomer | ~15% | Meh until 7th–8th grade, then a monster in high school |
| Early Peaker | ~16% | Jr League star who plateaus in middle school and declines |
| Growth Spurt | ~11% | One huge jump around 6th–7th grade (height and strength) |
| Dud | ~10% | Never gets much better. Heart might make up for it |
| Morale Machine | ~8% | Stats barely grow, but Teamwork/Hustle are elite and keep rising |
| Phenom | ~3% | Great now, great later. Everyone wants them |

- Growth per year = curve value × (Potential factor) × (training facility multiplier) × (coach quality) × (Coachability).
- **Appearance aging:** each kid has a modular character rig with per-age morph targets for *Kid (8–10)*, *Tween (11–13)* and *Teen (14–18)*. Height is driven by data. Hairstyles/fashion evolve with personality (the Gamer gets headphones, the Jock gets a letterman jacket, the Drama Kid dyes their hair). Braces come and go, glasses can turn into contacts.

---

## 9. Money & Jobs

### Starting money: Asking Mom & Dad
- **Parent Trust** (0–100) goes up with good grades, chores, being on time, and *not* asking too often.
- You type or slide **how much** to ask for. Acceptance chance:
  `P = clamp( 1.1 − (ask / generosity_limit), 0, 1 )`, where `generosity_limit = $3 + Trust × $0.10 + gradeBonus`.
  At the start (Trust 50) asking for **$5–7 works**, but asking for $20 gets "Do you think money grows on trees?!"
- **Turned down:** 3-day cooldown and −Trust. Ask too big and Dad does a 30-second lecture cutscene (skippable after the first time).
- **Chores** (dishes, walk the dog, rake leaves) give +Trust and small allowance.

### Fallback money
| Source | Pay | Notes |
|---|---|---|
| **Money on the ground** | ¢5 – $5 | Rare sparkle spawns: under the mall fountain, couch cushions, the school parking lot after a field trip. Rare $20 bill = mini event |
| **Can & bottle recycling** | ¢5 each at the grocery store bottle return | Collect from parks, after games, neighbors' recycling (ask first, or else!) |
| **Classmate tasks** | $1–$5 or items | "Carry my tuba," "Find my lost retainer in the cafeteria trash" (gross minigame), "Trade me your pudding cup" |

### Side jobs (unlock in order)
| Job | Unlock | Required equipment | Loop | Upgrades |
|---|---|---|---|---|
| **Lemonade Stand** | Start | Folding table (garage, free), pitcher $4, cups $2, sign (craft free) + ingredients per batch ($3: lemons, sugar) | Pick location & price, set the recipe (sweet/sour sliders), weather affects demand, minigame pour | Cooler, umbrella, cookies, pink lemonade, "Fancy Glass Bottles," location permits (outside the ballpark = 💰) |
| **Paper Route** | Earn $50 total + Parent Trust 55 | A bike ($45, also speeds up travel) + newspaper bag $10. Every house on your street (10+) subscribes | Morning route on a bike with a throwing minigame. Hit porches, not windows, dogs chase you | Faster bike, bigger bag, second route, Sunday edition (2× pay), hire a kid to run a route |
| **Lawn Mowing** | Earn $150 total + 4th grade | Push mower $60 (or rent Dad's for 30% cut), gas can $8, rake $6 | Lawn-mowing pattern minigame. Stripes = tips. Miss a spot and the customer complains | Self-propelled mower, edger, leaf blower, riding mower (HS), hire kid crews → **landscaping company** |
| *Later:* Dog Walking, Car Wash, Snow Shoveling (winter), Garage Sale Flipping, Tutoring (if your grades are A), Concession Catering, Sports Camp for little kids | | | | |

Jobs scale into **businesses** run by hired kids, which feed the team's budget as passive income.

---

## 10. Team & Facility Management

### Fields (renting)
| Field | Cost | Fan capacity | Upgrade ceiling | Terms |
|---|---|---|---|---|
| **Parents' Backyard** | Free | 12 (on lawn chairs) | Admission max $1, concessions tier 1 only | **Mom & Dad take 50% of revenue** "for eating all our food." Neighbor noise complaints if the crowd is too loud. Mom's flower bed is a hazard |
| **Cul-de-sac / Driveway** (basketball only) | Free | 20 (on the curb) | Low | Games pause when cars come |
| **School Playground Field** | $10/game | 40 | Medium | Needs a permission slip from the principal (grade check). No lights |
| **Old Town Park** | $25/game | 80 | Medium-high | City permit. Shared field: the senior tai chi class won't move. Weather bad = mud |
| **Rec Center Field** | $60/game | 150 | High | Contract per season. Penalties for damage |
| **Your Own Land** (buy) | $5k+ | 200 → 5,000+ | Unlimited | Build everything. Property tax. HOA drama |

### Upgrade trees (example: Soccer)
| Category | Tier 1 (start) | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|---|---|---|
| Goals | Wooden frame, no net, slightly crooked | PVC goals + fishing-net | Pop-up goals w/ real nets | Aluminum goals | Pro goals w/ branded net |
| Lines | Crooked spray paint | Straight chalk | Line-marking machine | Pro painted | Laser-aligned + logo at midfield |
| Corner flags | None (backpacks) | Pool noodles | Real flags | Team-color flags | Light-up flags |
| Turf | Dad's patchy lawn | Mowed & weeded | Sodded | Irrigated pro grass | Hybrid turf + heating |
| Benches | Lawn chairs | Picnic bench | Aluminum benches | Covered dugout-style | Heated padded benches |
| Seating | The grass | Lawn chairs | Bleachers (3 row) | Grandstand | Stadium bowl |
| Scoreboard | Kid holding a whiteboard | Flip-number board | Electronic | Video board | Jumbotron w/ kiss cam |
| Announcer | You yelling | Kid with a toy megaphone | PA system | Hired play-by-play kid/adult | Color commentator duo + radio broadcast |
| Lights | None (games end at sunset) | Garage floodlight | Rented light towers | Permanent lights | Stadium LED |
| Concessions | Juice boxes from the fridge | Lemonade stand (synergy!) | Snack shack | Grill + nachos | Food court |
| Restrooms | "Use the house, wipe your feet" | Porta-potty | Restroom trailer | Real restrooms | Luxury (needed for HS sanction) |
| Uniforms | Plain colored T-shirts | Iron-on numbers | Real jerseys | Home/away kits + socks | Pro kits + custom cleats |

Each sport has its own equivalent tree (baseball: cardboard bases → rubber bases → dugouts → pitching machine. Basketball: driveway hoop → adjustable hoop → glass backboard → indoor gym. Football: cones & flags → goalposts made of brooms → real goalposts → press box).

### Team gear (skill equipment)
Gear makes every kid on your roster better on game day. Each category has 3 tiers bought with team money, named for your sport:

| Gear | Soccer | Baseball | Basketball | Football | Boosts |
|---|---|---|---|---|---|
| Footwear | Molded → bladed → pro cleats | Rubber → metal → pro spikes | High-tops → jump shoes → signature shoes | Molded → grip → pro cleats | Speed, Agility (Leaping for hoops) |
| Balls & Bats | Size-4 → match → pro balls | Aluminum → composite → pro bats | Rubber → composite → pro balls | Rubber → leather → pro footballs | Ball Control/Accuracy, Hand-Eye/Strength, Arm/Accuracy |
| Gloves & Grip | Keeper gloves | Fielding gloves | Grip spray → shooting sleeves | Receiver gloves | Hands |
| Conditioning | Jump ropes → agility ladders | Weighted bats + bands | Ladders + bands | Tackling dummies + sleds | Stamina, Hustle/Strength |

Uniforms come with shorts or pants (baseball and football default to pants with a team-color stripe).

### Training facilities (affect growth)
Equipment shed → Mini gym in the garage → Training barn → Training center → Performance lab. Each tier boosts growth and unlocks new practice types (film study improves IQ, weight room improves STR, etc.).

### Staff (kids or adults)
| Role | Effect | Kid version | Adult version |
|---|---|---|---|
| Coach | Game tactics, growth multiplier | Cheap, enthusiastic, limited playbook | Expensive, hard to convince, deep playbook |
| Ticket / Gate Worker | Admission revenue, prevents sneak-ins | Might eat the profits | Reliable |
| Trainer | Injury recovery speed | Band-Aids and juice | Certified (needed for HS) |
| Scout | Reveals hidden stats & routines | Gossip-based (sometimes wrong) | Accurate reports |
| Announcer | Crowd excitement → revenue & home-field boost | Hilarious, unreliable | Smooth, expensive |
| Concessions Manager | Food revenue | | |
| Groundskeeper | Field quality decay prevention | | |
| Business Manager (late) | Automates jobs income, contracts | | |

Adults are recruited like kids: find them (Coach Dave at the hardware store, retired Mrs. Pham who was a college softball star), gain trust, and meet their asking price.

### Organization HQ & Trophy Room
| Tier | HQ | Trophy space |
|---|---|---|
| 1 | Your bedroom desk | Basement shelf (6 slots), next to the water heater |
| 2 | Basement "office" (card table + lamp) | Basement wall (15 slots) |
| 3 | Treehouse HQ | Treehouse display (25) |
| 4 | Rented office above the Old Town bakery | Trophy case (50) |
| 5 | Own clubhouse on your land | Trophy hall (100) |
| 6 | Stadium offices | Hall of Fame wing with plaques for retired kids |

Trophies are **physical inventory items** you place by hand. Visiting kids and parents see them, and trophies raise **Team Attraction** when they're on display (not when they're sitting in your backpack!).

---

## 11. Team Attraction (recruiting power)

```
Attraction = 0.20·Roster Quality      (avg overall + star power)
           + 0.15·Recent Results      (last 8 games, weighted)
           + 0.15·Team History        (seasons, playoff runs)
           + 0.10·Championships       (displayed trophies count double)
           + 0.15·Facilities          (field + uniforms + HQ)
           + 0.15·Player Likability   (your Charisma + avg friendship)
           + 0.05·Fan Buzz            (attendance, announcer quality)
           + 0.05·Coaching Staff
           − Scandal Penalty          (decays over years)
           − Forfeit Penalty          (from grade freezes)
```
Each kid weights these differently by personality: Jocks care about results, Social Butterflies about friends on the roster, Oakridge Heights kids about facilities, Mercenaries about money.

---

## 12. Games

- **League schedule:** every league has at least 8 teams, counting yours. 10 regular season games (a round robin with no byes) and a 4-team playoff. Saturday game days. Rival teams sign free agents before the season starts, so they compete with you for the same kids.
- **If you're on your own roster** (default in the Jr League): you play the game in an **arcade-style** controlled mode, as your character, with AI teammates. You can call simple plays.
- **If you're not playing** (coach-only, or later as owner): the game is **simulated**. You can:
  - **Spectate in 3D** (watch the sim play out with commentary), or
  - **Quick Sim** with a box score and highlight reel.
- **Rival games** (any match you aren't in) are always simulated. You can go to them to spectate and scout.
- **Sim engine:** possession/event-based. Every event picks the involved players and rolls position ratings, aura, fatigue, crowd and traits (Stage Fright, Crowd Lover). The play-by-play is generated from the event log.

### Commentary (kid-friendly, silly)
Announcer quality tiers change the vocabulary and the delivery:
- **Tier 1 (you yelling):** "GOAL! I think! Was that a goal? MOM, WAS THAT A GOAL?"
- **Tier 2 (toy megaphone kid):** "And Rocco kicks it… into the neighbor's yard. Again. Somebody go get it!"
- **Tier 4 (pro duo):** "Zara Okafor with the stepover, a second stepover… she has crossed the defender's ankles into another zip code!" / "Bob, I haven't seen moves like that since the Great Pudding Cup Trade of last Tuesday."
- Running gags: the dog that runs onto the field, the ice cream truck pausing the game, the grandma who heckles the ref, a kid's mom yelling their full name.

---

## 13. Leagues & Progression

| League | Grades | Format notes | Your age |
|---|---|---|---|
| **Jr League** | 3–5 | Small-sided (7v7 soccer, flag football, coach-pitch → kid-pitch baseball, 8ft hoops) | 3rd–5th |
| **Middle League** | 6–8 | Full-sized formats begin. Tackle football. Travel teams appear | 6th–8th |
| **High School League** | 9–12 | Requires **sanctioning** (see below) | 9th–12th |

- Kids move up with you or leave for other teams. **Offseason re-signing** is a friendship & attraction check.
- **Expanding:** after your first winning season you can found a **second sport**. A kid still plays for only one of your teams at a time, so multi-sport organizations need deeper rosters.

### High School Sanctioning (after 8th grade)
**Requirements:** $25,000+ banked, Reputation ≥ "Town Famous", a legit field with lights + restrooms + seating for 300, an adult certified head coach, a certified trainer, insurance, and a City Hall permit.

**Ongoing state eligibility for every rostered kid:**
- Passing grades (2.0 GPA equivalent) checked each grading period
- Age under 19 by season start
- Lives in the district (residence data!)
- Annual physical form on file
- **Amateur status:** a kid you *paid* to join can be ruled ineligible if it's discovered ("signing candy money" comes back to haunt you)
- Transfer rules: kids poached from another HS sit out 1 season

**Legit hurdles:** tutoring programs, paperwork deadlines, physical-exam scheduling quests, recruiting from families moving into the district.
**Shady options:** fake addresses (use a friend's house), "persuading" a teacher about a grade (very high risk), hiding past payments. Each has a discovery chance that rises with your fame.

---

## 14. Scandals: "The Paperwork"

Random events (roughly 1–2 per season) where you *could* cheat:
- **The Ringer:** a 6th or 7th grader (ineligible) wants to play in the Jr League. A shady kid (Entrepreneur personality) sells you a "fixed" birth certificate.
- **The Fake Address:** an all-star from a neighboring town.
- **Doctored Report Card:** your star player's grades are ineligible the week of the playoffs.
- **Bribed Ref:** the ref's kid wants your Holographic Dino Card.

**Detection chance per game** = base 8% + (age gap × 6%) + (player's dominance: the better they play, the more suspicious) + rival team suspicion (grows when they lose to you) − forgery quality − your Sneakiness. **Snitches** on your own roster can tip off the league.

**If caught (escalating):**
- All games with the illegal player are **forfeited**
- **Play every game the rest of the season one player down**
- **Playoff ban for 3 seasons** (huge −Attraction: kids won't want to join a team that can't make playoffs)
- League fine. Parents ground you. Rivals get a "Cheaters!" chant
- Repeat offense → **expelled from the league** for a year
- The scandal follows you as a decaying **Scandal Penalty** in Team Attraction, and appears in news headlines and dialogue ("Aren't you the kid with the fake 3rd grader with a mustache?")

**If it works:** that player is huge (an older kid dominates), the team racks up wins, and you get "Hidden Shame" achievements.

---

## 15. Player Character Stats & Progression

- **Charisma** (convincing kids, parents, adults, teachers)
- **Sneakiness** (mischief, sneaking out, notes, paperwork)
- **Smarts** (quizzes, negotiations, contracts)
- **Hustle** (job efficiency, energy)
- **Athletics** (your own stats when playing, using the same 14-stat system, because you're a kid on the roster too)
- **Reputation:** Unknown → Backyard Legend → Neighborhood Known → Town Famous → County Celebrity → State Name
- **Energy:** daily stamina bar. Sleep, food and fun refill it.

The player levels up by doing things (Skyrim-style use-to-improve) and picks a **perk** at each level-up (e.g., *Silver Tongue: parents' generosity +20%*, *Ghost: hallway monitors' vision −30%*, *Clipboard: tryouts reveal +1 extra stat per drill*).

---

## 16. Tone & Content Guardrails
- Mischief is pranks, not cruelty: no bullying a specific kid, no violence beyond cartoon slapstick, no destroying property. Thrown objects are paper airplanes, erasers and spitwad-free paper balls.
- Money and cheating mechanics always have visible consequences, and honest play is fully viable (and earns the "Clean Hands" achievement track).
- Diverse cast in looks, backgrounds, family types and abilities (kids with glasses, hearing aids and wheelchairs. Adaptive sports equipment is an unlockable upgrade, not a joke).
- No real-world brands. All products are parody (e.g., "Gatordrip," "Nike-ish" → **"Swooshers"**).

---

## 17. Technical Plan

### Engine recommendation: **Unity 6 (URP)**
- Stylized cartoon rendering with toon/rim lighting, high-quality GI, and great Steam Deck performance.
- C# is ideal for the data-heavy simulation (216+ kids, routines, sims).
- Mature tooling for modular characters, Steamworks.NET, and save systems.
- *Alternative:* Unreal 5 if the team has Unreal artists. It looks great out of the box but is heavier for Deck and data-driven UI.

### Key systems
| System | Notes |
|---|---|
| **Kid Database** | `data/kids.json` → ScriptableObjects at import. Generated deterministically (`tools/generate_kids.py`, fixed seed) then **hand-polished by writers** (names, backstories, dialogue barks) |
| **Modular Character Creator** | Shared rig: body morphs by build/height/age band, swappable hair/accessories/outfits, palette swaps. One system produces all 216 kids + the player + adults |
| **Schedule / Routine System** | Time-slot → location → zone → activity. NPCs not in the current location are "abstracted" (position updated on the schedule, not simulated) for performance |
| **Social Graph** | Friendship values between player↔kid and kid↔kid (drives snitching, sibling effects, roster chemistry) |
| **Sim Engine** | Event-based match simulation per sport, deterministic with a seed per game for replays |
| **Dialogue** | Ink or Yarn Spinner. Personality-tagged lines + per-kid unique lines for headline kids |
| **Save System** | Steam Cloud. Autosave each night (no save scumming the paperwork… ironman toggle) |
| **Steam Features** | Achievements (150+), Steam Cloud, Steam Deck verified, Trading Cards (one per headline kid!), Workshop later for custom team logos/jerseys |

### Content scope estimate (launch)
- 4 sports × 3 league formats
- 6 neighborhoods + 5 public locations + 3 schools + house + 4 unlockable areas
- 216–240 kids, ~40 adults
- ~25 jobs/business tiers, ~120 facility upgrades, 14 drills
- ~6,000 lines of dialogue (barks + key characters)

---

## 18. Milestones

| Phase | Duration (small team, ~6–10 people) | Deliverable |
|---|---|---|
| **0. Paper prototype** | 1 month | Spreadsheet sim of economy + match sim, balancing growth curves |
| **1. Vertical slice** | 4–6 months | One week of 3rd grade: house, school, mall; lemonade stand; 30 kids; Sprints tryout; one soccer game in the backyard |
| **2. Alpha** | +8 months | All 4 sports Jr League, all locations, all 216 kids, jobs, school system, scandal events |
| **3. Beta** | +6 months | Middle League, High School sanctioning, aging visuals, full upgrade trees, commentary |
| **4. Early Access on Steam** | | Jr + Middle League complete. HS arrives in EA updates |
| **5. 1.0** | +6–9 months EA | Full 3rd → 12th grade run, Workshop, polish |

### Biggest risks
1. **Scope:** 216 fully-routined kids in 3D is a lot. Mitigate with the modular rig, abstracted off-screen sims, and data-driven routines.
2. **Four sports' gameplay:** playable arcade modes for 4 sports is effectively 4 games. Mitigation: ship the **sim + spectate** for all 4 first, then a playable arcade mode for one sport per milestone.
3. **School tedium:** a full class day every in-game day can drag. Mitigation: "skip to next free period" once a class is done, and quizzes only weekly.
4. **Balance:** the cheat options must be tempting but not dominant. Needs a Phase 0 spreadsheet sim.

---

## 19. Open Questions for You
1. **Multi-sport kids:** can a kid play soccer for you in the fall and basketball for a rival in the winter (one team *per season*), or is it one team for the whole year? (The current design is one team at a time, re-checked each season.)
2. Should the player character always be on the roster in Jr/Middle League, or is coaching from the sideline allowed from day one?
3. Gender: mixed teams in all leagues (current assumption), or separate leagues from high school?
4. Is there a lose condition (bankruptcy, the org folds), or can you always recover?
5. Online features: async leaderboards ("best record with a backyard field"), or a shared-seed challenge mode?

---

## Appendix: Data Files
- `data/kids.json`: full roster (216 kids) with looks, residence, personality, traits, likes, stats (numeric + letter), hidden stats, recruitment status & hook, siblings, and full weekday/weekend routines. Includes `meta` with the grade scale, stat/drill table, growth curves and rival teams.
- `data/kids.csv`: spreadsheet view for designers (letter grades only).
- `tools/generate_kids.py`: deterministic generator (seed `20261014`). Re-run to rebuild. Writers then hand-edit the JSON.
