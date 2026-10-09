# 🍟 French Fried!

A single-player card game about discovering **1,001 french fry recipes**.

Play ingredient cards from your hand onto a boat of fries — every card you play is drawn onto the
illustration (ketchup drizzles, cheese melts, a cowboy hat lands on top). Hit **Fry It!** to find out
whether you've invented something new. Discover them all to win.

## Features

- **1,001 recipes**: ~200 handcrafted (Poutine, Salt & Vinegar, Animal Style, Cowboy Fries, The
  Billionaire Platter...) plus a seeded generator that fills the rest with stable, silly combinations.
  Every player gets the same book.
- **109 illustrated cards**: 43 basic ingredients, 26 premium ingredients and 40 thrift-store objects,
  all drawn as vector art in code. Each one also has a topping layer for the fry boat.
- **Card packs**: Basic Packs ($30) from the start. Premium Packs unlock after 15 recipes (one-time $250).
- **Thrift Store** (mid game, 120 recipes): three objects for sale. Restock for cash or wait for the
  real-time 30-minute timer. Objects go into your deck and make the strangest recipes.
- **The Lab** (late game, 300 recipes): grow GMO fries, splice in 18 traits (Curly, Spicy Gene,
  Vampire Spud, Tater Tot Form...), train stats and breed new generations.
- **The Fryer**: an auto-battle arena with four leagues. Each win pays out. A fry that loses is fried
  and gone for good. Win every round in a league to become its champion.
- Hints: if a combo is one card short of a recipe, or has one card too many, the game tells you. You
  can also buy recipe rumors. Deck management lets you bench cards or sell spare copies.
- 18 achievements, generated sound effects and music, keyboard shortcuts, autosave, and save
  export/import.

## Play

- **Web**: open `index.html` through any static server (`npm run dev`) or play the deployed GitHub Pages build.
- **Single file**: `npm run build` produces a fully self-contained `dist/index.html` (fonts inlined,
  works offline, ready for itch.io).

Controls: click cards, or use `1`–`8` to play, `Enter` to fry, `Backspace` to undo, `R` to redraw,
`F11` for fullscreen and `Esc` to close dialogs.

## Develop

```bash
npm install          # set ELECTRON_SKIP_BINARY_DOWNLOAD=1 if you only need the web build
npm run dev          # serve the unbundled source at http://localhost:8080
npm test             # data integrity, economy, lab and fryer tests
npm run build        # dist/index.html single-file build
npm run electron     # run the desktop build locally
```

The code has no runtime dependencies. It is plain ES modules:

| Path | What |
| --- | --- |
| `src/data/` | ingredients, objects, recipe book + generator |
| `src/art/` | SVG card art, fry boat renderer, GMO fry characters |
| `src/game/` | state/saves, kitchen (deck/hand/frying), shops, lab & fryer, achievements |
| `src/ui/` | screens |
| `electron/` | desktop shell + preload (fullscreen, quit, Steam achievements) |
| `steam/` | SteamPipe build template and achievement list |

## Shipping on Steam

1. Create the app in Steamworks. Add the achievements from `steam/achievements.csv` (API names are
   the upper-cased achievement ids).
2. `npm run dist:win` / `dist:mac` / `dist:linux` (or run the **Desktop builds** GitHub workflow) to
   produce the `release/*-unpacked` folders.
3. Set your App ID and depot IDs in `steam/app_build.vdf`, then upload with SteamPipe:
   `steamcmd +login <user> +run_app_build ../steam/app_build.vdf +quit`.
4. Steam integration uses the optional `steamworks.js` dependency. The game reads the App ID from
   `STEAM_APP_ID` or `steam_appid.txt`, and runs fine without Steam.
