import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * HUDScene — overlay showing HP, power-up counter, wave, and timer.
 * Runs parallel to GameScene.
 */
export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUDScene');
  }

  create(data) {
    const gs = data.gameScene || this.scene.get('GameScene');
    const style = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };

    // HP bar background
    this.add.rectangle(100, 20, 160, 16, 0x333333).setOrigin(0.5).setScrollFactor(0);
    this.hpBar = this.add.rectangle(22, 13, 156, 12, 0x00ff66).setOrigin(0, 0).setScrollFactor(0);

    this.hpLabel = this.add.text(10, 6, 'HP', { ...style, fontSize: '10px' }).setScrollFactor(0);

    // Power-up counter
    this.powerText = this.add.text(10, 36, 'PWR: 0', style).setScrollFactor(0);

    // Wave indicator
    this.waveText = this.add.text(CONFIG.WIDTH - 10, 6, 'WAVE 1', {
      ...style,
      color: '#ffdd00',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Timer
    this.timerText = this.add.text(CONFIG.WIDTH - 10, 26, '0:00', style).setOrigin(1, 0).setScrollFactor(0);

    // Listen for game events
    gs.events.on('hp-changed', (hp) => {
      const pct = Phaser.Math.Clamp(hp / CONFIG.PLAYER.HP, 0, 1);
      this.hpBar.width = 156 * pct;
      this.hpBar.fillColor = pct > 0.5 ? 0x00ff66 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    });

    gs.events.on('powerup-changed', (count) => {
      let label = `PWR: ${count}`;
      if (count >= CONFIG.PLAYER.ULTRA_THRESHOLD) label += ' [ULTRA]';
      else if (count >= CONFIG.PLAYER.MEGA_THRESHOLD) label += ' [MEGA]';
      this.powerText.setText(label);
    });

    gs.events.on('wave-changed', (wave) => {
      this.waveText.setText(`WAVE ${wave}`);
    });

    // Update timer every second
    this.gameScene = gs;
  }

  update() {
    if (!this.gameScene) return;
    const secs = Math.floor(this.gameScene.gameTime / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
  }
}
