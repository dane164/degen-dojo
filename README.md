# DEGEN DOJO ($DOJO)

A retro 16-bit arcade fighter: 24 original meme-archetype fighters, 12 arenas, you vs CPU. It's pure static HTML/CSS/JS, so there's no build step and no dependencies (Google Fonts is the only external request).

## Run
Open `index.html`, or serve the folder:
```
npx serve .        # or: python3 -m http.server
```
Deploy as-is to Vercel, Netlify, GitHub Pages or Cloudflare Pages.

## Files
| File | What it does |
|---|---|
| `js/data.js` | Roster (names, taglines, colours, special per fighter, stats) and arena list (names + chiptune seeds). Start here to rename or rebalance. |
| `js/sprites.js` | Procedural pixel-art fighters (head types, accessories, poses), outlined and cached. |
| `js/arenas.js` | 12 procedural pixel backgrounds and their animated layers. |
| `js/game.js` | Fight engine: physics, normals, blocking, hit and chip damage, 24 special moves, projectiles, rounds, HUD, and the CPU AI (easy/normal/hard). |
| `js/audio.js` | WebAudio chiptune generator (a unique song per arena), SFX, and the robot announcer via speechSynthesis. |
| `js/main.js` | Screens (title, 3-step select, fight, pause, result, how-to), keyboard and touch input, game loop. |
| `css/style.css` | Orange retro UI. Theme tokens are at the top (`--or`, `--cream`, `--br`, etc.). |

## Controls
A/D move · W jump · S crouch · double-tap to dash · J punch · K kick · Space block (S+Space low block) · L special (hold to charge) · Esc pause. On mobile you get on-screen buttons.

## Tuning cheatsheet
- Damage and frame data: `ATK` table at the top of `game.js`
- Fighter speed, power and defence: `stats` in `data.js`
- Rounds needed / round time: `WINS_NEEDED`, `ROUND_TIME` in `game.js`
- CPU difficulty: `LEVELS` in `game.js`
- To swap in hand-drawn sprites later, replace `DD.Sprites.get()` so it returns your own canvas or image per pose. Set `_ox` and `_oy` to the foot origin.
