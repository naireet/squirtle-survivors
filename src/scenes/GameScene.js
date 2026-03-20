import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { RetroAudio } from '../audio.js';

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

    // Temporary effect timers
    this._aloeTimer = null;
    this._milkTimer = null;
    this._hulkTimer = null;
    this.isAloeBuffed = false;
    this.isMilkSlowed = false;
    this.isHulkDebuffed = false;

    // -- Player --
    this.player = this.physics.add.sprite(
      WORLD_SIZE / 2, WORLD_SIZE / 2, 'player-default'
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDisplaySize(64, 64);
    this.player.setDepth(10);

    // -- Input --
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

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

    // -- Camera --
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // -- HUD (parallel scene) --
    this.scene.launch('HUDScene', { gameScene: this });

    // -- Pause (ESC or P) --
    this.isPaused = false;
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());

    // -- Wave system --
    this.spawnTimers = [];
    this.startWave(0);
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    this.gameTime += delta;
    this.waveTimer += delta;
    this.handleMovement();
    this.handleAutoAttack(time);
    this.updateEnemies();
    this.checkWaveProgress();
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

  // ── Movement ──

  getEffectiveSpeed() {
    let speed = CONFIG.PLAYER.SPEED;
    if (this.isAloeBuffed) speed *= CONFIG.PLAYER.ALOE_SPEED_FACTOR;
    if (this.isMilkSlowed) speed *= CONFIG.PLAYER.MILK_SLOW_FACTOR;
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

    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;
    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;

    // Mobile joystick override
    if (this.joystickVector.length() > 0.1) {
      vx = this.joystickVector.x;
      vy = this.joystickVector.y;
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
      this.physics.moveToObject(enemy, this.player, enemy.getData('speed'));
    });
  }

  spawnEnemy(type) {
    if (this.isGameOver) return;

    const cfg = {
      rocket: { key: 'enemy-rocket', ...CONFIG.ENEMIES.ROCKET, size: 64 },
      clacky: { key: 'enemy-clacky', ...CONFIG.ENEMIES.CLACKY, size: 64 },
      tom_king: { key: 'enemy-tom-king', ...CONFIG.ENEMIES.TOM_KING, size: 128 },
    }[type];
    if (!cfg) return;

    if (type === 'tom_king') {
      this.audio.playBossSpawn();
      this.audio.switchToBossBGM();
    }

    // Spawn off-screen in a random direction
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Math.max(CONFIG.WIDTH, CONFIG.HEIGHT) * 0.7;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const enemy = this.enemies.create(
      Phaser.Math.Clamp(x, 0, WORLD_SIZE),
      Phaser.Math.Clamp(y, 0, WORLD_SIZE),
      cfg.key
    );
    enemy.setDisplaySize(cfg.size, cfg.size);
    enemy.setData('hp', cfg.hp);
    enemy.setData('speed', cfg.speed);
    enemy.setData('damage', cfg.damage);
    enemy.setData('type', type);
    enemy.setData('dropChance', cfg.dropChance);
    enemy.setDepth(5);
  }

  // ── Collisions ──

  onProjectileHitEnemy(projectile, enemy) {
    projectile.setActive(false).setVisible(false);
    projectile.body.enable = false;

    const dmg = CONFIG.PLAYER.BASE_DAMAGE + (this.powerUpCount * CONFIG.PLAYER.DAMAGE_PER_POWERUP);
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

    // Drop pickup — type determines what drops
    if (Math.random() < enemy.getData('dropChance')) {
      if (type === 'tom_king') {
        this.spawnPickup(enemy.x, enemy.y, 'powerup-2x');
      } else if (type === 'clacky') {
        this.spawnPickup(enemy.x, enemy.y, Math.random() < 0.3 ? 'powerup-2x' : 'powerup-1x');
      } else {
        this.spawnPickup(enemy.x, enemy.y, Math.random() < 0.1 ? 'powerup-2x' : 'powerup-1x');
      }
    }
    // Chance of special pickups (mutually exclusive per drop)
    const specialRoll = Math.random();
    if (type === 'rocket') {
      // Debuffs only drop from rockets — 15% hulk, 10% milk
      if (specialRoll < 0.15) {
        this.spawnPickup(enemy.x, enemy.y, 'debuff');
      } else if (specialRoll < 0.25) {
        this.spawnPickup(enemy.x, enemy.y, 'milk');
      }
    }
    // Aloe can drop from any enemy (3% chance)
    if (specialRoll >= 0.97) {
      this.spawnPickup(enemy.x, enemy.y, 'aloe');
    }

    // Boss killed = win
    if (type === 'tom_king') {
      this.endGame(true);
    }

    enemy.destroy();
  }

  onEnemyHitPlayer(player, enemy) {
    // Invincibility frames — skip damage if still invulnerable
    if (this.isInvulnerable) return;

    const dmg = enemy.getData('damage');
    this.playerHP -= dmg;
    this.audio.playPlayerHit();

    // Grant i-frames (350ms of invulnerability)
    this.isInvulnerable = true;
    player.setTint(0xff0000);
    player.setAlpha(0.6);

    // Flash effect during i-frames
    this.tweens.add({
      targets: player,
      alpha: { from: 0.3, to: 0.8 },
      duration: 80,
      repeat: 3,
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
    } else {
      this.audio.playPickup();
      const amount = type === 'powerup-2x' ? 2 : 1;
      const prevCount = this.powerUpCount;
      this.powerUpCount += amount;
      this.updatePlayerEvolution(prevCount);
    }

    this.events.emit('powerup-changed', this.powerUpCount);
  }

  /** Resolve tint from active effects (priority: hulk > milk > aloe > clear) */
  _updatePlayerTint() {
    if (this.isHulkDebuffed) this.player.setTint(0x9900ff);
    else if (this.isMilkSlowed) this.player.setTint(0xcccccc);
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
    }
    this.player.setDisplaySize(64, 64);
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
    this.scene.start('GameOverScene', {
      victory,
      time: Math.floor(this.gameTime / 1000),
      powerUps: this.powerUpCount,
      wave: this.currentWave + 1,
    });
  }
}
