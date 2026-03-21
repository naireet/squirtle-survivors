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
    const { victory, time, powerUps, wave, rocketKills = 0, clackyKills = 0, pickleKills = 0, ravegirlKills = 0, diorKills = 0, tomKingKilled = false } = data;
    const { width, height } = this.scale;

    // Splash image
    const bgKey = victory ? 'screen-ending' : 'screen-gameover';
    const bg = this.add.image(width / 2, height / 2, bgKey);
    bg.setDisplaySize(width, height);

    // Semi-transparent overlay for readability
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

    const style = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: victory ? '#ffdd00' : '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    };

    // Title
    this.add.text(width / 2, height * 0.15, victory ? 'VICTORY!' : 'GAME OVER', style)
      .setOrigin(0.5);

    // Stats
    const m = Math.floor(time / 60);
    const s = time % 60;
    const statsStyle = { ...style, fontSize: '10px', color: '#ffffff', lineSpacing: 5 };
    this.add.text(width / 2, height * 0.32, [
      `Wave: ${wave} / ${CONFIG.WAVES.length}`,
      `Time: ${m}:${s.toString().padStart(2, '0')}`,
      `Power Level: ${powerUps}`,
    ].join('\n'), statsStyle).setOrigin(0.5);

    // Kill summary — victory only
    if (victory) {
      const killSummary = `You vanquished ${rocketKills} Clavicular fans,\n${clackyKills} Clackys, ${ravegirlKills} Ravegirls,\n${diorKills} Diors, ${pickleKills} Titan Sloths!\nStrat prevents another 9/11,\nPahrump can sleep in peace again!\nOda is proud of you!`;
      this.add.text(width / 2, height * 0.56, killSummary, {
        ...statsStyle, fontSize: '8px', color: '#cccccc', lineSpacing: 4,
      }).setOrigin(0.5);
    }

    // Play Again button
    const btnStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#000000',
      backgroundColor: '#ffdd00',
      padding: { x: 20, y: 12 },
    };
    const playAgain = this.add.text(width / 2, height * 0.82, 'PLAY AGAIN', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playAgain.on('pointerover', () => playAgain.setColor('#333'));
    playAgain.on('pointerout', () => playAgain.setColor('#000'));
    playAgain.on('pointerdown', () => this.restartGame());

    // Keyboard restart — delayed 500ms to avoid consuming the skip input from previous scene
    this.time.delayedCall(500, () => {
      this.input.keyboard.once('keydown', () => this.restartGame());
    });
  }

  restartGame() {
    this.scene.start('BriefingScene');
  }
}
