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
    // A1 debuff — drains power level until bathroom
    A1_DRAIN_INTERVAL: 2000,  // ms between power drains
    A1_DRAIN_AMOUNT: 1,       // power lost per tick
    // Meat heal
    MEAT_HEAL_AMOUNT: 30,     // HP restored (clacky drop)
    MEAT_MINOR_HEAL: 15,      // HP restored (rocket drop)
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
    PICKLE: { hp: 25, speed: 90, damage: 10, score: 8, dropChance: 0.15 },
    CLACKY: { hp: 90, speed: 120, damage: 22, score: 25, dropChance: 1.0 },
    RAVEGIRL: { hp: 180, speed: 110, damage: 20, score: 40, dropChance: 1.0 },
    TOM_KING: { hp: 3000, speed: 60, damage: 30, score: 200, dropChance: 1.0 },
  },

  // Pickle on-hit slow
  PICKLE_SLOW_FACTOR: 0.5,
  PICKLE_SLOW_DURATION: 1500,

  // Ravegirl kills needed to trigger TK
  RAVEGIRL_KILLS_FOR_TK: 5,

  TK_QUOTES: [
    'Up in the Sky is a masterpiece!',
    'You will never go back to Japan again, I will make sure!',
    'Strat, I will give Luffy PTSD!',
  ],

  WAVES: [
    { duration: 30000, spawns: [
      { type: 'rocket', interval: 600, count: 20 },
      { type: 'pickle', interval: 900, count: 12 },
    ]},
    { duration: 30000, spawns: [
      { type: 'rocket', interval: 400, count: 25 },
      { type: 'pickle', interval: 600, count: 18 },
    ]},
    { duration: 30000, spawns: [
      { type: 'rocket', interval: 500, count: 15 },
      { type: 'pickle', interval: 700, count: 12 },
      { type: 'clacky', interval: 1200, count: 8 },
    ]},
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 600, count: 15 },
      { type: 'ravegirl', interval: 2000, count: 6 },
      { type: 'pickle', interval: 800, count: 10 },
    ]},
    { duration: 30000, spawns: [
      { type: 'clacky', interval: 500, count: 20 },
      { type: 'ravegirl', interval: 1500, count: 8 },
      { type: 'rocket', interval: 700, count: 12 },
    ]},
    { duration: 60000, spawns: [
      { type: 'ravegirl', interval: 1200, count: 15 },
      { type: 'clacky', interval: 800, count: 20 },
      { type: 'pickle', interval: 600, count: 20 },
    ]},
  ],
};
