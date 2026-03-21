/**
 * Local high score system using localStorage.
 * Stores top 10 scores sorted by score descending.
 */
const STORAGE_KEY = 'squirtle-survivors-highscores';
const MAX_ENTRIES = 10;

/** Calculate score from game stats */
export function calculateScore({ time, powerUps, wave, victory }) {
  // Base: time survived in seconds + powerups * 10 + wave * 50
  // Victory bonus: +500
  return time + (powerUps * 10) + (wave * 50) + (victory ? 500 : 0);
}

/** Get all high scores (sorted desc) */
export function getHighScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Check if a score qualifies for the leaderboard */
export function isHighScore(score) {
  const scores = getHighScores();
  return scores.length < MAX_ENTRIES || score > scores[scores.length - 1].score;
}

/** Save a new high score entry. Returns the updated list. */
export function saveHighScore(name, score, stats) {
  const scores = getHighScores();
  scores.push({
    name: name.substring(0, 10).toUpperCase(),
    score,
    wave: stats.wave,
    time: stats.time,
    victory: stats.victory,
    date: new Date().toISOString().split('T')[0],
  });
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* localStorage full — ignore */ }
  return trimmed;
}
