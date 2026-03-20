/** Game-wide constants and tuning values */
export const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,

  PLAYER: {
    SPEED: 200,
    HP: 100,
    ATTACK_COOLDOWN: 500,    // ms between auto-attacks
    PROJECTILE_SPEED: 400,
    BASE_DAMAGE: 10,
    DAMAGE_PER_POWERUP: 3,
    // Hulk debuff — lowers fire rate (higher cooldown)
    HULK_COOLDOWN_MULT: 2.5,  // attack cooldown multiplied by this
    HULK_DURATION: 4000,      // ms
    // Milk debuff — slows movement speed
    MILK_SLOW_FACTOR: 0.6,    // multiplied by speed (was 0.4)
    MILK_DURATION: 3000,      // ms
    // Aloe buff — temporary speed boost
    ALOE_SPEED_FACTOR: 1.25,  // multiplied by speed
    ALOE_DURATION: 5000,      // ms
    // A1 heal
    A1_HEAL_AMOUNT: 30,       // HP restored (clacky drop)
    A1_MINOR_HEAL: 15,        // HP restored (rocket drop)
    MEGA_THRESHOLD: 5,
    MEGA_COOLDOWN_MULT: 0.7,   // 30% faster attacks at mega
    MEGA_SHOT_COUNT: 2,        // dual-shot spread
    ULTRA_THRESHOLD: 10,
    ULTRA_COOLDOWN_MULT: 0.5,  // 50% faster attacks at ultra
    ULTRA_SHOT_COUNT: 3,       // triple-shot spread
    ULTRA_PROJ_SIZE: 16,       // bigger projectiles (default 12)
  },

  ENEMIES: {
    ROCKET: { hp: 30, speed: 85, damage: 12, score: 10, dropChance: 0.2 },
    CLACKY: { hp: 90, speed: 120, damage: 22, score: 25, dropChance: 1.0 },
    TOM_KING: { hp: 500, speed: 60, damage: 30, score: 200, dropChance: 1.0 },
  },

  WAVES: [
    { duration: 30000, spawns: [{ type: 'rocket', interval: 600, count: 25 }] },
    { duration: 30000, spawns: [{ type: 'rocket', interval: 400, count: 35 }] },
    { duration: 30000, spawns: [
      { type: 'rocket', interval: 500, count: 20 },
      { type: 'clacky', interval: 1200, count: 10 },
    ]},
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 600, count: 20 },
      { type: 'rocket', interval: 800, count: 15 },
    ]},
    { duration: 30000, spawns: [{ type: 'clacky', interval: 400, count: 30 }] },
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 800, count: 15 },
      { type: 'tom_king', interval: -1, count: 1 },  // -1 = spawn once immediately
    ]},
  ],
};
