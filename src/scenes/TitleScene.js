import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { fetchGlobalScores, getHighScores } from '../highscores.js';

/**
 * TitleScene — main menu with START and LEADERBOARD buttons.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'screen-briefing');
    bg.setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    // Title
    this.add.text(width / 2, height * 0.18, 'SQUIRTLE\nSURVIVORS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.38, 'A Strat Chadley Production', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#888899',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // START button
    const startBtn = this.add.text(width / 2, height * 0.52, 'START', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#000000',
      backgroundColor: '#ffdd00',
      padding: { x: 32, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#333'));
    startBtn.on('pointerout', () => startBtn.setColor('#000'));
    startBtn.on('pointerdown', () => this.startGame());

    // LEADERBOARD button
    const lbBtn = this.add.text(width / 2, height * 0.66, 'LEADERBOARD', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#333355',
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerover', () => lbBtn.setColor('#00ccff'));
    lbBtn.on('pointerout', () => lbBtn.setColor('#ffffff'));
    lbBtn.on('pointerdown', () => this.showLeaderboard());

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());

    this.started = false;

    // Container for leaderboard overlay (hidden until needed)
    this.lbGroup = null;
  }

  startGame() {
    if (this.started) return;
    this.started = true;
    this.input.keyboard.removeAllListeners();
    this.scene.start('BriefingScene');
  }

  async showLeaderboard() {
    if (this.lbGroup) return; // already showing

    const { width, height } = this.scale;
    this.lbGroup = this.add.group();

    // Full opaque overlay (depth 10 to cover title elements)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000011, 0.95).setDepth(10);
    this.lbGroup.add(overlay);

    const headerStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
    };

    // Loading text
    const loadingText = this.add.text(width / 2, height * 0.2, '── LOADING... ──', headerStyle).setOrigin(0.5).setDepth(10);
    this.lbGroup.add(loadingText);

    // Fetch scores
    const globalScores = await fetchGlobalScores();
    if (!this.scene.isActive() || !this.lbGroup) return;

    loadingText.destroy();

    const scores = (globalScores && globalScores.length > 0) ? globalScores : getHighScores();
    const label = (globalScores && globalScores.length > 0) ? 'GLOBAL TOP 10' : 'LOCAL TOP 10';

    const titleText = this.add.text(width / 2, height * 0.15, `── ${label} ──`, headerStyle).setOrigin(0.5).setDepth(10);
    this.lbGroup.add(titleText);

    const rowStyle = { ...headerStyle, fontSize: '8px', color: '#ffffff' };

    if (!scores || scores.length === 0) {
      const empty = this.add.text(width / 2, height * 0.25, 'No scores yet!', { ...rowStyle, color: '#666' }).setOrigin(0.5).setDepth(10);
      this.lbGroup.add(empty);
    } else {
      scores.slice(0, 10).forEach((entry, i) => {
        const rank = `${i + 1}.`.padStart(3);
        const name = entry.name.padEnd(10);
        const pts = `${entry.score}`.padStart(5);
        const w = entry.victory ? '★' : `W${entry.wave}`;
        const row = this.add.text(width / 2, height * 0.22 + i * 18, `${rank} ${name} ${pts} ${w}`, {
          ...rowStyle,
          color: i === 0 ? '#ffdd00' : i < 3 ? '#00ccff' : '#ffffff',
        }).setOrigin(0.5).setDepth(10);
        this.lbGroup.add(row);
      });
    }

    // Score formula hint
    const formula = this.add.text(width / 2, height * 0.82, 'Score = time + pwr×10 + wave×50 + win×500', {
      ...rowStyle, fontSize: '7px', color: '#666688',
    }).setOrigin(0.5).setDepth(10);
    this.lbGroup.add(formula);

    // BACK button
    const backBtn = this.add.text(width / 2, height * 0.9, 'BACK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffdd00',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    this.lbGroup.add(backBtn);

    backBtn.on('pointerover', () => backBtn.setColor('#333'));
    backBtn.on('pointerout', () => backBtn.setColor('#000'));
    backBtn.on('pointerdown', () => this.hideLeaderboard());

    // ESC to close
    this.input.keyboard.once('keydown-ESC', () => this.hideLeaderboard());
  }

  hideLeaderboard() {
    if (!this.lbGroup) return;
    this.lbGroup.clear(true, true);
    this.lbGroup = null;
  }
}
