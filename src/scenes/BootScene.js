import Phaser from 'phaser';

/**
 * BootScene — preloads all assets then hands off to BriefingScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.rectangle(w / 2, h / 2, 0, 30, 0x00bfff);
    this.load.on('progress', (v) => { bar.width = 400 * v; });

    // Player sprites (64×64, bg removed, pixelated)
    this.load.image('player-default', 'assets/player/default.png');
    this.load.image('player-mega', 'assets/player/mega.png');
    this.load.image('player-ultra', 'assets/player/ultra.png');

    // Enemy sprites (64×64 / boss 128×128, bg removed, pixelated)
    this.load.image('enemy-rocket', 'assets/enemies/rocket.png');
    this.load.image('enemy-clacky', 'assets/enemies/clacky.png');
    this.load.image('enemy-tom-king', 'assets/enemies/tom-king.png');

    // Pickup sprites (48×48 with colored borders)
    this.load.image('pickup-1x', 'assets/pickups/powerup-1x.png');
    this.load.image('pickup-2x', 'assets/pickups/powerup-2x.png');
    this.load.image('pickup-debuff', 'assets/pickups/debuff.png');
    this.load.image('pickup-aloe', 'assets/pickups/aloe.png');
    this.load.image('pickup-milk', 'assets/pickups/milk.png');

    // Splash screens (800×600)
    this.load.image('screen-briefing', 'assets/screens/briefing.png');
    this.load.image('screen-gameover', 'assets/screens/game-over.png');
    this.load.image('screen-ending', 'assets/screens/ending.png');

    // Background tile
    this.load.image('bg-arena', 'assets/bg/arena.png');
  }

  create() {
    this.scene.start('BriefingScene');
  }
}
