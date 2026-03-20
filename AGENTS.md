# Squirtle Survivors

A Vampire Survivors-lite browser game built with Phaser 3 + Vite.

## Architecture

- **Engine**: Phaser 3 (arcade physics)
- **Bundler**: Vite
- **Language**: JavaScript (ES modules)
- **Deploy**: Azure Static Web Apps → game.kimochi.dev

## Project Structure

```
src/
  main.js              # Phaser game config + scene registration
  config.js            # Game constants, enemy stats, wave definitions
  scenes/
    BootScene.js       # Asset preloader
    BriefingScene.js   # Intro splash with typewriter lore text
    GameScene.js       # Main gameplay (player, enemies, projectiles, pickups, waves)
    HUDScene.js        # Overlay UI (HP bar, power counter, wave, timer)
    GameOverScene.js   # Victory/defeat screen with stats
public/
  assets/
    player/            # default.png, mega.png, ultra.png (64×64, transparent)
    enemies/           # rocket.png, clacky.png (64×64), tom-king.png (128×128)
    pickups/           # powerup-1x.png, powerup-2x.png, debuff.png (48×48, bordered)
    screens/           # briefing.png, game-over.png, ending.png (800×600)
    bg/                # Arena background (TBD)
    audio/             # BGM + SFX (TBD)
scripts/
  process_assets.py    # Asset pipeline: bg removal, pixelation, resizing
```

## Build / Run / Test

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

## Key Files

- `src/config.js` — All tuning values (player speed, enemy HP, wave timing, thresholds)
- `src/scenes/GameScene.js` — Core game loop, collision handling, wave manager
- `src/scenes/BriefingScene.js` — Intro sequence with SNES typewriter effect

## Game Design

- **Hero**: Stratimus Chadley (astronaut Squirtle)
- **Controls**: WASD (desktop) + touch joystick (mobile), auto-attack
- **Power-ups**: Cumulative counter — 5 = Mega evolution, 10 = Ultra evolution
- **Enemies**: Rocket (basic) → Clacky Nemesis (elite) → Tom King (boss)
- **Win condition**: Defeat Tom King boss in final wave (~3 min run)
