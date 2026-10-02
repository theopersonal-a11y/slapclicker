# ✋ Slap Clicker

A Cookie Clicker–style idle game about slapping, with real-time 3D graphics (Three.js + bloom).

## Run it

Needs Node 18+. No dependencies.

```sh
npm start          # http://localhost:3000
```

`PORT` changes the port; `DATA_DIR` changes where saves are stored (default `./data`).

## Saves

- Progress is kept in your browser **and** in a JSON file on the server: `data/saves.json`, keyed by a random player ID per browser. On load the game uses whichever copy is newer.
- **☁️** shows your player ID. Paste it on another device to load the same save.
- **💾** downloads your save as a `.json` file and **📂** loads one back.
- If you host only the static files (no `server.js`), the game still works and saves to the browser only.

## Deploy to Render

The repo includes a `render.yaml` Blueprint.

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com/): **New + → Blueprint**, pick the repo, then **Apply**.
3. Render runs `npm install` and `npm start`, and health-checks `/healthz`. The game is served at your `*.onrender.com` URL.

The free plan wipes the server filesystem on every deploy or restart, and spins the service down when idle, so `saves.json` doesn't last there (browser saves and exported files still do). To keep server saves permanently, use a paid plan with a persistent disk: see the commented lines in `render.yaml`.

## How to play

- **Click / tap / Space** to slap the opponent. Rapid slaps build a **combo** (up to ×2), and 5% of slaps are **critical** (×10).
- Every opponent has HP. **Knock them out** for a big slap bonus and a permanent **+3% production**. Each new foe is tougher (Grumpy Neighbor, Pirate Pete, Viking Vern, Shogun Ken, the Demon King…).
- **Weapons** set your slap power and change what you swing:
  Bare Hand → Wet Fish → Frying Pan → Baseball Bat → **Katana** → **Dual Katanas** → **Plasma Katana** → Cosmic Gauntlet → **Galaxy Blade**.
- **Slappers** slap for you automatically: interns, rubber chickens, robots, ninjas, samurai, dragons, interdimensional portals, and the Hand of God. They show up in the arena and fight alongside you.
- **Upgrades** multiply slappers, clicks, crits, and more.
- Click the **Golden Hand** when it floats by for a Frenzy, a lucky bonus, or a Slap Storm.

Progress auto-saves (see below), and your slappers keep earning (at 50%) while you're away, up to 8 hours.

## Files

- `server.js`: static file server + JSON save API (`/api/save/:id`)
- `render.yaml`: Render deployment Blueprint
- `index.html`, `css/style.css`: page and HUD
- `js/main.js`: game loop, economy, animation, UI
- `js/models.js`: procedural 3D models (weapons, opponents, slappers, dojo arena)
- `js/data.js`: balance data (weapons, slappers, upgrades, foes)
- `js/storage.js`: browser/server saving, export and import
- `js/audio.js`: synthesized sound effects (WebAudio, no asset files)
