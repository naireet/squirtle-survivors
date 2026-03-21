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
    // HP bar background
    this.add.rectangle(105, 24, 160, 16, 0x333333).setOrigin(0.5).setScrollFactor(0);
    this.hpBar = this.add.rectangle(27, 17, 156, 12, 0x00ff66).setOrigin(0, 0).setScrollFactor(0);

    this.hpLabel = this.add.text(10, 12, 'HP', { ...style, fontSize: '10px' }).setScrollFactor(0);

    // Power-up counter
    this.powerText = this.add.text(10, 40, 'PWR: 0', style).setScrollFactor(0);

    // Wave indicator
    this.waveText = this.add.text(CONFIG.WIDTH - 10, 10, 'WAVE 1', {
      ...style,
      color: '#ffdd00',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Timer
    this.timerText = this.add.text(CONFIG.WIDTH - 10, 30, '0:00', style).setOrigin(1, 0).setScrollFactor(0);

    // Listen for game events
    gs.events.on('hp-changed', (hp) => {
      if (!this.hpBar) return;
      const pct = Phaser.Math.Clamp(hp / CONFIG.PLAYER.HP, 0, 1);
      this.hpBar.width = 156 * pct;
      this.hpBar.fillColor = pct > 0.5 ? 0x00ff66 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    });

    gs.events.on('powerup-changed', (count) => {
      if (!this.powerText) return;
      const mega = CONFIG.PLAYER.MEGA_THRESHOLD;
      const ultra = CONFIG.PLAYER.ULTRA_THRESHOLD;
      let label;
      if (count >= ultra) {
        label = `PWR: ${count} [ULTRA]`;
        this.powerText.setColor('#ff44ff');
      } else if (count >= mega) {
        label = `PWR: ${count}/${ultra} [MEGA]`;
        this.powerText.setColor('#00ccff');
      } else {
        label = `PWR: ${count}/${mega}`;
        this.powerText.setColor('#ffffff');
      }
      this.powerText.setText(label);
    });

    gs.events.on('wave-changed', (wave) => {
      if (this.waveText) this.waveText.setText(`WAVE ${wave}`);
    });

    // Pause overlay
    this.pauseOverlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2,
      CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.6).setVisible(false);
    this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED\n\nTap or press ESC/P', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    gs.events.on('paused', (paused) => {
      this.pauseOverlay.setVisible(paused);
      this.pauseText.setVisible(paused);
    });

    // ── Pause + Mute buttons (bottom-right, icons only) ──
    const btnStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#222244',
      padding: { x: 10, y: 8 },
      stroke: '#4488ff',
      strokeThickness: 1,
    };

    this.pauseBtn = this.add.text(CONFIG.WIDTH - 10, CONFIG.HEIGHT - 10, '⏸', btnStyle)
      .setOrigin(1, 1).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', (p) => {
      p.event.stopPropagation();
      gs.togglePause();
    });

    this.muteBtn = this.add.text(CONFIG.WIDTH - 50, CONFIG.HEIGHT - 10, '🔊', btnStyle)
      .setOrigin(1, 1).setInteractive({ useHandCursor: true });
    this.isMuted = false;
    this.muteBtn.on('pointerdown', (p) => {
      p.event.stopPropagation();
      this.isMuted = gs.audio.toggleMute();
      this.muteBtn.setText(this.isMuted ? '🔇' : '🔊');
    });

    // ── WASD hint (bottom-left) ──
    this.add.text(10, CONFIG.HEIGHT - 10, 'W\nASD', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#666688',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0, 1);

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
