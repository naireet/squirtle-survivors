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
    DEBUFF_SLOW_FACTOR: 0.4, // multiplied by speed when debuffed
    DEBUFF_DURATION: 3000,   // ms
    MEGA_THRESHOLD: 5,
    ULTRA_THRESHOLD: 10,
  },

  ENEMIES: {
    ROCKET: { hp: 30, speed: 80, damage: 10, score: 10, dropChance: 0.2 },
    CLACKY: { hp: 80, speed: 120, damage: 20, score: 25, dropChance: 1.0 },
    TOM_KING: { hp: 500, speed: 60, damage: 25, score: 200, dropChance: 1.0 },
  },

  WAVES: [
    { duration: 30000, spawns: [{ type: 'rocket', interval: 1000, count: 15 }] },
    { duration: 30000, spawns: [{ type: 'rocket', interval: 800, count: 20 }] },
    { duration: 30000, spawns: [
      { type: 'rocket', interval: 1000, count: 10 },
      { type: 'clacky', interval: 2000, count: 6 },
    ]},
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 1000, count: 12 },
      { type: 'rocket', interval: 1500, count: 6 },
    ]},
    { duration: 30000, spawns: [{ type: 'clacky', interval: 700, count: 20 }] },
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 1500, count: 8 },
      { type: 'tom_king', interval: -1, count: 1 },  // -1 = spawn once immediately
    ]},
  ],
};
