# Recess Rivals: 3D character model spec

The character sheets in `art/characters/` are the design target. This spec
says how to turn them into 3D models the game can load. Read the Character
Design Bible for style: proportions, line, palette.

## What has to be built

The game needs two kinds of character:

1. **The player's kid.** The creator lets players mix skin, hair style and color,
   eyes, build, top, bottom, pants color, shoes, shoe color, a hat and one
   signature item. One finished model can't cover that. The player needs a
   **modular kit**: parts that snap onto shared bodies and take their colors
   from the game.
2. **Roster kids (216) and named grown-ups (34).** Kids grow from grade 3 to
   grade 8 during a save, so each kid needs a body for each grade band.

Recommended: build **one kit** and assemble everyone from it (roster kids are
listed in `art/characters/manifest.json` with the parts they wear). That is
about 150 parts instead of 250+ full models × 3 grade bands.

Fallback for NPCs only: one full model per roster kid or grown-up, made
from their sheet (an image-to-3D tool can do this; see "Image-to-3D tools"
below). The player still needs the kit.

## Format

- glTF binary (`.glb`), Y up, facing +Z, feet on the origin.
- Any scale: the game rescales each kid to its height. Model at about
  1.2 m for a grade-3 kid so shapes read correctly.
- Up to 8,000 triangles per assembled kid; textures up to 1024²; under 1.5 MB per file.
- Toon look: flat colors with one shade step, as in the sheets. No PBR detail
  textures. The game adds the ink outlines and lighting.

## Bodies and rig

- Bodies: `body_g34` (4.5 heads), `body_g56` (5 heads), `body_g78` (5.5 heads),
  `body_adult` (6.2 heads). Builds come as shape keys on each body:
  `skinny`, `stocky`, `round` (average = no key). Heads are 100 bible units
  tall; measure everything else from the sheets.
- Pose: the sheets' relaxed A-pose.
- Skeleton: Mixamo humanoid bone names (`mixamorig:Hips`, `mixamorig:Spine`, ...)
  so animations can be shared and retargeted. Every kit part is skinned to the same skeleton.

## Animations

In place (no root motion), looping unless noted, named exactly:
`idle`, `walk`, `run`, `sit`, `cheer`, `talk`, `throw` (once), `swing` (bat, once),
`kick` (once), `catch` (once). One shared set on the `body_g34` skeleton,
retargeted to the other bodies.

## Faces

The game paints faces from the bible (eyes, brows, nose and mouths for each
expression, plus blink and talk), so heads keep a **front-projected face UV**:
- Material named `Face`, UVs front-projected over the face area.
- The bible head (x 151–249, y 80–183) maps to UV 0–1.
- No modelled eyes or mouth.

## Recolorable materials

Name materials by slot; the game tints them from the palette
(`art/charstyle/palette.js`). Use white or light-gray base colors so tints come out true:
`Skin`, `SkinShade`, `Hair`, `HairShade`, `Top`, `TopSecond`, `Bottom`,
`Leggings`, `Sock`, `ShoeUpper`, `Sole`, `Accent`, `Metal`, `Lens`.
Fixed-color details (logos, laces) can use any other name.

## Kit parts (file names)

- **Hair** (`hair_<style>.glb`): buzz cut, crew cut, fade, side part, spiky, faux hawk,
  mohawk, cowlick, messy mop, curtains, bowl cut, shaggy, pixie, curly top,
  curly afro, high puff, twists, locs, cornrows, box braids, braids, french
  braid, pigtails, ponytail, headband + ponytail, space buns, top bun, bob,
  long straight, long wavy, bald, bun (grown-ups).
  - Every hair also needs a `<style>_hat` variant tucked under hats. Big styles
    (afro, braids, long hair) stay visible around the hat, as in the sheets.
- **Tops** (`top_<name>.glb`, short or long sleeve as drawn): tee, graphic tee
  (chest print on a `Print` material), polo, raglan, hoodie, sweater, flannel,
  jacket, jersey, tank, overalls (bib + straps), dinosaur hoodie.
  - Grown-ups add: cardigan, vest, tie, suit, lab coat, windbreaker, scrubs, track jacket.
- **Bottoms**: shorts, cargo shorts, jeans, joggers, khakis, leggings, skirt
  (with leggings under it). Grown-ups add: slacks, track pants, scrubs.
- **Shoes**: sneakers, high-tops, slip-ons, cleats, boots, rain boots, sandals,
  light-up sneakers. Grown-ups add: dress shoes, loafers, flats.
- **Hats**: baseball cap, backwards cap, beanie, bucket hat. Grown-ups add:
  top hat, viking helmet.
- **Accessories**: glasses, sport goggles, goggles up, headphones, sweatband,
  bandana, scarf, star earrings, hearing aids, eye patch, braces (face
  paint), superhero cape, giant backpack, fanny pack, friendship bracelets,
  cast, knee pads, band-aid, lucky socks, whistle, mustache, beard.
- **Props held in hand**: bat, glove, ball (each sport), clipboard, book.

## Image-to-3D tools

`npm run art && npm run art:png` writes every sheet as a cropped,
transparent PNG to `art/characters/png/` and zips them as
`art/characters/reference-pack.zip`. Each file is named by its manifest id.
Image-to-3D services take one of these and return a textured mesh. Most can
also auto-rig it with a Mixamo-style skeleton.
- They give one baked mesh per character: fine for roster NPCs, but not modular,
  so they can't build the player's kit.
- They have to guess the back and sides from a front view. Ask for a
  side and back view of a character when it needs to be exact.
- Check the face area: it must stay smooth and front-UV'd so the game can
  paint expressions on it.

## Where files go

```
models/characters/kit/body_g34.glb, hair_spiky.glb, top_tee.glb, ...
models/characters/npc/KID-001.glb, ADULT-CoachDave.glb   (fallback route)
models/characters/anims.glb                              (shared clips)
```

The loader is not built yet. When it is, it will load these at runtime and
fall back to the current procedural models for anything missing, so parts
can arrive a few at a time.
