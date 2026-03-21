import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { RetroAudio } from '../audio.js';
import { externalJoystick } from '../external-joystick.js';

const WORLD_SIZE = 2000; // world is larger than viewport; camera follows player

/**
 * GameScene — main gameplay: player, enemies, projectiles, pickups, waves.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // -- Audio --
    this.audio = new RetroAudio(this);
    this.audio.init();
    this.audio.startBGM();

    // -- World bounds --
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // -- Tiled retrowave background --
    for (let x = 0; x < WORLD_SIZE; x += 256) {
      for (let y = 0; y < WORLD_SIZE; y += 256) {
        this.add.image(x + 128, y + 128, 'bg-arena');
      }
    }

    // -- Game state --
    this.powerUpCount = 0;
    this.playerHP = CONFIG.PLAYER.HP;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.gameTime = 0;
    this.isGameOver = false;
    this.isInvulnerable = false;
    this.lastAttackTime = 0;
    this.godMode = false;
    this.opMode = false;
    this._opCodeBuffer = '';

    // Kill counters
    this.rocketKills = 0;
    this.clackyKills = 0;
    this.pickleKills = 0;
    this.ravegirlKills = 0;
    this.diorKills = 0;
    this.tomKingKilled = false;
    this.tkSpawned = false;

    // Temporary effect timers
    this._aloeTimer = null;
    this._milkTimer = null;
    this._hulkTimer = null;
    this._a1DrainTimer = null;
    this.isAloeBuffed = false;
    this.isMilkSlowed = false;
    this.isHulkDebuffed = false;
    this.isA1Debuffed = false;
    this.isPickleSlowed = false;
    this._pickleTimer = null;

    // -- Player --
    this.player = this.physics.add.sprite(
      WORLD_SIZE / 2, WORLD_SIZE / 2, 'player-default'
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDisplaySize(64, 64);
    this.player.setDepth(10);

    // -- Input (WASD + Arrow keys) --
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.arrows = this.input.keyboard.createCursorKeys();

    // Mobile virtual joystick zone
    this.joystickVector = new Phaser.Math.Vector2(0, 0);
    this.setupMobileJoystick();

    // -- Groups --
    this.projectiles = this.physics.add.group({ maxSize: 50 });
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    // -- Collisions --
    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);

    // -- Bathrooms (spread across world) --
    this.bathrooms = this.physics.add.staticGroup();
    this.spawnBathrooms(5);
    this.physics.add.overlap(this.player, this.bathrooms, this.onBathroom, null, this);

    // -- Bathroom arrow indicator (HUD layer, hidden by default) --
    this.bathroomArrow = this.add.triangle(0, 0, 0, 12, 6, 0, 12, 12, 0x00ff00, 1)
      .setDepth(100).setVisible(false).setScrollFactor(0);

    // -- Camera --
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // -- HUD (parallel scene) --
    this.scene.launch('HUDScene', { gameScene: this });

    // -- Pause (ESC or P) --
    this.isPaused = false;
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());

    // -- OP Mode (secret code: type "67") --
    this.input.keyboard.on('keydown', (event) => {
      if (this.opMode) return;
      this._opCodeBuffer += event.key;
      if (this._opCodeBuffer.length > 10) this._opCodeBuffer = this._opCodeBuffer.slice(-10);
      if (this._opCodeBuffer.includes('67')) {
        this.activateOPMode();
      }
    });

    // -- Wave system --
    this.spawnTimers = [];
    // Defer startWave until HUDScene is ready to avoid emitting events
    // before HUD text objects exist (causes drawImage crash on restart)
    this.events.once('hud-ready', () => this.startWave(0));
    // Fallback: if HUD somehow doesn't fire, start after 100ms
    this.time.delayedCall(100, () => {
      if (this.currentWave === 0 && this.waveTimer === 0) this.startWave(0);
    });
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    this.gameTime += delta;
    this.waveTimer += delta;
    this.handleMovement();
    this.handleAutoAttack(time);
    this.updateEnemies();
    this.checkWaveProgress();
    this.updateBathroomArrow();
  }

  // ── Pause ──

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.audio.setMuted(true);
      this.events.emit('paused', true);
    } else {
      this.physics.resume();
      this.audio.setMuted(false);
      this.events.emit('paused', false);
    }
  }

  // ── OP Mode ──

  activateOPMode() {
    if (this.opMode) return;
    this.opMode = true;

    // 3x HP
    this.playerHP = 300;
    this.events.emit('hp-changed', this.playerHP);

    // Start at Mega (5 powerups)
    const prev = this.powerUpCount;
    this.powerUpCount = Math.max(this.powerUpCount, CONFIG.PLAYER.MEGA_THRESHOLD);
    this.updatePlayerEvolution(prev);
    this.events.emit('powerup-changed', this.powerUpCount);

    // Notify HUD
    this.events.emit('op-mode', true);
    this.audio.playLevelUp();
  }

  /** OP mode doubles projectile damage */
  getProjectileDamage() {
    const base = CONFIG.PLAYER.BASE_DAMAGE + (this.powerUpCount * CONFIG.PLAYER.DAMAGE_PER_POWERUP);
    return this.opMode ? base * 2 : base;
  }

  // ── Movement ──

  getEffectiveSpeed() {
    let speed = CONFIG.PLAYER.SPEED;
    if (this.isAloeBuffed) speed *= CONFIG.PLAYER.ALOE_SPEED_FACTOR;
    if (this.isMilkSlowed) speed *= CONFIG.PLAYER.MILK_SLOW_FACTOR;
    if (this.isPickleSlowed) speed *= CONFIG.PICKLE_SLOW_FACTOR;
    return speed;
  }

  getEffectiveCooldown() {
    let cd = CONFIG.PLAYER.ATTACK_COOLDOWN;
    // Evolution bonuses
    if (this.powerUpCount >= CONFIG.PLAYER.ULTRA_THRESHOLD) {
      cd *= CONFIG.PLAYER.ULTRA_COOLDOWN_MULT;
    } else if (this.powerUpCount >= CONFIG.PLAYER.MEGA_THRESHOLD) {
      cd *= CONFIG.PLAYER.MEGA_COOLDOWN_MULT;
    }
    // Hulk debuff stacks on top
    if (this.isHulkDebuffed) cd *= CONFIG.PLAYER.HULK_COOLDOWN_MULT;
    return cd;
  }

  getShotCount() {
    if (this.powerUpCount >= CONFIG.PLAYER.ULTRA_THRESHOLD) return CONFIG.PLAYER.ULTRA_SHOT_COUNT;
    if (this.powerUpCount >= CONFIG.PLAYER.MEGA_THRESHOLD) return CONFIG.PLAYER.MEGA_SHOT_COUNT;
    return 1;
  }

  handleMovement() {
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.arrows.left.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.arrows.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.arrows.up.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.arrows.down.isDown) vy = 1;

    // Mobile joystick override (in-game touch-anywhere)
    if (this.joystickVector.length() > 0.1) {
      vx = this.joystickVector.x;
      vy = this.joystickVector.y;
    }

    // External HTML joystick override (fixed pad below canvas)
    if (externalJoystick.active && (Math.abs(externalJoystick.x) > 0.1 || Math.abs(externalJoystick.y) > 0.1)) {
      vx = externalJoystick.x;
      vy = externalJoystick.y;
    }

    const speed = this.getEffectiveSpeed();

    if (vx !== 0 || vy !== 0) {
      const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
      this.player.setVelocity(vec.x, vec.y);
      // Flip sprite horizontally based on direction, no rotation
      if (vx < 0) this.player.setFlipX(true);
      else if (vx > 0) this.player.setFlipX(false);
    } else {
      this.player.setVelocity(0, 0);
    }
  }

  setupMobileJoystick() {
    // Virtual thumbstick — spawns at touch point, visual feedback
    const STICK_RADIUS = 50;   // outer ring radius
    const THUMB_RADIUS = 20;   // inner thumb radius
    const DEAD_ZONE = 8;       // min drag before registering input
    const MAX_DRAG = 50;       // max drag distance for full speed

    // Create joystick graphics (hidden initially, fixed to camera)
    this.stickBase = this.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.15)
      .setDepth(100).setVisible(false).setScrollFactor(0);
    this.stickThumb = this.add.circle(0, 0, THUMB_RADIUS, 0xffffff, 0.4)
      .setDepth(101).setVisible(false).setScrollFactor(0);

    let activePointer = null;
    let originX = 0, originY = 0;

    this.input.on('pointerdown', (pointer) => {
      // Don't hijack taps on UI buttons (bottom 60px right side)
      if (pointer.y > CONFIG.HEIGHT - 60 && pointer.x > CONFIG.WIDTH - 100) return;
      if (activePointer) return; // already tracking a finger

      activePointer = pointer;
      originX = pointer.x;
      originY = pointer.y;

      this.stickBase.setPosition(originX, originY).setVisible(true);
      this.stickThumb.setPosition(originX, originY).setVisible(true);
    });

    this.input.on('pointermove', (pointer) => {
      if (!activePointer || pointer.id !== activePointer.id) return;

      const dx = pointer.x - originX;
      const dy = pointer.y - originY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > DEAD_ZONE) {
        const clamped = Math.min(dist, MAX_DRAG);
        const nx = dx / dist;
        const ny = dy / dist;
        this.joystickVector.set(nx, ny);

        // Move thumb visual (clamped to ring)
        this.stickThumb.setPosition(
          originX + nx * clamped,
          originY + ny * clamped
        );
      } else {
        this.joystickVector.set(0, 0);
        this.stickThumb.setPosition(originX, originY);
      }
    });

    const releaseStick = (pointer) => {
      if (!activePointer || pointer.id !== activePointer.id) return;
      activePointer = null;
      this.joystickVector.set(0, 0);
      this.stickBase.setVisible(false);
      this.stickThumb.setVisible(false);
    };

    this.input.on('pointerup', releaseStick);
    this.input.on('pointerupoutside', releaseStick);
  }

  // ── Auto-Attack ──

  handleAutoAttack(time) {
    if (time - this.lastAttackTime < this.getEffectiveCooldown()) return;

    const nearest = this.physics.closest(this.player, this.enemies.getChildren().filter(e => e.active));
    if (!nearest) return;

    this.lastAttackTime = time;
    const shotCount = this.getShotCount();
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);

    if (shotCount === 1) {
      this.fireProjectile(baseAngle);
    } else {
      // Spread shots evenly across a 30° arc
      const spread = Math.PI / 6; // 30 degrees
      const step = spread / (shotCount - 1);
      const startAngle = baseAngle - spread / 2;
      for (let i = 0; i < shotCount; i++) {
        this.fireProjectile(startAngle + step * i);
      }
    }
  }

  fireProjectile(angle) {
    const proj = this.projectiles.get(this.player.x, this.player.y, '__DEFAULT');
    if (!proj) return;
    this.audio.playShoot();

    proj.setActive(true).setVisible(true);
    if (!proj.body) this.physics.add.existing(proj);
    proj.body.enable = true;

    // Generate projectile textures per evolution tier
    const isUltra = this.powerUpCount >= CONFIG.PLAYER.ULTRA_THRESHOLD;
    const texKey = isUltra ? 'projectile-ultra' : 'projectile';
    const size = isUltra ? CONFIG.PLAYER.ULTRA_PROJ_SIZE : 12;

    if (!this.textures.exists(texKey)) {
      const gfx = this.make.graphics({ add: false });
      const color = isUltra ? 0xff44ff : 0x00ccff;
      gfx.fillStyle(color);
      gfx.fillCircle(size / 2, size / 2, size / 2);
      gfx.generateTexture(texKey, size, size);
      gfx.destroy();
    }
    proj.setTexture(texKey);
    proj.setDisplaySize(size, size);
    proj.setDepth(5);

    this.physics.velocityFromRotation(angle, CONFIG.PLAYER.PROJECTILE_SPEED, proj.body.velocity);

    // Auto-destroy after 2 seconds
    this.time.delayedCall(2000, () => {
      if (proj.active) {
        proj.setActive(false).setVisible(false);
        proj.body.enable = false;
      }
    });
  }

  // ── Enemy Logic ──

  updateEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      // Clacky pauses before dash — don't move during windup
      if (enemy.getData('dashing') || enemy.getData('winding')) return;
      // Ravegirl stops when close to player (begging range ~120px)
      if (enemy.getData('type') === 'ravegirl') {
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (dist < 120) {
          enemy.body.setVelocity(0, 0);
          enemy.setData('begging', true);
          return;
        } else {
          enemy.setData('begging', false);
        }
      }
      this.physics.moveToObject(enemy, this.player, enemy.getData('speed'));
    });
  }

  /** Clacky dash-attack: pause 1s with line indicator, then burst toward player */
  startClackyDash(enemy) {
    if (!enemy.active) return;

    const dashCooldown = 3000; // time between dashes
    const windupTime = 800;    // pause + indicator duration
    const dashSpeed = 400;     // burst speed
    const dashDuration = 600;  // how long the dash lasts

    enemy.setData('winding', true);
    enemy.body.setVelocity(0, 0);

    // Draw line indicator toward player's current position
    const targetX = this.player.x;
    const targetY = this.player.y;
    const line = this.add.graphics();
    line.lineStyle(2, 0xff0000, 0.6);
    line.lineBetween(enemy.x, enemy.y, targetX, targetY);
    line.setDepth(4);

    // Flash the enemy to telegraph
    this.tweens.add({
      targets: enemy,
      alpha: { from: 0.4, to: 1 },
      duration: 100,
      repeat: 3,
      yoyo: true,
    });

    this.time.delayedCall(windupTime, () => {
      if (!enemy.active) { line.destroy(); return; }
      line.destroy();
      enemy.setData('winding', false);
      enemy.setData('dashing', true);

      // Dash toward locked target position
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
      enemy.body.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);
      enemy.setTint(0xff4444);

      this.time.delayedCall(dashDuration, () => {
        if (!enemy.active) return;
        enemy.setData('dashing', false);
        enemy.clearTint();

        // Queue next dash
        this.time.delayedCall(dashCooldown, () => this.startClackyDash(enemy));
      });
    });
  }

  /** Ravegirl — floats hearts/question marks when near player */
  startRavegirlBehavior(enemy) {
    const heartLoop = this.time.addEvent({
      delay: 800,
      callback: () => {
        if (!enemy.active) { heartLoop.remove(); return; }
        if (!enemy.getData('begging')) return;
        const symbol = Math.random() < 0.5 ? '❤️' : '📱?';
        const heart = this.add.text(enemy.x + Phaser.Math.Between(-15, 15), enemy.y - 30, symbol, {
          fontSize: '14px',
        }).setDepth(20);
        this.tweens.add({
          targets: heart,
          y: heart.y - 30,
          alpha: 0,
          duration: 600,
          onComplete: () => heart.destroy(),
        });
      },
      loop: true,
    });
  }

  /** Dior — yells INVESTIGATE or PETITE periodically */
  startDiorBehavior(enemy) {
    const yellLoop = this.time.addEvent({
      delay: 1200,
      callback: () => {
        if (!enemy.active) { yellLoop.remove(); return; }
        const word = Math.random() < 0.5 ? 'INVESTIGATE' : 'PETITE';
        const yell = this.add.text(enemy.x + Phaser.Math.Between(-10, 10), enemy.y - 35, word, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#ff8800',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
          targets: yell,
          y: yell.y - 25,
          alpha: 0,
          duration: 700,
          onComplete: () => yell.destroy(),
        });
      },
      loop: true,
    });
  }

  /** TK dramatic entrance — pause, overlay, SNES text, resume on input */
  triggerTKEntrance() {
    if (this.tkSpawned) return;
    this.tkSpawned = true;

    // Pause gameplay
    this.isPaused = true;
    this.physics.pause();

    // Dark overlay
    const overlay = this.add.rectangle(
      this.cameras.main.scrollX + CONFIG.WIDTH / 2,
      this.cameras.main.scrollY + CONFIG.HEIGHT / 2,
      CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.7
    ).setDepth(50).setScrollFactor(0);

    // Pick random TK quote
    const quotes = CONFIG.TK_QUOTES;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    // Text box
    const boxY = CONFIG.HEIGHT / 2;
    const textBox = this.add.rectangle(CONFIG.WIDTH / 2, boxY, CONFIG.WIDTH - 60, 100, 0x111133, 0.9)
      .setDepth(51).setScrollFactor(0).setStrokeStyle(2, 0xff4444);

    const label = this.add.text(CONFIG.WIDTH / 2, boxY - 30, 'TOM KING:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0);

    const quoteText = this.add.text(CONFIG.WIDTH / 2, boxY + 5, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 2,
      wordWrap: { width: CONFIG.WIDTH - 100 },
      align: 'center',
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0);

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

    const prompt = this.add.text(CONFIG.WIDTH / 2, boxY + 38, '[ PRESS ANY KEY ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0).setAlpha(0);

    // Show prompt after text finishes
    this.time.delayedCall(quote.length * 40 + 500, () => {
      prompt.setAlpha(1);
      this.tweens.add({ targets: prompt, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });

      const resume = () => {
        overlay.destroy();
        textBox.destroy();
        label.destroy();
        quoteText.destroy();
        prompt.destroy();
        // Resume and spawn TK
        this.isPaused = false;
        this.physics.resume();
        this.spawnEnemy('tom_king');
      };
      this.input.once('pointerdown', resume);
      this.input.keyboard.once('keydown', resume);
    });
  }

  spawnEnemy(type) {
    if (this.isGameOver) return;

    const cfg = {
      rocket: { key: 'enemy-rocket', ...CONFIG.ENEMIES.ROCKET, size: 64 },
      pickle: { key: 'enemy-pickle', ...CONFIG.ENEMIES.PICKLE, size: 64 },
      clacky: { key: 'enemy-clacky', ...CONFIG.ENEMIES.CLACKY, size: 64 },
      ravegirl: { key: 'enemy-ravegirl', ...CONFIG.ENEMIES.RAVEGIRL, size: 64 },
      dior: { key: 'enemy-dior', ...CONFIG.ENEMIES.DIOR, size: 64 },
      tom_king: { key: 'enemy-tom-king', ...CONFIG.ENEMIES.TOM_KING, size: 128 },
    }[type];
    if (!cfg) return;

    if (type === 'tom_king') {
      this.audio.playBossSpawn();
      this.audio.switchToBossBGM();
    }

    // Spawn position — TK spawns just outside viewport, others spawn further
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = type === 'tom_king'
      ? Math.max(CONFIG.WIDTH, CONFIG.HEIGHT) * 0.55  // just off-screen
      : Math.max(CONFIG.WIDTH, CONFIG.HEIGHT) * 0.7;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const enemy = this.enemies.create(
      Phaser.Math.Clamp(x, 0, WORLD_SIZE),
      Phaser.Math.Clamp(y, 0, WORLD_SIZE),
      cfg.key
    );
    enemy.setDisplaySize(cfg.size, cfg.size);
    // Shrink physics body to ~60% of visual for fairer hitboxes
    const bodySize = cfg.size * 0.6;
    const offset = (cfg.size - bodySize) / 2;
    enemy.body.setSize(bodySize, bodySize);
    enemy.body.setOffset(offset, offset);

    // TK gets scaling HP based on player power level
    let hp = cfg.hp;
    if (type === 'tom_king') {
      hp += this.powerUpCount * 200;
    }
    enemy.setData('hp', hp);
    enemy.setData('speed', cfg.speed);
    enemy.setData('damage', cfg.damage);
    enemy.setData('type', type);
    enemy.setData('dropChance', cfg.dropChance);
    enemy.setDepth(5);

    // Clacky: start dash-attack loop after initial approach (2s)
    if (type === 'clacky') {
      this.time.delayedCall(2000, () => this.startClackyDash(enemy));
    }
    // Ravegirl: "begging for phone number" — stops near player, hearts float
    if (type === 'ravegirl') {
      this.startRavegirlBehavior(enemy);
    }
    // Dior: yells while approaching
    if (type === 'dior') {
      this.startDiorBehavior(enemy);
    }
  }

  // ── Collisions ──

  onProjectileHitEnemy(projectile, enemy) {
    projectile.setActive(false).setVisible(false);
    projectile.body.enable = false;

    const dmg = this.getProjectileDamage();
    const hp = enemy.getData('hp') - dmg;
    enemy.setData('hp', hp);
    this.audio.playHit();

    // Flash white on hit
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => { if (enemy.active) enemy.clearTint(); });

    if (hp <= 0) {
      this.onEnemyDeath(enemy);
    }
  }

  onEnemyDeath(enemy) {
    const type = enemy.getData('type');

    // Kill counters
    if (type === 'rocket') this.rocketKills++;
    else if (type === 'clacky') this.clackyKills++;
    else if (type === 'pickle') this.pickleKills++;
    else if (type === 'ravegirl') this.ravegirlKills++;
    else if (type === 'dior') this.diorKills++;
    else if (type === 'tom_king') this.tomKingKilled = true;

    // Check if TK should spawn (10 elite kills + final wave)
    const eliteKills = this.ravegirlKills + this.diorKills;
    if (eliteKills >= CONFIG.ELITE_KILLS_FOR_TK && !this.tkSpawned) {
      this.time.delayedCall(500, () => this.triggerTKEntrance());
    }

    // Kill text popups
    if (type === 'clacky') {
      const ofd = this.add.text(enemy.x, enemy.y - 30, 'OFD', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: ofd,
        y: ofd.y - 40,
        alpha: 0,
        duration: 800,
        onComplete: () => ofd.destroy(),
      });
    } else if (type === 'ravegirl') {
      const popup = this.add.text(enemy.x, enemy.y - 30, 'Autojestergooned\nsister!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ff66cc',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: popup,
        y: popup.y - 40,
        alpha: 0,
        duration: 1000,
        onComplete: () => popup.destroy(),
      });
    } else if (type === 'dior') {
      const word = Math.random() < 0.5 ? 'INVESTIGATED!' : 'PETITE\'D!';
      const popup = this.add.text(enemy.x, enemy.y - 30, word, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ff8800',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: popup,
        y: popup.y - 40,
        alpha: 0,
        duration: 1000,
        onComplete: () => popup.destroy(),
      });
    }

    // Drop pickup — elites (clacky/ravegirl/dior) share same drop pool
    if (Math.random() < enemy.getData('dropChance')) {
      if (type === 'tom_king') {
        this.spawnPickup(enemy.x, enemy.y, 'powerup-2x');
      } else if (type === 'clacky' || type === 'ravegirl' || type === 'dior') {
        this.spawnPickup(enemy.x, enemy.y, Math.random() < 0.3 ? 'powerup-2x' : 'powerup-1x');
      } else {
        this.spawnPickup(enemy.x, enemy.y, Math.random() < 0.1 ? 'powerup-2x' : 'powerup-1x');
      }
    }
    // Chance of special pickups
    const specialRoll = Math.random();
    if (type === 'rocket') {
      // Debuffs from rockets: 10% hulk, 5% milk, 5% A1 debuff
      if (specialRoll < 0.10) {
        this.spawnPickup(enemy.x, enemy.y, 'debuff');
      } else if (specialRoll < 0.15) {
        this.spawnPickup(enemy.x, enemy.y, 'milk');
      } else if (specialRoll < 0.20) {
        this.spawnPickup(enemy.x, enemy.y, 'a1');
      }
      // Rocket minor meat heal (4%)
      if (Math.random() < 0.04) {
        this.spawnPickup(enemy.x, enemy.y, 'meat-minor');
      }
    }
    // Aloe from any enemy (5%)
    if (specialRoll >= 0.95) {
      this.spawnPickup(enemy.x, enemy.y, 'aloe');
    }
    // Meat heal from elites (30%)
    if ((type === 'clacky' || type === 'ravegirl' || type === 'dior') && Math.random() < 0.30) {
      this.spawnPickup(enemy.x, enemy.y, 'meat');
    }

    // Boss killed = win
    if (type === 'tom_king') {
      this.endGame(true);
    }

    enemy.destroy();
  }

  onEnemyHitPlayer(player, enemy) {
    // Invincibility frames — skip damage if still invulnerable
    if (this.isInvulnerable || this.godMode) return;

    const dmg = enemy.getData('damage');
    this.playerHP -= dmg;
    this.audio.playPlayerHit();

    // Grant i-frames (350ms normal, 700ms OP mode)
    this.isInvulnerable = true;
    player.setTint(0xff0000);
    player.setAlpha(0.6);

    const iframeDuration = this.opMode ? 700 : 350;
    const flashRepeats = this.opMode ? 7 : 3;

    // Flash effect during i-frames
    this.tweens.add({
      targets: player,
      alpha: { from: 0.3, to: 0.8 },
      duration: 80,
      repeat: flashRepeats,
      yoyo: true,
      onComplete: () => {
        player.setAlpha(1);
        player.clearTint();
        this.isInvulnerable = false;
      }
    });

    // Push enemy back
    const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    enemy.body.velocity.x = Math.cos(angle) * 300;
    enemy.body.velocity.y = Math.sin(angle) * 300;

    // Pickle on-hit: short speed slow
    if (enemy.getData('type') === 'pickle' && !this.isPickleSlowed) {
      this.isPickleSlowed = true;
      this._updatePlayerTint();
      if (this._pickleTimer) this._pickleTimer.remove();
      this._pickleTimer = this.time.delayedCall(CONFIG.PICKLE_SLOW_DURATION, () => {
        this.isPickleSlowed = false;
        this._updatePlayerTint();
      });
    }

    if (this.playerHP <= 0) {
      this.endGame(false);
    }

    this.events.emit('hp-changed', this.playerHP);
  }

  // ── Pickups ──

  spawnPickup(x, y, type) {
    const keyMap = {
      'powerup-1x': 'pickup-1x',
      'powerup-2x': 'pickup-2x',
      'debuff': 'pickup-debuff',
      'aloe': 'pickup-aloe',
      'milk': 'pickup-milk',
      'a1': 'pickup-a1',
      'a1-minor': 'pickup-a1',
      'meat': 'pickup-meat',
      'meat-minor': 'pickup-meat',
    };
    const pickup = this.pickups.create(x, y, keyMap[type]);
    pickup.setDisplaySize(48, 48);
    pickup.setData('pickupType', type);
    pickup.setDepth(3);
    // Auto-despawn after 10s
    this.time.delayedCall(10000, () => { if (pickup.active) pickup.destroy(); });
  }

  onPickup(player, pickup) {
    const type = pickup.getData('pickupType');
    pickup.destroy();

    if (type === 'debuff') {
      // Hulk — lowers fire rate (increases attack cooldown)
      this.audio.playDebuff();
      this.isHulkDebuffed = true;
      player.setTint(0x9900ff);
      if (this._hulkTimer) this._hulkTimer.remove();
      this._hulkTimer = this.time.delayedCall(CONFIG.PLAYER.HULK_DURATION, () => {
        this.isHulkDebuffed = false;
        this._updatePlayerTint();
      });
      this.events.emit('effect-changed', { hulk: true });
    } else if (type === 'milk') {
      // Milk — slows movement speed
      this.audio.playDebuff();
      this.isMilkSlowed = true;
      player.setTint(0xcccccc);
      if (this._milkTimer) this._milkTimer.remove();
      this._milkTimer = this.time.delayedCall(CONFIG.PLAYER.MILK_DURATION, () => {
        this.isMilkSlowed = false;
        this._updatePlayerTint();
      });
      this.events.emit('effect-changed', { milk: true });
    } else if (type === 'aloe') {
      // Aloe — temporary speed boost, resets timer on re-pickup
      this.audio.playSpeedBuff();
      this.isAloeBuffed = true;
      player.setTint(0x00ffaa);
      if (this._aloeTimer) this._aloeTimer.remove();
      this._aloeTimer = this.time.delayedCall(CONFIG.PLAYER.ALOE_DURATION, () => {
        this.isAloeBuffed = false;
        this._updatePlayerTint();
      });
      this.events.emit('effect-changed', { aloe: true });
    } else if (type === 'a1') {
      // A1 — debuff: drains power level until bathroom found
      this.audio.playDebuff();
      this.isA1Debuffed = true;
      player.setTint(0xcc6600);
      if (this._a1DrainTimer) this._a1DrainTimer.remove();
      this._a1DrainTimer = this.time.addEvent({
        delay: CONFIG.PLAYER.A1_DRAIN_INTERVAL,
        callback: () => {
          if (!this.isA1Debuffed || this.isGameOver) return;
          const prev = this.powerUpCount;
          this.powerUpCount = Math.max(0, this.powerUpCount - CONFIG.PLAYER.A1_DRAIN_AMOUNT);
          if (this.powerUpCount !== prev) {
            this.updatePlayerEvolution(prev);
            this.events.emit('powerup-changed', this.powerUpCount);
          }
        },
        loop: true,
      });
      this.events.emit('effect-changed', { a1: true });
    } else if (type === 'meat' || type === 'meat-minor') {
      // Meat — heal player
      this.audio.playPickup();
      const heal = type === 'meat' ? CONFIG.PLAYER.MEAT_HEAL_AMOUNT : CONFIG.PLAYER.MEAT_MINOR_HEAL;
      this.playerHP = Math.min(this.playerHP + heal, CONFIG.PLAYER.HP);
      player.setTint(0x00ff00);
      this.time.delayedCall(300, () => this._updatePlayerTint());
      this.events.emit('hp-changed', this.playerHP);
    } else {
      this.audio.playPickup();
      const amount = type === 'powerup-2x' ? 2 : 1;
      const prevCount = this.powerUpCount;
      this.powerUpCount += amount;
      this.updatePlayerEvolution(prevCount);
    }

    this.events.emit('powerup-changed', this.powerUpCount);
  }

  /** Resolve tint from active effects (priority: a1 > hulk > milk > pickle > aloe > clear) */
  _updatePlayerTint() {
    if (this.isA1Debuffed) this.player.setTint(0xcc6600);
    else if (this.isHulkDebuffed) this.player.setTint(0x9900ff);
    else if (this.isMilkSlowed) this.player.setTint(0xcccccc);
    else if (this.isPickleSlowed) this.player.setTint(0x66cc00);
    else if (this.isAloeBuffed) this.player.setTint(0x00ffaa);
    else this.player.clearTint();
  }

  updatePlayerEvolution(prevCount) {
    const crossed = (threshold) =>
      prevCount < threshold && this.powerUpCount >= threshold;

    if (this.powerUpCount >= CONFIG.PLAYER.ULTRA_THRESHOLD) {
      this.player.setTexture('player-ultra');
      if (crossed(CONFIG.PLAYER.ULTRA_THRESHOLD)) this.audio.playLevelUp();
    } else if (this.powerUpCount >= CONFIG.PLAYER.MEGA_THRESHOLD) {
      this.player.setTexture('player-mega');
      if (crossed(CONFIG.PLAYER.MEGA_THRESHOLD)) this.audio.playLevelUp();
    } else {
      this.player.setTexture('player-default');
    }
    this.player.setDisplaySize(64, 64);
  }

  // ── Bathrooms ──

  spawnBathrooms(count) {
    // Grid-based placement to ensure spread across the map
    const gridSize = Math.ceil(Math.sqrt(count));
    const cellW = WORLD_SIZE / gridSize;
    const cellH = WORLD_SIZE / gridSize;
    const margin = 150; // keep away from edges
    let placed = 0;

    for (let row = 0; row < gridSize && placed < count; row++) {
      for (let col = 0; col < gridSize && placed < count; col++) {
        const x = margin + col * cellW + Math.random() * (cellW - margin * 2);
        const y = margin + row * cellH + Math.random() * (cellH - margin * 2);
        const bathroom = this.bathrooms.create(
          Phaser.Math.Clamp(x, margin, WORLD_SIZE - margin),
          Phaser.Math.Clamp(y, margin, WORLD_SIZE - margin),
          'bathroom'
        );
        bathroom.setDisplaySize(48, 48).setDepth(2).setAlpha(0.7);
        bathroom.refreshBody();
        placed++;
      }
    }
  }

  onBathroom(player, bathroom) {
    if (!this.isA1Debuffed) return;

    // Clear A1 debuff
    this.isA1Debuffed = false;
    if (this._a1DrainTimer) { this._a1DrainTimer.remove(); this._a1DrainTimer = null; }
    this._updatePlayerTint();
    this.events.emit('effect-changed', { a1: false });
    this.bathroomArrow.setVisible(false);

    // Grant 3s invulnerability
    this.isInvulnerable = true;
    player.setTint(0x00ff00);
    this.tweens.add({
      targets: player,
      alpha: { from: 0.5, to: 1 },
      duration: 150,
      repeat: 9,
      yoyo: true,
      onComplete: () => {
        player.setAlpha(1);
        this.isInvulnerable = false;
        this._updatePlayerTint();
      }
    });

    this.audio.playPickup();
  }

  updateBathroomArrow() {
    if (!this.isA1Debuffed) {
      this.bathroomArrow.setVisible(false);
      return;
    }

    // Find nearest bathroom
    let nearest = null;
    let minDist = Infinity;
    this.bathrooms.getChildren().forEach(b => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
      if (d < minDist) { minDist = d; nearest = b; }
    });
    if (!nearest) return;

    // Position arrow at edge of screen pointing toward bathroom
    const cam = this.cameras.main;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);
    const edgeX = CONFIG.WIDTH / 2 + Math.cos(angle) * (CONFIG.WIDTH / 2 - 20);
    const edgeY = CONFIG.HEIGHT / 2 + Math.sin(angle) * (CONFIG.HEIGHT / 2 - 20);

    this.bathroomArrow.setPosition(edgeX, edgeY);
    this.bathroomArrow.setRotation(angle + Math.PI / 2);
    this.bathroomArrow.setVisible(true);
  }

  // ── Wave System ──

  startWave(index) {
    if (index >= CONFIG.WAVES.length) return;
    this.currentWave = index;
    this.waveTimer = 0;
    this.events.emit('wave-changed', index + 1);

    // Clear previous spawn timers
    this.spawnTimers.forEach(t => t.remove());
    this.spawnTimers = [];

    const wave = CONFIG.WAVES[index];
    wave.spawns.forEach((spawn) => {
      if (spawn.interval === -1) {
        // Spawn once immediately
        this.spawnEnemy(spawn.type);
      } else {
        const timer = this.time.addEvent({
          delay: spawn.interval,
          callback: () => this.spawnEnemy(spawn.type),
          repeat: spawn.count - 1,
        });
        this.spawnTimers.push(timer);
      }
    });
  }

  checkWaveProgress() {
    const wave = CONFIG.WAVES[this.currentWave];
    if (!wave) return;
    if (this.waveTimer >= wave.duration && this.currentWave < CONFIG.WAVES.length - 1) {
      this.startWave(this.currentWave + 1);
    }
  }

  // ── Game End ──

  endGame(victory) {
    this.isGameOver = true;
    this.player.setVelocity(0, 0);
    this.spawnTimers.forEach(t => t.remove());
    this.audio.stopBGM();
    this.physics.pause();
    this.scene.stop('HUDScene');

    const data = {
      victory,
      time: Math.floor(this.gameTime / 1000),
      powerUps: this.powerUpCount,
      wave: this.currentWave + 1,
      rocketKills: this.rocketKills,
      clackyKills: this.clackyKills,
      pickleKills: this.pickleKills,
      ravegirlKills: this.ravegirlKills,
      diorKills: this.diorKills,
      tomKingKilled: this.tomKingKilled,
      opMode: this.opMode,
    };

    if (victory) {
      this.scene.start('VictoryScene', data);
    } else {
      this.scene.start('MortyQuoteScene', data);
    }
  }
}
