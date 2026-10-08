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

- **Click / tap / Space** to slap the opponent. Rapid slaps build a **combo** (up to ×2, more with upgrades), and 5% of slaps are **critical** (×10).
- Every opponent has HP. **Knock them out** for a big slap bonus and a permanent **+3% production**. There are 24 opponents (Pirate Pete, Chef Gordo, Disco Dave, El Slapador, Astro Andy, the Demon King…), and they come back tougher each lap.
- **Bosses** show up every 5th level (Sumo Supreme, Robo-Overlord, The Slap Lich, Void Titan…). They have 3× HP and a **30-second timer**: beat them in time for double rewards and a treasure chest, or they heal and you try again.
- **Worlds**: every 10 levels the arena changes: Dojo at Dusk, Neon City, Frozen Peak, Volcano Arena, Toxic Swamp, Candy Land, Outer Space, Golden Heaven.
- **21 weapons** set your slap power and change what you swing:
  Bare Hand → Boxing Glove → Wet Fish → Flip-Flop → Frying Pan → Tennis Racket → Baseball Bat → Electric Guitar → **Katana** → Thunder Hammer → **Dual Katanas** → Sea King Trident → **Plasma Katana** → Reaper's Scythe → Cosmic Gauntlet → Rainbow Mega-Fish → **Galaxy Blade** → Black Hole Paddle → Phoenix Feather → **Infinity Edge** → **The Omega Palm**.
- **17 slappers** slap for you automatically and fight in the arena: interns, slipper grandmas, rubber chickens, monkeys, robots, octopuses, ninjas, wizards, samurai, giant mechs, dragons, UFOs, portals, the Hand of God, time clones, a black hole, and the Multiverse Council. Buy ×1, ×10, ×100 or MAX.
- **150+ upgrades** multiply slappers, clicks, weapons, crits, combos, chests, boss timers and more (with a "buy all" button).
- **Skills** (keys **1–6**) unlock as you progress: Mega Slap, Slap Fury, Rage Mode, Slapper Rally, Time Warp and Golden Call.
- **Treasure chests** drop from knockouts. Click them for slaps, frenzies, free slappers, cooldown resets, jackpots, and (rarely) a Slap Soul.
- Click the **Golden Hand** when it floats by: Frenzy, Lucky, Slap Storm, Combo Lock, Slapper Swarm or Chest Rain.
- **Quests**: three (or four) at a time; claim them for big rewards.
- **180+ achievements** (🏆 Trophies tab), each worth +1% production.
- **Ascend** once you've earned 1M slaps in a run: restart for **Slap Souls** (+4% production each) and spend them in the **Soul Shop** on 18 permanent perks (Ghost Hand auto-slapper, Head Start, Eternal Combo, Big Bang ×10…).
- The **📊 Stats** tab tracks your whole slapping career.

Progress auto-saves (see above). Your slappers keep earning while you're away (50% for up to 8 hours, better with upgrades and perks). Saves from the previous version load fine; your weapons are carried over.

## Files

- `server.js`: static file server + JSON save API (`/api/save/:id`)
- `render.yaml`: Render deployment Blueprint
- `index.html`, `css/style.css`: page and HUD
- `js/main.js`: game loop, economy, animation, UI
- `js/models.js`: procedural 3D models (weapons, opponents and hats, slappers, chests, dojo arena)
- `js/data.js`: balance data (weapons, slappers, upgrades, foes, bosses, worlds, skills, perks, achievements, quests)
- `js/storage.js`: browser/server saving, export and import
- `js/audio.js`: synthesized sound effects (WebAudio, no asset files)
