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
| `js/arenas.js` | 12 pixel-art arenas (dithered, with foreground layers) plus the shared pixel toolkit `DD.Pix`. |
| `js/scene.js` | Full-page sunset dojo backdrop behind the UI, with drifting petals. |
| `js/game.js` | Fight engine: physics, normals, blocking, hit and chip damage, 24 special moves, projectiles, rounds, HUD, and the CPU AI (easy/normal/hard). |
| `js/audio.js` | WebAudio chiptune generator (a unique song per arena), SFX, and the robot announcer via speechSynthesis. |
| `js/main.js` | Screens (title, 3-step select, fight, pause, result, how-to), keyboard and touch input, game loop. |
| `css/style.css` | Orange retro UI. Theme tokens are at the top (`--or`, `--cream`, `--br`, etc.). |

## Controls
A/D move, W jump, S crouch, double-tap to dash. Left-click (or J) punches, right-click (or K) kicks. Space blocks, and tapping it just before a hit parries. Space + left-click throws. E, L or middle-click fires the special (hold to charge). Esc pauses. Mobile gets on-screen buttons.

Move list: punch ×3 chain (jab › straight › launcher uppercut), kick ×2 (› roundhouse), toward+P overhead, back+P anti-air, toward+K lunge kick, down+P/K lows and sweep, air down+K dive kick, block+P throw, attack out of a dash. Blocking drains a guard bar; when it empties you go dizzy.

## Tuning cheatsheet
- Damage, frame data and chain routes: `ATK` table at the top of `game.js`
- Fighter speed, power and defence: `stats` in `data.js`
- Rounds needed / round time: `WINS_NEEDED`, `ROUND_TIME` in `game.js`
- CPU difficulty: `LEVELS` in `game.js`
- To swap in hand-drawn sprites later, replace `DD.Sprites.get()` so it returns your own canvas or image per pose. Set `_ox` and `_oy` to the foot origin.
