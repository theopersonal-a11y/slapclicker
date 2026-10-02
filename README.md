# ✋ Slap Clicker

A Cookie Clicker–style idle game about slapping, with real-time 3D graphics (Three.js + bloom).

**Play:** open `index.html` through any static web server (ES modules don't load from `file://`):

```sh
npx http-server .   # or: python3 -m http.server
```

Then visit http://localhost:8080 (or :8000 for Python).

## How to play

- **Click / tap / Space** to slap the opponent. Rapid slaps build a **combo** (up to ×2), and 5% of slaps are **critical** (×10).
- Every opponent has HP. **Knock them out** for a big slap bonus and a permanent **+3% production**. Each new foe is tougher (Grumpy Neighbor, Pirate Pete, Viking Vern, Shogun Ken, the Demon King…).
- **Weapons** set your slap power and change what you swing:
  Bare Hand → Wet Fish → Frying Pan → Baseball Bat → **Katana** → **Dual Katanas** → **Plasma Katana** → Cosmic Gauntlet → **Galaxy Blade**.
- **Slappers** slap for you automatically: interns, rubber chickens, robots, ninjas, samurai, dragons, interdimensional portals, and the Hand of God. They show up in the arena and fight alongside you.
- **Upgrades** multiply slappers, clicks, crits, and more.
- Click the **Golden Hand** when it floats by for a Frenzy, a lucky bonus, or a Slap Storm.

Progress auto-saves to your browser, and your slappers keep earning (at 50%) while you're away, up to 8 hours.

## Files

- `index.html`, `css/style.css`: page and HUD
- `js/main.js`: game loop, economy, animation, UI
- `js/models.js`: procedural 3D models (weapons, opponents, slappers, dojo arena)
- `js/data.js`: balance data (weapons, slappers, upgrades, foes)
- `js/audio.js`: synthesized sound effects (WebAudio, no asset files)
