# Every Possible Book

An incremental game with word puzzles and literary horror. You are a lone librarian with one shelf
and a printing press that makes books of random letters. Almost all of them are gibberish, but now and
then a real word turns up, then a sentence, then a whole page that makes sense. Meaning is your
currency. You spend it on more presses, faster binding, indexing machines, and librarians who hunt for
meaning on their own. The library grows from a room to a tower to something without walls.

As the library gets closer to holding *every possible book*, the random volumes start describing things
they shouldn't: the library, the choices you made, and then you. Late in the game the books predict what
you will buy next. The last act is a search through the Infinite Stacks for the one book that explains
who built the library, and why you've been in it so long.

TypeScript + PixiJS 8, packaged with Electron for Steam. All the art is typography and procedural
architecture, and every sound is synthesised at runtime.

## Playing

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (`ELECTRON_SKIP_BINARY_DOWNLOAD=1` if you only want the web build) |
| `npm run dev` | Build with source maps and serve on http://localhost:8095 |
| `npm run build` | Release bundle in `dist/` (open `dist/index.html` through any static server) |
| `npm run electron` | Run the desktop build |
| `npm run dist[:win\|:mac\|:linux]` | Package with electron-builder into `release/` |
| `npm test` | Unit tests plus a full-game pacing test (a bot plays to the end, about 40 s) |
| `npm run sim -- 16` | Print the bot's milestone timeline for up to 16 hours of play |
| `npm run e2e` | Boot the built game in headless Chromium, play through and take screenshots |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run steam:achievements` / `steam:icons` | Regenerate `steam/achievements.csv` and the badge images |

Controls: click the shelves (or press **Space**) to read, **L** for a lucid page, **1–8** to buy buildings
(**Shift** buys ten), **Tab** to cycle tabs, **Esc** to close, **F11** for fullscreen on desktop. The mouse
wheel zooms the library and dragging pans it.

## Structure of the game

| Act | Layer | New system | Roughly |
| --- | --- | --- | --- |
| I. The Room | **Shelves**: seal the shelf to forget the run and keep shelves | Translation machines (6 alphabets, including your own handwriting reversed) | 0–3 h |
| II. The Tower | **Floors**: seal every shelf on a floor and climb | The catalog: clerks write cards, drawers lend bonuses, searches pick the next page | 3–7 h |
| III. The Wings | **Wings**: open a wing over nothing | Forbidden sections: read under dread, earn seven keys; the desk book starts predicting your purchases | 7–10 h |
| IV. The Stacks | — | Hex-gallery exploration seven levels down, lit by a lamp that keeps running dry | 10–11 h+ |

The bot in `tests/bot.ts` plays near-optimally (it clicks three times a second, seals at the right
moments, and solves 85% of every word hunt) and finishes in just under 11 hours. A person reading the
texts and exploring by feel will take longer. `tests/pacing.test.ts` fails the build if the curve moves
outside its window.

- **Word hunts (lucid pages):** every few minutes a page on the shelf starts to shine. You drag across
  straight lines of letters to find the hidden words before it fades. Grids get bigger and the
  directions harder as you go. Late in the game the hidden words are about you, your name among them.
  Mirrors in the stacks hide puzzles too, and the final page hides one sentence.
- **209 found texts:** stories, poems, letters, ledgers, marginalia, prophecies and endings. They arrive
  in order as the library grows, from translation machines, from forbidden sections and from desks in the
  stacks. Many are templates that fill in your name, the clock, your first purchases, how often you tried
  the door, and what the desk book predicts.
- **Three endings:** *Finish* (read the book nobody printed), *Burn* (strike the match from the Section of
  Fire) or *Abandon* (open the door). After an ending you can go back to the Center and choose differently,
  or begin again; a new cycle keeps your endings and achievements and gives a 1.5× meaning bonus.
- **45 Steam achievements** with generated badge art (`steam/achievements/`), a Steamworks bridge in
  `electron/main.cjs`, Steam Cloud-friendly saves (`library.sav` in the user data folder) and a
  `steam/app_build.vdf` depot template.

## Code map

```
src/core/        pure game logic, no DOM: engine (rates, purchases, prestige, the clock), defs (all
                 numbers), state + save, story (which text next, templating), stacks, puzzle, text
                 (the press), achievements
src/content/     the found texts, one file per act or source
src/render/      PixiJS: letter rain, the library (room, tower, wings), the stacks map, camera, effects
src/ui/          DOM panels, modals (reader, word hunt, register, endings), settings
src/audio/       WebAudio synthesis: the drone, press clatter, page turns, bells
electron/        desktop shell, Steamworks bridge, file saves
tests/           unit tests, the pacing bot and simulation, the browser smoke test
```

The pacing numbers all live in `src/core/defs.ts` plus the prestige constants at the top of the
prestige section in `src/core/engine.ts`. After changing them, run `npm run sim` to see the new
timeline.
