import Phaser from 'phaser';
import { CONFIG } from '../config.js';

const LORE_TEXT = "Sir, there's been some movement and the president says activate Stratimus Chadley";
const CHAR_DELAY = 50; // ms per character (SNES typewriter speed)

/**
 * BriefingScene — shows the Boosh briefing splash with typewriter lore text.
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

    // Semi-transparent text backdrop
    this.add.rectangle(width / 2, height - 80, width - 40, 80, 0x000000, 0.7)
      .setOrigin(0.5);

    // Typewriter text
    this.loreText = this.add.text(40, height - 110, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: width - 80 },
      lineSpacing: 6,
    });

    this.charIndex = 0;
    this.typewriterTimer = this.time.addEvent({
      delay: CHAR_DELAY,
      callback: this.typeNextChar,
      callbackScope: this,
      repeat: LORE_TEXT.length - 1,
    });

    // "Press Start" prompt (hidden until text finishes or skip)
    this.startPrompt = this.add.text(width / 2, height - 20, '[ PRESS START ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffdd00',
    }).setOrigin(0.5).setAlpha(0);

    // Skip / start input
    this.input.once('pointerdown', () => this.skipOrStart());
    this.input.keyboard.once('keydown-SPACE', () => this.skipOrStart());
    this.input.keyboard.once('keydown-ENTER', () => this.skipOrStart());
  }

  typeNextChar() {
    this.loreText.text += LORE_TEXT[this.charIndex];
    this.charIndex++;
    if (this.charIndex >= LORE_TEXT.length) {
      this.showStartPrompt();
    }
  }

  showStartPrompt() {
    this.tweens.add({
      targets: this.startPrompt,
      alpha: 1,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
    // Re-bind input for actual start
    this.input.once('pointerdown', () => this.startGame());
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  skipOrStart() {
    if (this.charIndex < LORE_TEXT.length) {
      // Skip to full text
      this.typewriterTimer.remove();
      this.loreText.text = LORE_TEXT;
      this.charIndex = LORE_TEXT.length;
      this.showStartPrompt();
    } else {
      this.startGame();
    }
  }

  startGame() {
    this.scene.start('GameScene');
  }
}
