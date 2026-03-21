/**
 * High score system — local (localStorage) + global (Azure API).
 * Local stores top 10 as fallback. Global API is authoritative when available.
 */
const STORAGE_KEY = 'squirtle-survivors-highscores';
const MAX_ENTRIES = 10;
const API_URL = '/api/leaderboard';

/** Calculate score from game stats */
export function calculateScore({ time, powerUps, wave, victory }) {
  return time + (powerUps * 10) + (wave * 50) + (victory ? 500 : 0);
}

// ── Local storage helpers ──

export function getHighScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isHighScore(score) {
  const scores = getHighScores();
  return scores.length < MAX_ENTRIES || score > scores[scores.length - 1].score;
}

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
  } catch { /* localStorage full */ }
  return trimmed;
}

// ── Global API helpers ──

/** Fetch global top 10. Returns array or null on failure. */
export async function fetchGlobalScores() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Submit score to global leaderboard. Returns updated top 10 or null. */
export async function submitGlobalScore(name, score, stats) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.substring(0, 10),
        score,
        time: stats.time,
        powerUps: stats.powerUps,
        wave: stats.wave,
        victory: stats.victory,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
