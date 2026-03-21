import Phaser from 'phaser';

const QUOTES = [
  '"A glass of whole milk\nwould kill strat"',
  '"We are in a Mad Max type\nof situation because of\nyour failure"',
  '"Is this like when Strat\nclaims to be the\n#1 beef boy?"',
  '"Keep in mind Strat has\nbeen silent about the guy\nwho capped Shinzo"',
  '"get ready to learn\nChinese, buddy"',
  '"You will never complete\nyour Sorcerer Supreme\ncollection now."',
  '"Strat has soft bones."',
  '"All this time we\'ve been\nsaying Strat has glass\nbones and paper skin,\nhe always proves me right."',
  '"like McClacky\'s balls.\nRip" - Strat',
  '"How\'s that fucking\nmeat, strat"',
  '"Strat voted for Trump"',
  '"Strat still throats it"',
  '"Strat almost lost\nhis virginity!"',
];

/**
 * MortyQuoteScene — brief death quote interstitial before GameOverScene.
 * Shows Morty avatar + random quote with typewriter effect.
 */
export class MortyQuoteScene extends Phaser.Scene {
  constructor() {
    super('MortyQuoteScene');
  }

  create(data) {
    this.gameData = data;
    const { width, height } = this.scale;

    // Black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Morty avatar
    const avatar = this.add.image(width * 0.2, height * 0.45, 'morty-avatar');
    avatar.setDisplaySize(80, 80);

    // Speaker label
    this.add.text(width * 0.38, height * 0.3, 'Nine Inch Morty', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#00ccff',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Quote — typewriter effect
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const quoteText = this.add.text(width * 0.38, height * 0.42, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: width * 0.55 },
      lineSpacing: 6,
    });

    // Typewriter
    let charIndex = 0;
    const typeTimer = this.time.addEvent({
      delay: 40,
      callback: () => {
        charIndex++;
        quoteText.setText(quote.substring(0, charIndex));
        if (charIndex >= quote.length) typeTimer.remove();
      },
      repeat: quote.length - 1,
    });

    // Auto-advance after 3.5s, or skip on input
    const advance = () => this.scene.start('GameOverScene', this.gameData);
    this.time.delayedCall(3500, advance);
    this.input.once('pointerdown', advance);
    this.input.keyboard.once('keydown', advance);
  }
}
