# PFP generator

Renders the lightning-block avatar pack (`pfp/` in this repo): 18 animations × WebP/GIF/APNG plus hi-res stills.

```bash
pip install pillow
python scripts/pfp/pfp.py scripts/pfp/avatar-grid24.json out/            # everything
python scripts/pfp/pfp.py scripts/pfp/avatar-grid24.json out/ 06 13     # only animations starting with 06, 13 (+ stills)
python scripts/pfp/gallery.py out/                                       # writes out/gallery.html
```

- `avatar-grid24.json` — the original avatar sampled to its native 24×24 pixel grid (`[row][col] = [r, g, b]`).
- Add a variant: write an `anim_*(art, bg)` function returning `(frames, ms_per_frame)` and add it to `jobs` at the bottom of `pfp.py`.
  `bg` is one of `dirt`, `night`, `black`, `clear` (transparent → exported as WebP + APNG instead of GIF).
