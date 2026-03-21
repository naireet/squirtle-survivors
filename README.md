# 🐢 Squirtle Survivors

A Vampire Survivors-lite browser game built with Phaser 3. Fight waves of enemies, collect powerups, evolve your attacks, and take down the final boss.

**🎮 Play now: [strat.kimochi.dev](https://strat.kimochi.dev)**

## Gameplay

- **WASD / Arrow Keys** to move (mobile: virtual joystick)
- Auto-attack nearby enemies — collect powerups to increase fire rate and evolve your shots
- Survive 6 waves of escalating enemies, then defeat the final boss
- Your score hits the **global leaderboard** if you win

### Evolution System

| Stage | Powerups | Effect |
|-------|----------|--------|
| Default | 0–4 | Single shot |
| Mega | 5+ | Triple spread |
| Ultra | 10+ | Five-way burst |

### Score Formula

```
Score = seconds_survived + (powerups × 10) + (wave × 50) + (victory ? 500 : 0)
```

## Tech Stack

- **Frontend:** [Phaser 3](https://phaser.io/) + [Vite](https://vite.dev/)
- **Backend:** Azure Functions v4 (SWA managed API)
- **Storage:** Azure Blob Storage
- **Audio:** 100% Web Audio API oscillator synthesis (no audio files except victory BGM)
- **Hosting:** Azure Static Web Apps + Cloudflare DNS
- **CI/CD:** GitHub Actions — auto-deploys on push to master

## Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build → dist/
```

API (deployed automatically with SWA):
```bash
cd api && npm install
```

## Project Structure

```
src/
├── scenes/
│   ├── BootScene.js        # Asset preloader
│   ├── TitleScene.js        # Main menu + leaderboard
│   ├── BriefingScene.js     # SNES-style intro dialogue
│   ├── GameScene.js         # Core gameplay (~1100 lines)
│   ├── HUDScene.js          # HP, wave, timer, pause menu
│   ├── MortyQuoteScene.js   # Death quote interstitial
│   ├── VictoryScene.js      # Victory splash + credits
│   └── GameOverScene.js     # Stats, name entry, leaderboard
├── audio.js                 # Retro synth SFX + BGM
├── config.js                # All tuning constants
├── highscores.js            # Local + global score system
├── external-joystick.js     # Mobile HTML joystick
└── main.js                  # Phaser init
api/
└── src/functions/
    └── leaderboard.js       # GET/POST /api/leaderboard
```

## License

MIT
