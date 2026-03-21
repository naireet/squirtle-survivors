import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { calculateScore, isHighScore, saveHighScore, getHighScores, fetchGlobalScores, submitGlobalScore } from '../highscores.js';

/**
 * GameOverScene — shows stats, kill summary, high score entry, and leaderboard.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const { victory, time, powerUps, wave, rocketKills = 0, clackyKills = 0, pickleKills = 0, ravegirlKills = 0, diorKills = 0, tomKingKilled = false, opMode = false } = data;
    const { width, height } = this.scale;
    this.restarting = false;

    // Splash image
    const bgKey = victory ? 'screen-ending' : 'screen-gameover';
    const bg = this.add.image(width / 2, height / 2, bgKey);
    bg.setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    const style = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '18px',
      color: victory ? '#ffdd00' : '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    };

    // Title
    this.add.text(width / 2, 20, victory ? 'VICTORY!' : 'GAME OVER', style).setOrigin(0.5, 0);

    // Stats line
    const m = Math.floor(time / 60);
    const s = time % 60;
    const smallStyle = { ...style, fontSize: '9px', color: '#ffffff', lineSpacing: 4 };
    this.add.text(width / 2, 50, `Wave ${wave}/${CONFIG.WAVES.length}  |  ${m}:${s.toString().padStart(2, '0')}  |  PWR ${powerUps}`, smallStyle).setOrigin(0.5, 0);

    // Score
    const score = calculateScore({ time, powerUps, wave, victory });
    const scoreLabel = opMode ? `SCORE: ${score} (OP)` : `SCORE: ${score}`;
    this.add.text(width / 2, 72, scoreLabel, { ...style, fontSize: '14px', color: opMode ? '#ff8800' : '#00ccff' }).setOrigin(0.5, 0);

    // Score breakdown
    const timeScore = time;
    const pwrScore = powerUps * 10;
    const waveScore = wave * 50;
    const victoryScore = victory ? 500 : 0;
    const breakdownParts = [`${timeScore} time`, `${pwrScore} pwr`, `${waveScore} wave`];
    if (victory) breakdownParts.push(`${victoryScore} win`);
    this.add.text(width / 2, 88, breakdownParts.join(' + '), {
      ...smallStyle, fontSize: '7px', color: '#888888',
    }).setOrigin(0.5, 0);

    // Kill summary — victory only
    if (victory) {
      const killSummary = `You vanquished ${rocketKills} Clavicular fans, ${clackyKills} Clackys,\n${ravegirlKills} Ravegirls, ${diorKills} Diors, ${pickleKills} Titan Sloths!\nStrat prevents another 9/11, Pahrump can sleep in peace again!\nOda is proud of you!`;
      this.add.text(width / 2, 102, killSummary, {
        ...smallStyle, fontSize: '7px', color: '#cccccc', lineSpacing: 3,
      }).setOrigin(0.5, 0);
    }

    const statsData = { time, powerUps, wave, victory };
    const tableY = victory ? 178 : 108;

    // High score entry — OP mode scores shown but don't qualify for leaderboard
    if (victory && !opMode && isHighScore(score)) {
      this.showNameEntry(width, tableY, score, statsData);
    } else {
      if (opMode && victory) {
        this.add.text(width / 2, tableY - 5, 'OP scores don\'t count!', {
          ...smallStyle, fontSize: '8px', color: '#ff8800',
        }).setOrigin(0.5, 0);
      }
      const tblY = tableY + (opMode && victory ? 12 : 0);
      this.showGlobalLeaderboard(width, tblY);
      this.showPlayAgain(width, height);
    }
  }

  showNameEntry(width, y, score, stats) {
    const entryStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    };

    this.add.text(width / 2, y, 'NEW HIGH SCORE!', { ...entryStyle, fontSize: '12px' }).setOrigin(0.5, 0);
    this.add.text(width / 2, y + 20, 'Enter your name (10 chars):', { ...entryStyle, fontSize: '8px', color: '#aaaaaa' }).setOrigin(0.5, 0);

    // Name input field
    let name = '';
    const nameDisplay = this.add.text(width / 2, y + 42, '▏', {
      ...entryStyle, fontSize: '14px', color: '#ffffff',
      backgroundColor: '#222244',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    // Hidden HTML input for mobile keyboard support
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'text';
    hiddenInput.maxLength = 10;
    hiddenInput.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0;font-size:16px;';
    document.body.appendChild(hiddenInput);

    // Tap the name display to focus the hidden input (triggers mobile keyboard)
    nameDisplay.on('pointerdown', () => hiddenInput.focus());

    // Sync hidden input → game display
    hiddenInput.addEventListener('input', () => {
      name = hiddenInput.value.substring(0, 10);
      updateDisplay();
    });

    const submitBtn = this.add.text(width / 2, y + 72, 'SUBMIT', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#000',
      backgroundColor: '#ffdd00',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setAlpha(0.4);

    const updateDisplay = () => {
      nameDisplay.setText(name.length > 0 ? name + '▏' : 'TAP TO TYPE ▏');
      submitBtn.setAlpha(name.length > 0 ? 1 : 0.4);
    };
    updateDisplay();

    // Desktop keyboard input
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Enter' && name.length > 0) {
        doSubmit();
        return;
      }
      if (event.key === 'Backspace') {
        name = name.slice(0, -1);
        hiddenInput.value = name;
        updateDisplay();
        return;
      }
      if (event.key.length === 1 && name.length < 10) {
        name += event.key;
        hiddenInput.value = name;
        updateDisplay();
      }
    });

    const doSubmit = async () => {
      if (name.length === 0) return;
      this.input.keyboard.removeAllListeners();
      hiddenInput.remove();

      // Visual feedback
      nameDisplay.setText('SUBMITTING...');
      submitBtn.destroy();

      // Save locally
      saveHighScore(name, score, stats);

      // Submit to global API
      const globalScores = await submitGlobalScore(name, score, stats);

      if (!this.scene.isActive()) return;
      nameDisplay.destroy();

      if (globalScores) {
        this.renderScoreTable(width, y, globalScores, 'GLOBAL TOP 10');
      } else {
        this.renderScoreTable(width, y, getHighScores(), 'LOCAL TOP 10');
      }
      this.showPlayAgain(width, this.scale.height);
    };

    submitBtn.on('pointerdown', doSubmit);
  }

  /** Fetch global leaderboard with local fallback */
  async showGlobalLeaderboard(width, y) {
    const headerStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
    };

    const loadingText = this.add.text(width / 2, y, '── LOADING... ──', headerStyle).setOrigin(0.5, 0);

    const globalScores = await fetchGlobalScores();
    if (!this.scene.isActive()) return;

    loadingText.destroy();

    if (globalScores && globalScores.length > 0) {
      this.renderScoreTable(width, y, globalScores, 'GLOBAL TOP 10');
    } else {
      this.renderScoreTable(width, y, getHighScores(), 'LOCAL TOP 10');
    }
  }

  /** Render a score table with a given label */
  renderScoreTable(width, y, scores, label) {
    const headerStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 2,
    };
    const rowStyle = { ...headerStyle, fontSize: '8px', color: '#ffffff' };

    this.add.text(width / 2, y, `── ${label} ──`, headerStyle).setOrigin(0.5, 0);

    if (!scores || scores.length === 0) {
      this.add.text(width / 2, y + 18, 'No scores yet!', { ...rowStyle, color: '#666' }).setOrigin(0.5, 0);
      return;
    }

    scores.slice(0, 10).forEach((entry, i) => {
      const rank = `${i + 1}.`.padStart(3);
      const name = entry.name.padEnd(10);
      const pts = `${entry.score}`.padStart(5);
      const w = entry.victory ? '★' : `W${entry.wave}`;
      this.add.text(width / 2, y + 18 + i * 14, `${rank} ${name} ${pts} ${w}`, {
        ...rowStyle,
        color: i === 0 ? '#ffdd00' : i < 3 ? '#00ccff' : '#ffffff',
      }).setOrigin(0.5, 0);
    });
  }

  showPlayAgain(width, height) {
    const playAgain = this.add.text(width / 2, height - 30, 'PLAY AGAIN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffdd00',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playAgain.on('pointerover', () => playAgain.setColor('#333'));
    playAgain.on('pointerout', () => playAgain.setColor('#000'));
    playAgain.on('pointerdown', () => this.restartGame());

    this.time.delayedCall(500, () => {
      this.input.keyboard.on('keydown-ENTER', () => this.restartGame());
      this.input.keyboard.on('keydown-SPACE', () => this.restartGame());
    });
  }

  restartGame() {
    if (this.restarting) return;
    this.restarting = true;
    this.input.keyboard.removeAllListeners();
    this.scene.start('BriefingScene');
  }
}
