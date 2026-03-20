import Phaser from 'phaser';

/**
 * VictoryScene — shows ending splash with SNES-style scroll text after beating TK.
 */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(data) {
    this.gameData = data;
    const { width, height } = this.scale;

    // Ending splash (One Piece)
    const bg = this.add.image(width / 2, height / 2, 'screen-ending');
    bg.setDisplaySize(width, height);
    bg.setAlpha(0);

    // Fade in splash
    this.tweens.add({
      targets: bg,
      alpha: 1,
      duration: 1500,
    });

    // Semi-transparent overlay for text readability
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 1500 });

    // SNES scroll text — starts below screen, scrolls up
    const message = 'You did it Strat,\nOda is proud of you.';
    const scrollText = this.add.text(width / 2, height + 40, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Typewriter the text first, then scroll it up
    let charIndex = 0;
    this.time.delayedCall(1800, () => {
      scrollText.setY(height * 0.65);
      scrollText.setAlpha(0);

      // Fade in + typewriter
      this.tweens.add({ targets: scrollText, alpha: 1, duration: 500 });

      const typeTimer = this.time.addEvent({
        delay: 60,
        callback: () => {
          charIndex++;
          scrollText.setText(message.substring(0, charIndex));
          if (charIndex >= message.length) typeTimer.remove();
        },
        repeat: message.length - 1,
      });
    });

    // After 6s total, transition to GameOverScene with victory stats
    const advance = () => this.scene.start('GameOverScene', this.gameData);
    this.time.delayedCall(6000, advance);

    // Skip on input after a brief delay (don't skip accidentally)
    this.time.delayedCall(2000, () => {
      this.input.once('pointerdown', advance);
      this.input.keyboard.once('keydown', advance);
    });
  }
}
