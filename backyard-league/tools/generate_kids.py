#!/usr/bin/env python3
"""Generate the fixed kid roster for Recess Rivals.

The seed is constant, so every run of the game ships the exact same kids with the
exact same stats, homes, and routines. Re-running this script reproduces the
same files byte-for-byte; change SEED only if you deliberately want a new world.

Usage: python3 generate_kids.py [out_dir]
"""
import csv
import json
import random
import sys
from pathlib import Path

SEED = 20261014
KID_COUNT = 216

# ---------------------------------------------------------------- grading ---
# 17 tiers, A++ (best) to F-- (worst). Numeric stats are 0-100, rated against
# kids in the same age band, so a "B" 3rd grader and a "B" 7th grader are
# equally good *for their age*.
GRADE_TIERS = [
    (97, "A++"), (93, "A+"), (89, "A"), (85, "A-"),
    (81, "B+"), (76, "B"), (71, "B-"),
    (66, "C+"), (60, "C"), (54, "C-"),
    (48, "D+"), (42, "D"), (36, "D-"),
    (29, "F+"), (21, "F"), (12, "F-"), (0, "F--"),
]


def letter(value):
    for floor, name in GRADE_TIERS:
        if value >= floor:
            return name
    return "F--"


# ------------------------------------------------------------------ stats ---
# code, name, drill that reveals it
STATS = [
    ("SPD", "Speed", "Sprints"),
    ("AGI", "Agility", "Cone Weave"),
    ("STR", "Strength", "Tire Push"),
    ("STA", "Stamina", "The Long Lap"),
    ("LEP", "Leaping", "Jump & Reach"),
    ("HND", "Hands", "Catch Gauntlet"),
    ("ARM", "Arm Power", "Long Toss"),
    ("ACC", "Accuracy", "Bucket Toss"),
    ("BCL", "Ball Control", "Dribble Maze"),
    ("EYE", "Hand-Eye", "Batting Tee & Free Throws"),
    ("IQ", "Game Smarts", "Scrimmage"),
    ("CLU", "Clutch", "Pressure Cooker"),
    ("HUS", "Hustle", "Hustle Hill"),
    ("TMW", "Teamwork", "Three-Legged Relay"),
]
STAT_CODES = [s[0] for s in STATS]

# Body/athletic archetypes bias which stats a kid is naturally good at.
ARCHETYPES = {
    "Speedster": {"SPD": 22, "AGI": 14, "STA": 6, "STR": -10},
    "Powerhouse": {"STR": 22, "ARM": 12, "STA": 4, "SPD": -8, "AGI": -6},
    "Sure Hands": {"HND": 22, "EYE": 10, "IQ": 6},
    "Cannon": {"ARM": 22, "ACC": 8, "STR": 8},
    "Sharpshooter": {"ACC": 22, "EYE": 14, "CLU": 6, "STR": -6},
    "Dribble Wizard": {"BCL": 22, "AGI": 12, "IQ": 4},
    "Pogo Stick": {"LEP": 24, "AGI": 8, "SPD": 4},
    "Engine": {"STA": 22, "HUS": 14, "SPD": 4},
    "Brainiac": {"IQ": 24, "TMW": 8, "ACC": 4, "SPD": -6, "STR": -6},
    "Ice Veins": {"CLU": 24, "ACC": 8, "IQ": 6},
    "All-Rounder": {},
    "Heart & Soul": {"TMW": 26, "HUS": 18, "SPD": -6, "STR": -6, "ACC": -6},
}
ARCHETYPE_WEIGHTS = {
    "Speedster": 12, "Powerhouse": 11, "Sure Hands": 9, "Cannon": 8,
    "Sharpshooter": 9, "Dribble Wizard": 9, "Pogo Stick": 7, "Engine": 9,
    "Brainiac": 7, "Ice Veins": 5, "All-Rounder": 10, "Heart & Soul": 6,
}

