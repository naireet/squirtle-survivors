import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * GameOverScene — shows victory or defeat splash with stats.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const { victory, time, powerUps, wave } = data;
    const { width, height } = this.scale;

    // Splash image
    const bgKey = victory ? 'screen-ending' : 'screen-gameover';
    const bg = this.add.image(width / 2, height / 2, bgKey);
    bg.setDisplaySize(width, height);

    // Semi-transparent overlay for readability
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const style = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: victory ? '#ffdd00' : '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    };

    // Title
    this.add.text(width / 2, height * 0.3, victory ? 'VICTORY!' : 'GAME OVER', style)
      .setOrigin(0.5);

    // Stats
    const m = Math.floor(time / 60);
    const s = time % 60;
    const statsStyle = { ...style, fontSize: '12px', color: '#ffffff' };
    this.add.text(width / 2, height * 0.5, [
      `Wave: ${wave} / ${CONFIG.WAVES.length}`,
      `Time: ${m}:${s.toString().padStart(2, '0')}`,
      `Power Level: ${powerUps}`,
    ].join('\n'), statsStyle).setOrigin(0.5);

    // Restart prompt
    const restart = this.add.text(width / 2, height * 0.75, '[ PRESS ANY KEY TO RESTART ]', {
      ...statsStyle, fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restart,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => this.restartGame());
    this.input.keyboard.once('keydown', () => this.restartGame());
  }

  restartGame() {
    this.scene.start('BriefingScene');
  }
}
