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
| `js/online.js` | Ranked online: anonymous profiles, matchmaking/ELO RPCs, WebRTC P2P link with Supabase relay fallback, host/guest netcode. |
| `js/main.js` | Modes (Ranked / VS CPU / VS Friend), screens, leaderboard, keyboard + mouse + split-keyboard + gamepad + touch input, game loop. |
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

## Game modes
- **Ranked online**: pick a fighter, then queue. You're matched against the closest ELO (the range widens the longer you wait), the arena is random, and it's best of 3. Results move ELO (K=32) and show on the leaderboard.
- **VS CPU**: easy / normal / hard.
- **VS Friend (local)**: one keyboard. P1 uses `WASD` + `F` punch / `G` kick / `T` block / `H` special. P2 uses arrows + `,` punch / `.` kick / `Right Shift` block / `/` special (or numpad 1/2/0/3). Gamepad 1 is P1 and gamepad 2 is P2.

## Online architecture
- **Backend:** Supabase project `degen-dojo` (ref `joweztiusidvcmjmxjsr`, Sydney region). The URL and publishable key are at the top of `js/online.js`. The publishable key is safe to ship.
- **Security:**
  - Tables (`dd_players`, `dd_secrets`, `dd_queue`, `dd_matches`) have RLS on with no policies, so the browser can't read or write them directly.
  - Everything goes through `SECURITY DEFINER` RPCs: `dd_register`, `dd_me`, `dd_rename`, `dd_queue_join`, `dd_queue_leave`, `dd_heartbeat`, `dd_report`, `dd_top`, `dd_stats`.
  - Each RPC checks the player's secret, which is stored only as a SHA-256 hash.
  - Internal helpers live in the `dd_private` schema, which the API can't reach.
- **Identity:** players pick a name and get an id + secret saved in `localStorage`. There's no sign-up. Clearing browser data loses that profile.
- **Matchmaking:** clients poll `dd_queue_join` every 2s. Pairing uses `FOR UPDATE SKIP LOCKED` so two players can't both grab the same opponent.
- **Netcode:**
  - Both players join a Supabase Realtime channel `dd-<match_id>` for signalling, then open a WebRTC data channel (STUN: Google + Cloudflare).
  - If P2P doesn't open within 7s, traffic relays over the Realtime channel instead (higher latency).
  - The host (the player who queued first) simulates the fight and streams snapshots at 30Hz (15Hz on relay). The guest streams inputs using press counters, so taps are never dropped.
  - The host's own input is delayed by about half the round trip to keep it fair.
- **Results:**
  - Both players report the winner. If the reports agree, ELO applies. If they conflict, the match is voided.
  - If one player vanishes (no heartbeat for 20s), the remaining report counts after 10s.
- **Known limits:**
  - A determined cheater with two accounts can farm ELO. Fixing that needs server-side simulation.
  - Supabase's free Realtime tier caps messages per second, but that only matters for relayed matches. Most matches go P2P.
- **Test accounts:** four `zzTest*` accounts from my backend testing are hidden from the leaderboard. You can delete them in the Supabase dashboard (Table editor → `dd_players`).
- **Where it works:** online play needs the real site (GitHub Pages / Vercel / any static host). The Claude artifact preview blocks outside network calls, so only CPU and local modes work there.