# Growth curves: points gained per grade from grade 2 to 12 (index 0 = 2nd->3rd).
# Applied to every athletic stat, scaled by the kid's potential.
GROWTH_CURVES = {
    "Steady Climber": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    "Late Bloomer": [0, 0, 1, 1, 2, 4, 6, 7, 6, 4],
    "Early Peaker": [6, 6, 5, 3, 1, 0, -1, -2, -2, -3],
    "Phenom": [5, 5, 5, 5, 4, 4, 4, 3, 3, 3],
    "Dud": [1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    "Growth Spurt": [1, 1, 1, 9, 6, 2, 1, 1, 1, 1],
    "Morale Machine": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # TMW/HUS grow instead
}
CURVE_WEIGHTS = {
    "Steady Climber": 34, "Late Bloomer": 16, "Early Peaker": 14, "Phenom": 4,
    "Dud": 14, "Growth Spurt": 10, "Morale Machine": 8,
}

# ------------------------------------------------------------------ names ---
FIRST_NAMES = """
Aaliyah Abel Ada Adrian Aiden Aiko Alana Alejandro Alex Ali Alma Amara Amir Andre
Anika Arlo Arjun Asha Atticus Aubrey Ava Axel Bao Beatrix Benny Bianca Blake Bodhi
Brielle Bruno Caleb Camila Carmen Cassius Cece Chidi Chloe Clementine Cody Cora
Cyrus Dakota Dante Daphne Darius Delia Desmond Diego Dina Dmitri Dottie Eamon Eden
Eli Elsa Emeka Emmett Enzo Esme Ezra Fatima Felix Fern Finn Fiona Frankie Gabe
Gemma Gideon Gigi Grayson Greta Gus Hana Harper Hector Hollis Hugo Imani Ines Ira
Isla Ivan Ivy Jada Jago Jamal Jasper Javi Jiho June Juno Kai Kaleb Kamala Keanu
Kenji Kiara Kit Kofi Lark Layla Leo Leilani Lena Levi Lila Lincoln Lola Lorenzo
Luca Lucy Mabel Mae Malik Manny Marco Margo Mateo Maya Mei Milo Mina Miles Moses
Nadia Nash Nell Nico Nina Noor Oakley Odette Olu Omar Opal Oscar Otis Paloma Pax
Penny Percy Pip Priya Quinn Rafa Ravi Remy Reza Rhea Rocco Rory Rosa Ruby Rufus
Sadie Sage Sami Santi Sasha Selah Sienna Silas Sol Sora Stella Sunny Tad Talia
Tariq Tess Theo Tilly Tobias Toby Tomas Trixie Tuck Uma Vera Vik Violet Wade Walt
Wren Xander Ximena Yara Yosef Yuki Yusuf Zara Zeke Zion Zoey Zuri Bea Rex Tank
Pepper Biscuit Wally Lulu Dex Hattie Ozzie Mo Nova Gil Ike Della Hank Lottie Reggie
Birdie Ziggy Frida Ollie Roscoe Junie Chet Dolly Benji Mags Wesley Sonny Kip Polly
""".split()

LAST_NAMES = """
Abernathy Bumble Castellano Dumpling Espinoza Fizzwater Gonzalez Huckabee Ito
Jablonski Kowalski Lumpkin Mbeki Nakamura Okafor Pickering Quackenbush Ramirez
Sprinkle Tran Underhill Vasquez Wigglesworth Xiong Yamamoto Zabriskie Baker Choi
Delgado Fairweather Grubb Hollister Iyer Jenkins Kim Lindqvist McNugget Nguyen
O'Malley Patel Rosenberg Schmidt Thistlewood Upton Vega Whitaker Yoon Zhang Banks
Cooper Doolittle Featherstone Goldberg Haddad Jumbo Kettleworth Lopez Moreno
Noodleman Ortiz Park Rivera Snodgrass Tuttle Vandermeer Wong Ahmed Bellweather
Crumb Dawson Ellsworth Flores Gupta Higgins Ivanova Jackson Kapoor Lindgren Murphy
Nash Oduya Puddington Quintero Rhodes Sandoval Tibbs Ueda Waffleton Yazzie
Adeyemi Bloom Carver Dibble Erikson Funk Gallagher Honeycutt Jorgensen Kaur Lark
Mendoza Novak Ollerton Pumpernickel Reyes Silva Truong Villanueva Wilde Zamora
Abbott Barnaby Chen Diaz Esposito Finch Garcia Hughes Jones Kowal Larkin Mahoney
""".split()

NICKNAME_POOL = [
    "Turbo", "Noodle", "Tank", "Pickles", "Rocket", "Smudge", "Bean", "Wheels",
    "Captain", "Sparky", "Moose", "Peanut", "Sneakers", "Boomer", "Gizmo",
    "Ace", "Hops", "Butterfingers", "Professor", "Lightning", "Taco", "Ziggy",
    "Mittens", "Sarge", "Chief", "Doodle", "Bubbles", "Flash", "Wiggles", "Buzz",
]

# ------------------------------------------------------------------ looks ---
SKIN_TONES = ["porcelain", "fair", "light", "light-olive", "olive", "tan",
              "golden-brown", "brown", "deep-brown", "ebony"]
HAIR_STYLES = ["buzz cut", "spiky", "bowl cut", "messy mop", "curly afro",
               "braids", "box braids", "pigtails", "ponytail", "high puff",
               "space buns", "bob", "long straight", "long wavy", "mohawk",
               "cowlick", "side part", "twists", "locs", "fade", "curtains",
               "curly top", "headband + ponytail", "shaggy", "french braid"]
HAIR_COLORS = ["black", "dark brown", "brown", "light brown", "auburn",
               "ginger", "strawberry blonde", "blonde", "platinum blonde",
               "dyed blue tips", "dyed pink streak", "dyed green streak"]
EYE_COLORS = ["brown", "dark brown", "hazel", "green", "blue", "gray", "amber"]
BUILDS = ["skinny", "lanky", "average", "stocky", "sturdy", "round", "wiry", "tall-for-age", "small-for-age"]
ACCESSORIES = ["glasses", "sport goggles", "missing front tooth", "braces",
               "freckles", "band-aid on knee", "backwards cap", "beanie",
               "sweatband", "light-up sneakers", "friendship bracelets",
               "giant backpack", "scarf (even in summer)", "bucket hat",
               "cast with signatures", "headphones", "star earrings",
               "superhero cape", "fanny pack", "bandana", "rolled-up sleeves",
               "knee pads", "dinosaur hoodie", "lucky socks", "hearing aids",
               "eye patch (pirate phase)"]
OUTFIT_COLORS = ["red", "orange", "yellow", "lime", "green", "teal", "sky blue",
                 "navy", "purple", "pink", "black", "white", "gray", "tie-dye",
                 "camo", "plaid", "polka dot", "striped"]

# ------------------------------------------------------- personality/traits ---
PERSONALITIES = {
    "Class Clown": 10, "Troublemaker": 8, "Teacher's Pet": 8, "Shy": 9,
    "Jock": 10, "Bookworm": 8, "Gamer": 8, "Artist": 6, "Drama Kid": 6,
    "Know-It-All": 6, "Sweetheart": 8, "Hothead": 6, "Daydreamer": 6,
    "Social Butterfly": 7, "Rule Follower": 7, "Prankster": 6, "Collector": 5,
    "Entrepreneur": 4, "Animal Lover": 5, "Conspiracy Kid": 3,
}
TRAITS = [
    "Snitch (tells on you if friendship < 40)",
    "Vault (never snitches)", "Gossip (spreads your rep fast)",
    "Sore Loser", "Gracious Loser", "Show-Off", "Humble",
    "Picky Eater (hates cheap concessions)", "Always Hungry",
    "Late Sleeper (misses morning practice)", "Early Bird",
    "Homework Helper", "Homework Copier", "Germaphobe", "Mud Lover",
    "Superstitious", "Leader", "Follower", "Lone Wolf", "Loud Cheerer",
    "Easily Bribed", "Can't Be Bought", "Stage Fright (worse at home games)",
    "Crowd Lover (better with big crowds)", "Injury Prone", "Iron Kid",
    "Loyal (hard to poach, hard to lose)", "Mercenary (follows the best offer)",
    "Big Sibling Energy", "Rivalry Magnet", "Jinx", "Good Luck Charm",
    "Sugar Rush", "Allergic to Grass", "Weather Hater", "Rain Dancer",
]
LIKES = ["comic books", "slime", "trading cards", "dinosaurs", "space", "video games",
         "candy", "friendship bracelets", "skateboards", "horses", "bugs",
         "magic tricks", "rubber ducks", "sharks", "robots", "baking", "K-pop",
         "fishing", "rocks & gems", "drawing", "stickers", "yo-yos", "tamagotchis",
         "mystery novels", "spicy chips", "frogs", "volcanoes", "cars", "knights",
         "pizza", "origami", "ninja movies", "sock puppets", "wrestling", "cats"]

RECRUIT_HOOKS = [
    "Beat them in a game of {minigame} at {spot}.",
    "Bring them a {like} item from the mall.",
    "Help them finish their science fair project at the library.",
    "Win their little sibling's approval at the playground.",
    "Get their parent's permission slip signed (talk to their parent at home).",
    "Promise them a starting spot (breaking it costs friendship).",
    "Prove your team has real nets / bases / hoops (field upgrade check).",
    "Have at least {n} friends on the roster already.",
    "Pay them ${n} in 'signing candy money'.",
    "Return the library book they lost (find it in the museum gift shop).",
    "Take the blame for something they did in class.",
    "Pass them a note during {subject} without getting caught.",
    "Win a team championship first.",
    "Out-trivia them at the museum's dinosaur exhibit.",
    "Help them carry groceries for a week.",
    "Tutor them until they pass the next {subject} quiz.",
]
MINIGAMES = ["tetherball", "four square", "HORSE", "rock-paper-scissors (best of 9)",
             "thumb wrestling", "the claw machine", "air hockey", "hopscotch",
             "kickball pickup", "stare-down contest"]
SUBJECTS = ["Math", "Reading", "Science", "Social Studies", "Spelling"]

# ---------------------------------------------------------------- world -----
NEIGHBORHOODS = {
    "Maple Hollow": ["Maple Ln", "Syrup St", "Acorn Ct", "Treehouse Way"],
    "Sunnyside Acres": ["Sunbeam Dr", "Lemonade Ln", "Daisy Ct", "Sprinkler Rd"],
    "Pickle Creek": ["Brine Ave", "Gherkin Way", "Creekside Rd", "Dill St"],
    "Oakridge Heights": ["Grand Oak Blvd", "Fountain Cir", "Hilltop Dr", "Polo Ln"],
    "Riverside Apartments": ["Building A", "Building B", "Building C", "Building D"],
    "Old Town": ["Main St", "Bakery Row", "Firehouse Ave", "Clocktower Sq"],
}
NEIGHBORHOOD_WEIGHTS = {"Maple Hollow": 20, "Sunnyside Acres": 20, "Pickle Creek": 18,
                        "Oakridge Heights": 12, "Riverside Apartments": 18, "Old Town": 12}

SCHOOLS = {"Suncrest Academy": 70, "Hilltop Prep (private)": 18, "Homeschooled": 6,
           "St. Bartholomew's": 6}
# Your school has three homerooms per grade.
TEACHERS = {
    2: ["Ms. Puddle", "Mr. Hopper", "Mrs. Glitter"],
    3: ["Mrs. Bramblebee", "Mr. Okonkwo", "Ms. Valdez"],   # player starts here
    4: ["Mr. Fussbudget", "Mrs. Tanaka", "Ms. Featherly"],
    5: ["Mrs. Grumbleton", "Mr. Sparks", "Ms. Abara"],
    6: ["(Suncrest Academy) Mr. Krantz", "(Suncrest Academy) Ms. Ruiz"],
}
LUNCH_PERIODS = ["11:00 (A Lunch)", "11:30 (B Lunch)", "12:00 (C Lunch)"]
RECESS_SPOTS = ["tetherball pole", "swings", "monkey bars", "blacktop four square",
                "kickball diamond", "under the slide", "sandbox", "the big oak tree",
                "library (indoor recess kid)", "nurse's office (frequent flyer)"]
SPECIALS = ["Art", "Music", "PE", "Library", "Computer Lab", "Spanish"]
AFTER_SCHOOL = {
    "Mall": ["arcade", "food court", "shoe store", "fountain", "pet store", "game shop"],
    "Library": ["kids' corner", "computer row", "reading nook", "homework tables"],
    "Museum": ["dinosaur hall", "space wing", "bug zoo", "gift shop"],
    "Grocery Store": ["candy aisle", "bottle return", "free samples", "cereal aisle"],
    "Home Neighborhood": ["front yard", "cul-de-sac", "driveway hoop", "creek"],
    "School": ["after-care room", "playground", "band room", "detention"],
}
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
WEEKEND_SLOTS = ["Sat AM", "Sat PM", "Sun AM", "Sun PM"]

# Rival teams already in the Jr League (grades 3-5) and the Middle League (6-8).
RIVAL_TEAMS = [
    ("Oakridge Thunder Ponies", "Soccer"), ("Riverside River Rats", "Soccer"),
    ("Mall Rats United", "Soccer"), ("Pickle Creek Kickles", "Soccer"),
    ("Pickle Creek Dillweeds", "Baseball"), ("Hilltop Polo Penguins", "Baseball"),
    ("Maple Hollow Maple Bats", "Baseball"), ("Old Town Clocktower Crows", "Baseball"),
    ("Maple Hollow Hoopsters", "Basketball"), ("Old Town Firecrackers", "Basketball"),
    ("The Library Lions", "Basketball"), ("Sunnyside Swish", "Basketball"),
    ("Sunnyside Sun Bears", "Football"), ("Suncrest Gravy Train", "Football"),
    ("Riverside Rapids", "Football"), ("Oakridge Golden Gophers", "Football"),
    ("Middle School Mega Moose (6-8)", "Football"), ("Suncrest Middle Meteors (6-8)", "Baseball"),
]
JR_TEAMS = [t for t in RIVAL_TEAMS if "6-8" not in t[0]]

GRADE_COUNTS = {2: 30, 3: 68, 4: 50, 5: 44, 6: 24}  # grade 6 = older "ringers"
assert sum(GRADE_COUNTS.values()) == KID_COUNT


def weighted(rng, table):
    keys = list(table)
    return rng.choices(keys, weights=[table[k] for k in keys])[0]


def clamp(v, lo=1, hi=99):
    return max(lo, min(hi, v))


def soften_top(v):
    """Squash values above 88 so A+/A++ stay rare instead of piling up at the cap."""
    return v if v <= 88 else int(88 + (v - 88) * 0.45)


def build_kid(rng, idx, grade, first, last, home):
    archetype = weighted(rng, ARCHETYPE_WEIGHTS)
    curve = weighted(rng, CURVE_WEIGHTS)
    # Overall talent: most kids are average, a few are stars, a few hopeless.
    talent = clamp(int(rng.gauss(58, 13)), 15, 92)
    if curve == "Phenom":
        talent = clamp(talent + 18, 60, 95)
    if curve == "Dud":
        talent = clamp(talent - 10, 10, 60)

    stats = {}
    bias = ARCHETYPES[archetype]
    for code in STAT_CODES:
        v = talent + bias.get(code, 0) + int(rng.gauss(0, 9))
        stats[code] = clamp(soften_top(v))
    if curve == "Morale Machine":
        stats["TMW"] = clamp(soften_top(stats["TMW"] + 25))
        stats["HUS"] = clamp(soften_top(stats["HUS"] + 15))

    potential = clamp(talent + int(rng.gauss(10, 10)) + (15 if curve in ("Late Bloomer", "Phenom") else 0)
                      - (12 if curve in ("Dud", "Early Peaker") else 0), 20, 99)
    peak_grade = {
        "Early Peaker": rng.choice([5, 6, 7]), "Late Bloomer": rng.choice([11, 12]),
        "Growth Spurt": rng.choice([9, 10, 11]), "Dud": rng.choice([6, 7, 8]),
    }.get(curve, rng.choice([10, 11, 12]))

    personality = weighted(rng, PERSONALITIES)
    traits = rng.sample(TRAITS, 2)
    if personality in ("Troublemaker", "Class Clown", "Prankster") and rng.random() < 0.5:
        traits[0] = "Easily Bribed"
    if personality == "Rule Follower" and rng.random() < 0.6:
        traits[0] = "Snitch (tells on you if friendship < 40)"

    height_in = round(rng.gauss(50 + (grade - 3) * 2.3, 2.6), 1)
    build = rng.choice(BUILDS)
    if build == "tall-for-age":
        height_in += 3
    if build == "small-for-age":
        height_in -= 3

    school = weighted(rng, SCHOOLS)
    if grade >= 6:
        school = "Suncrest Academy"
    neighborhood, street, house = home

    if school == "Suncrest Academy":
        homeroom = rng.choice(TEACHERS[min(grade, 6)])
    else:
        homeroom = None

    routine = {
        "school": school,
        "homeroom": homeroom,
        "lunch": rng.choice(LUNCH_PERIODS) if homeroom else None,
        "recess_spot": rng.choice(RECESS_SPOTS) if homeroom else None,
        "specials_day": {d: rng.choice(SPECIALS) for d in DAYS} if homeroom else None,
        "before_school": rng.choice(["bus stop", "walks with sibling", "car drop-off",
                                     "bikes", "early breakfast club", "late again"]),
        "after_school": {},
        "weekend": {},
    }
    favorite_places = rng.sample(list(AFTER_SCHOOL), 3)
    for d in DAYS:
        loc = rng.choice(favorite_places)
        routine["after_school"][d] = f"{loc}: {rng.choice(AFTER_SCHOOL[loc])}"
    for slot in WEEKEND_SLOTS:
        loc = rng.choice(favorite_places + ["Home Neighborhood"])
        routine["weekend"][slot] = f"{loc}: {rng.choice(AFTER_SCHOOL[loc])}"

    # Recruitment status
    roll = rng.random()
    if roll < 0.52:
        status, team, difficulty = "Free Agent", None, rng.choice(["Easy", "Easy", "Medium"])
    elif roll < 0.77:
        status, team, difficulty = "On Rival Team (Poachable)", rng.choice(JR_TEAMS)[0], rng.choice(["Medium", "Hard"])
    elif roll < 0.88:
        status, team, difficulty = "On Rival Team (Loyal)", rng.choice(JR_TEAMS)[0], "Locked this season"
    else:
        status, team, difficulty = "Not Into Sports (Yet)", None, rng.choice(["Medium", "Hard"])
    if grade == 2 and team:
        # Too young for the Jr League; they sign with someone next year.
        status, team, difficulty = "Free Agent", None, "Too young (joins Jr League next year)"
    if grade >= 6:
        if rng.random() < 0.6:
            team = rng.choice([t for t, _ in RIVAL_TEAMS if "6-8" in t])
            status = "On Rival Team (Poachable)"
        difficulty = "Ineligible for Jr League (ringer candidate)"

    hook = rng.choice(RECRUIT_HOOKS).format(
        minigame=rng.choice(MINIGAMES), spot=rng.choice(RECESS_SPOTS),
        like=rng.choice(LIKES), n=rng.choice([2, 3, 4, 5]), subject=rng.choice(SUBJECTS))

    likes = rng.sample(LIKES, 2)
    sport_pref = rng.sample(["Soccer", "Baseball", "Basketball", "Football"], 2)
    if team:
        rival_sport = dict(RIVAL_TEAMS)[team]
        sport_pref = [rival_sport] + [s for s in sport_pref if s != rival_sport][:1]

    nickname = rng.choice(NICKNAME_POOL) if rng.random() < 0.35 else None
    school_avg = clamp(int(rng.gauss(78, 10)) + (8 if personality in ("Bookworm", "Teacher's Pet", "Know-It-All") else 0)
                       - (8 if personality in ("Troublemaker", "Class Clown", "Daydreamer") else 0), 40, 100)

    return {
        "id": f"KID-{idx:03d}",
        "first_name": first,
        "last_name": last,
        "nickname": nickname,
        "grade_at_start": grade,
        "looks": {
            "skin_tone": rng.choice(SKIN_TONES),
            "hair_style": rng.choice(HAIR_STYLES),
            "hair_color": rng.choice(HAIR_COLORS),
            "eye_color": rng.choice(EYE_COLORS),
            "build": build,
            "height_in": round(height_in, 1),
            "accessories": rng.sample(ACCESSORIES, rng.choice([1, 1, 2])),
            "favorite_color": rng.choice(OUTFIT_COLORS),
        },
        "residence": {"neighborhood": neighborhood, "address": f"{house} {street}"},
        "personality": personality,
        "traits": traits,
        "likes": likes,
        "sport_preferences": sport_pref,
        "school_average": school_avg,
        "athletic_archetype": archetype,
        "stats": stats,
        "stat_grades": {k: letter(v) for k, v in stats.items()},
        "hidden": {
            "potential": potential,
            "potential_grade": letter(potential),
            "growth_curve": curve,
            "peak_grade": peak_grade,
            "coachability": clamp(int(rng.gauss(60, 18))),
            "sneakiness": clamp(int(rng.gauss(45, 20)) + (20 if personality in ("Troublemaker", "Prankster") else 0)),
        },
        "recruitment": {
            "status": status,
            "current_team": team,
            "difficulty": difficulty,
            "recruit_hook": hook,
            "starting_friendship": rng.randint(0, 30),
        },
        "routine": routine,
    }


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)

    firsts = rng.sample(FIRST_NAMES, KID_COUNT)  # every kid has a unique first name
    grades = [g for g, n in GRADE_COUNTS.items() for _ in range(n)]
    rng.shuffle(grades)

    # ~30 sibling pairs share a last name and a house; everyone else gets their own.
    used_addresses = set()

    def new_home():
        while True:
            hood = weighted(rng, NEIGHBORHOOD_WEIGHTS)
            street = rng.choice(NEIGHBORHOODS[hood])
            house = rng.randint(1, 99) * (1 if hood == "Riverside Apartments" else 10) + rng.randint(0, 9)
            if hood == "Riverside Apartments":
                house = f"Apt {rng.randint(1, 4)}{rng.randint(0, 2)}{rng.randint(1, 9)},"
            if (hood, street, house) not in used_addresses:
                used_addresses.add((hood, street, house))
                return hood, street, house

    kids, idx, i = [], 1, 0
    last_pool = LAST_NAMES[:]
    rng.shuffle(last_pool)
    sibling_pairs = 30
    while i < KID_COUNT:
        home = new_home()
        last = last_pool[(idx - 1) % len(last_pool)] if idx <= len(last_pool) else rng.choice(LAST_NAMES)
        family_size = 2 if sibling_pairs > 0 and i + 1 < KID_COUNT and rng.random() < 0.3 else 1
        if family_size == 2:
            sibling_pairs -= 1
        family_ids = []
        for _ in range(family_size):
            kid = build_kid(rng, idx, grades[i], firsts[i], last, home)
            kids.append(kid)
            family_ids.append(kid["id"])
            idx += 1
            i += 1
        for kid in kids[-family_size:]:
            kid["siblings"] = [k for k in family_ids if k != kid["id"]]

    names = {(k["first_name"], k["last_name"]) for k in kids}
    assert len(names) == KID_COUNT, "full names must be unique"

    meta = {
        "seed": SEED,
        "count": len(kids),
        "grade_scale": [name for _, name in GRADE_TIERS],
        "stats": [{"code": c, "name": n, "revealed_by_drill": d} for c, n, d in STATS],
        "growth_curves": GROWTH_CURVES,
        "rival_teams": [{"name": n, "sport": s} for n, s in RIVAL_TEAMS],
    }
    (out_dir / "kids.json").write_text(json.dumps({"meta": meta, "kids": kids}, indent=2) + "\n")

    with open(out_dir / "kids.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "nickname", "grade", "neighborhood", "address", "school", "homeroom",
                    "personality", "traits", "archetype", "growth_curve", "potential"]
                   + STAT_CODES + ["status", "current_team", "recruit_hook"])
        for k in kids:
            w.writerow([k["id"], f'{k["first_name"]} {k["last_name"]}', k["nickname"] or "",
                        k["grade_at_start"], k["residence"]["neighborhood"], k["residence"]["address"],
                        k["routine"]["school"], k["routine"]["homeroom"] or "", k["personality"],
                        "; ".join(k["traits"]), k["athletic_archetype"], k["hidden"]["growth_curve"],
                        k["hidden"]["potential_grade"]]
                       + [k["stat_grades"][c] for c in STAT_CODES]
                       + [k["recruitment"]["status"], k["recruitment"]["current_team"] or "",
                          k["recruitment"]["recruit_hook"]])
    print(f"Wrote {len(kids)} kids to {out_dir}")


if __name__ == "__main__":
    main()
