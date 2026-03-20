import Phaser from 'phaser';
import { CONFIG } from '../config.js';

const LORE_LINES = [
  { speaker: '', text: 'Sir, code Venetian!' },
  { speaker: 'BOOSH', text: 'Execute order Stratimus Chadley.' },
];
const CHAR_DELAY = 50;
const LINE_PAUSE = 800; // pause between lines

/**
 * BriefingScene — SNES-style two-line scrolling dialogue over Boosh briefing splash.
 */
export class BriefingScene extends Phaser.Scene {
  constructor() {
    super('BriefingScene');
  }

  create() {
    const { width, height } = this.scale;

    // Briefing splash background
    const bg = this.add.image(width / 2, height / 2, 'screen-briefing');
    bg.setDisplaySize(width, height);

    // SNES-style text box at bottom
    this.add.rectangle(width / 2, height - 60, width - 20, 100, 0x000022, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0x4488ff);

    const textStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: width - 80 },
      lineSpacing: 8,
    };

    // Speaker label (inside text box, top)
    this.speakerText = this.add.text(30, height - 105, '', {
      ...textStyle,
      fontSize: '11px',
      color: '#ffdd00',
    });

    // Dialogue text (below speaker label)
    this.dialogueText = this.add.text(30, height - 85, '', textStyle);

    // "Press Start" prompt
    this.startPrompt = this.add.text(width / 2, height - 15, '[ PRESS START ]', {
      ...textStyle,
      fontSize: '10px',
      color: '#ffdd00',
    }).setOrigin(0.5).setAlpha(0);

    // State
    this.currentLine = 0;
    this.charIndex = 0;
    this.allDone = false;

    // Start first line
    this.startLine(0);

    // Input: skip current line or start game
    this.input.on('pointerdown', () => this.skipOrAdvance());
    this.input.keyboard.on('keydown-SPACE', () => this.skipOrAdvance());
    this.input.keyboard.on('keydown-ENTER', () => this.skipOrAdvance());
  }

  startLine(index) {
    if (index >= LORE_LINES.length) {
      this.allDone = true;
      this.showStartPrompt();
      return;
    }
    this.currentLine = index;
    this.charIndex = 0;
    const line = LORE_LINES[index];

    // Show speaker label
    this.speakerText.setText(line.speaker ? `${line.speaker}:` : '');
    this.dialogueText.setText('');

    this.typewriterTimer = this.time.addEvent({
      delay: CHAR_DELAY,
      callback: () => {
        this.dialogueText.text += line.text[this.charIndex];
        this.charIndex++;
        if (this.charIndex >= line.text.length) {
          this.typewriterTimer.remove();
          // Auto-advance to next line after pause
          this.time.delayedCall(LINE_PAUSE, () => {
            this.startLine(index + 1);
          });
        }
      },
      repeat: line.text.length - 1,
    });
  }

  showStartPrompt() {
    this.tweens.add({
      targets: this.startPrompt,
      alpha: 1,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  skipOrAdvance() {
    if (this.allDone) {
      this.startGame();
      return;
    }

    const line = LORE_LINES[this.currentLine];
    if (this.charIndex < line.text.length) {
      // Skip to full text of current line
      if (this.typewriterTimer) this.typewriterTimer.remove();
      this.dialogueText.setText(line.text);
      this.charIndex = line.text.length;
      // Advance to next line after short pause
      this.time.delayedCall(300, () => {
        this.startLine(this.currentLine + 1);
      });
    }
  }

  startGame() {
    this.input.removeAllListeners();
    this.scene.start('GameScene');
  }
}
