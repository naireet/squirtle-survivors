import Phaser from 'phaser';
import { CONFIG } from '../config.js';

const WORLD_SIZE = 2000; // world is larger than viewport; camera follows player

/**
 * GameScene — main gameplay: player, enemies, projectiles, pickups, waves.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // -- World bounds --
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // -- Background (tiled grid placeholder until real bg is sourced) --
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x333355, 0.3);
    for (let x = 0; x <= WORLD_SIZE; x += 64) {
      gfx.moveTo(x, 0); gfx.lineTo(x, WORLD_SIZE);
    }
    for (let y = 0; y <= WORLD_SIZE; y += 64) {
      gfx.moveTo(0, y); gfx.lineTo(WORLD_SIZE, y);
    }
    gfx.strokePath();

    // -- Game state --
    this.powerUpCount = 0;
    this.playerHP = CONFIG.PLAYER.HP;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.gameTime = 0;
    this.isGameOver = false;
    this.lastAttackTime = 0;

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

    // -- Wave system --
    this.spawnTimers = [];
    this.startWave(0);
  }

  update(time, delta) {
    if (this.isGameOver) return;

    this.gameTime += delta;
    this.waveTimer += delta;
    this.handleMovement();
    this.handleAutoAttack(time);
    this.updateEnemies();
    this.checkWaveProgress();
  }

  // ── Movement ──

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

    const speed = this.player.getData('debuffed')
      ? CONFIG.PLAYER.SPEED * CONFIG.PLAYER.DEBUFF_SLOW_FACTOR
      : CONFIG.PLAYER.SPEED;

    if (vx !== 0 || vy !== 0) {
      const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
      this.player.setVelocity(vec.x, vec.y);
      this.player.setRotation(Math.atan2(vy, vx));
    } else {
      this.player.setVelocity(0, 0);
    }
  }

  setupMobileJoystick() {
    // Simple touch-drag joystick
    let origin = null;
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < CONFIG.WIDTH / 2) { // left half = joystick
        origin = { x: pointer.x, y: pointer.y };
      }
    });
    this.input.on('pointermove', (pointer) => {
      if (origin && pointer.isDown) {
        const dx = pointer.x - origin.x;
        const dy = pointer.y - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) {
          this.joystickVector.set(dx / len, dy / len);
        }
      }
    });
    this.input.on('pointerup', () => {
      origin = null;
      this.joystickVector.set(0, 0);
    });
  }

  // ── Auto-Attack ──

  handleAutoAttack(time) {
    if (time - this.lastAttackTime < CONFIG.PLAYER.ATTACK_COOLDOWN) return;

    const nearest = this.physics.closest(this.player, this.enemies.getChildren().filter(e => e.active));
    if (!nearest) return;

    this.lastAttackTime = time;
    this.fireProjectile(nearest);
  }

  fireProjectile(target) {
    const proj = this.projectiles.get(this.player.x, this.player.y, '__DEFAULT');
    if (!proj) return;

    // Simple circle projectile
    proj.setActive(true).setVisible(true);
    if (!proj.body) this.physics.add.existing(proj);
    proj.body.enable = true;

    // Draw a small circle texture if not yet created
    if (!this.textures.exists('projectile')) {
      const gfx = this.make.graphics({ add: false });
      gfx.fillStyle(0x00ccff);
      gfx.fillCircle(6, 6, 6);
      gfx.generateTexture('projectile', 12, 12);
      gfx.destroy();
    }
    proj.setTexture('projectile');
    proj.setDisplaySize(12, 12);
    proj.setDepth(5);

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
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

    // Flash white on hit
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => { if (enemy.active) enemy.clearTint(); });

    if (hp <= 0) {
      this.onEnemyDeath(enemy);
    }
  }

  onEnemyDeath(enemy) {
    const type = enemy.getData('type');

    // Drop pickup
    if (Math.random() < enemy.getData('dropChance')) {
      this.spawnPickup(enemy.x, enemy.y, type === 'tom_king' ? 'powerup-2x' : 'powerup-1x');
    }
    // Small chance of debuff drop
    if (Math.random() < 0.1) {
      this.spawnPickup(enemy.x, enemy.y, 'debuff');
    }

    // Boss killed = win
    if (type === 'tom_king') {
      this.endGame(true);
    }

    enemy.destroy();
  }

  onEnemyHitPlayer(player, enemy) {
    const dmg = enemy.getData('damage');
    this.playerHP -= dmg;

    // Knockback + invincibility frames
    player.setTint(0xff0000);
    this.time.delayedCall(200, () => { if (player.active) player.clearTint(); });

    // Push enemy back slightly
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
      player.setData('debuffed', true);
      player.setTint(0x9900ff);
      this.time.delayedCall(CONFIG.PLAYER.DEBUFF_DURATION, () => {
        player.setData('debuffed', false);
        player.clearTint();
      });
    } else {
      const amount = type === 'powerup-2x' ? 2 : 1;
      this.powerUpCount += amount;
      this.updatePlayerEvolution();
    }

    this.events.emit('powerup-changed', this.powerUpCount);
  }

  updatePlayerEvolution() {
    if (this.powerUpCount >= CONFIG.PLAYER.ULTRA_THRESHOLD) {
      this.player.setTexture('player-ultra');
    } else if (this.powerUpCount >= CONFIG.PLAYER.MEGA_THRESHOLD) {
      this.player.setTexture('player-mega');
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
    this.physics.pause();
    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', {
      victory,
      time: Math.floor(this.gameTime / 1000),
      powerUps: this.powerUpCount,
    });
  }
}
