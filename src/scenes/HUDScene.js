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

    // Named callbacks so we can remove them on shutdown
    this._onHpChanged = (hp) => {
      if (!this.hpBar || !this.scene.isActive()) return;
      const maxHP = gs.opMode ? 300 : CONFIG.PLAYER.HP;
      const pct = Phaser.Math.Clamp(hp / maxHP, 0, 1);
      this.hpBar.width = 156 * pct;
      this.hpBar.fillColor = pct > 0.5 ? 0x00ff66 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    };

    this._onPowerupChanged = (count) => {
      if (!this.powerText || !this.scene.isActive()) return;
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
    };

    this._onWaveChanged = (wave) => {
      if (!this.waveText || !this.scene.isActive()) return;
      this.waveText.setText(`WAVE ${wave}`);
    };

    // Pause overlay
    this.pauseOverlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2,
      CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.6).setVisible(false);
    this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.3, 'PAUSED', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    // Pause menu buttons
    const pauseBtnStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffdd00',
      padding: { x: 24, y: 10 },
    };

    this.resumeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.48, 'RESUME', pauseBtnStyle)
      .setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    this.resumeBtn.on('pointerover', () => this.resumeBtn.setColor('#333'));
    this.resumeBtn.on('pointerout', () => this.resumeBtn.setColor('#000'));
    this.resumeBtn.on('pointerdown', (p) => { p.event.stopPropagation(); gs.togglePause(); });

    this.restartBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.62, 'RESTART', {
      ...pauseBtnStyle, backgroundColor: '#ff4444', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    this.restartBtn.on('pointerover', () => this.restartBtn.setColor('#ffcccc'));
    this.restartBtn.on('pointerout', () => this.restartBtn.setColor('#ffffff'));
    this.restartBtn.on('pointerdown', (p) => {
      p.event.stopPropagation();
      this.restartToTitle(gs);
    });

    this.pauseHint = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.76, 'ESC / P to resume', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#888899',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setVisible(false);

    this._onPaused = (paused) => {
      if (!this.scene.isActive()) return;
      this.pauseOverlay.setVisible(paused);
      this.pauseText.setVisible(paused);
      this.resumeBtn.setVisible(paused);
      this.restartBtn.setVisible(paused);
      this.pauseHint.setVisible(paused);
    };

    this._onOpMode = (active) => {
      if (!this.opText || !this.scene.isActive()) return;
      this.opText.setVisible(active);
    };

    // Register all listeners on GameScene
    gs.events.on('hp-changed', this._onHpChanged, this);
    gs.events.on('powerup-changed', this._onPowerupChanged, this);
    gs.events.on('wave-changed', this._onWaveChanged, this);
    gs.events.on('paused', this._onPaused, this);
    gs.events.on('op-mode', this._onOpMode, this);

    // Clean up event listeners when this scene shuts down to prevent stale callbacks
    this.events.once('shutdown', () => {
      gs.events.off('hp-changed', this._onHpChanged, this);
      gs.events.off('powerup-changed', this._onPowerupChanged, this);
      gs.events.off('wave-changed', this._onWaveChanged, this);
      gs.events.off('paused', this._onPaused, this);
      gs.events.off('op-mode', this._onOpMode, this);
      this.hpBar = null;
      this.powerText = null;
      this.waveText = null;
      this.timerText = null;
      this.opText = null;
      this.gameScene = null;
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

    // OP mode indicator (hidden until activated, tappable for mobile)
    this.opText = this.add.text(CONFIG.WIDTH / 2, 10, 'OP', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setVisible(false).setInteractive({ useHandCursor: true });

    this.opText.on('pointerdown', () => {
      gs.opMode = false;
      gs.playerHP = Math.min(gs.playerHP, CONFIG.PLAYER.HP);
      gs.events.emit('hp-changed', gs.playerHP);
      this.opText.setVisible(false);
    });

    // Signal GameScene that HUD is ready
    gs.events.emit('hud-ready');
  }

  update() {
    if (!this.gameScene || !this.timerText) return;
    const secs = Math.floor(this.gameScene.gameTime / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
  }

  restartToTitle(gs) {
    if (gs.isPaused) {
      gs.physics.resume();
    }
    gs.audio.stopBGM();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.start('TitleScene');
  }
}
