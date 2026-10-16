# Character art

`charstyle/` renders every character in the game in the Character Design Bible style
(front view, A-pose, 400×720 SVG, ground at y 680, head-height lines every 100 px).

```
npm run art   # -> art/characters/{kids,adults}/*.svg + manifest.json
```

- `palette.js` — bible palette, plus marked additions the roster needed (lime, sky, gray, charcoal, two skin tones, light-brown and strawberry-blonde hair, amber eyes).
- `hair.js` — all 25 roster hairstyles plus `bun` and `bald` for adults.
- `figure.js` — proportions by grade band, builds, outfits by personality and favorite color, accessories, faces.
- `adults.js` — the 34 named adults (teachers, coaches, principal, nurse, parents), each specified by hand.

Kids are drawn at their roster `grade_at_start`. The in-game procedural 3D models follow the same proportions, faces and palette.

```
npm run art:png   # -> art/characters/png/*.png + reference-pack.zip (cropped, transparent; for 3D modelling)
```

See `3d/MODEL_SPEC.md` for how the sheets become real 3D models.
