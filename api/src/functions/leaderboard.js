const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER = 'game-data';
const BLOB = 'leaderboard.json';
const MAX_ENTRIES = 50;
const RATE_LIMIT_MS = 10000;

// In-memory rate limiter (resets on cold start — fine for this scale)
const recentSubmissions = new Map();

async function getContainerClient() {
  const connStr = process.env.AzureStorageConnectionString;
  if (!connStr) throw new Error('Storage not configured');
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  const container = blobService.getContainerClient(CONTAINER);
  await container.createIfNotExists();
  return container;
}

async function readLeaderboard(container) {
  const blob = container.getBlockBlobClient(BLOB);
  try {
    const buffer = await blob.downloadToBuffer();
    return JSON.parse(buffer.toString('utf-8'));
  } catch (e) {
    if (e.statusCode === 404) return [];
    throw e;
  }
}

async function writeLeaderboard(container, data) {
  const blob = container.getBlockBlobClient(BLOB);
  const json = JSON.stringify(data);
  await blob.upload(json, json.length, { overwrite: true });
}

function validateSubmission(body) {
  const { name, score, time, powerUps, wave, victory } = body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 10) {
    return 'Invalid name';
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
    return 'Name must be alphanumeric';
  }
  if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
    return 'Invalid score';
  }
  if (typeof time !== 'number' || time < 0 || !Number.isInteger(time)) {
    return 'Invalid time';
  }
  if (typeof powerUps !== 'number' || powerUps < 0 || !Number.isInteger(powerUps)) {
    return 'Invalid powerUps';
  }
  if (typeof wave !== 'number' || wave < 1 || wave > 6 || !Number.isInteger(wave)) {
    return 'Invalid wave';
  }
  if (typeof victory !== 'boolean') {
    return 'Invalid victory flag';
  }

  // Verify score matches formula
  const expected = time + (powerUps * 10) + (wave * 50) + (victory ? 500 : 0);
  if (score !== expected) {
    return 'Score mismatch';
  }

  return null;
}

// GET /api/leaderboard
app.http('getLeaderboard', {
  methods: ['GET'],
  route: 'leaderboard',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const container = await getContainerClient();
      const scores = await readLeaderboard(container);
      return { jsonBody: scores.slice(0, 10) };
    } catch (e) {
      context.log('GET leaderboard error:', e.message);
      return { status: 500, jsonBody: { error: 'Failed to load leaderboard' } };
    }
  },
});

// POST /api/leaderboard
app.http('postLeaderboard', {
  methods: ['POST'],
  route: 'leaderboard',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    if (recentSubmissions.has(ip) && now - recentSubmissions.get(ip) < RATE_LIMIT_MS) {
      return { status: 429, jsonBody: { error: 'Too many submissions' } };
    }
    recentSubmissions.set(ip, now);

    // Cleanup old rate limit entries
    for (const [key, ts] of recentSubmissions) {
      if (now - ts > RATE_LIMIT_MS * 2) recentSubmissions.delete(key);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } };
    }

    const validationError = validateSubmission(body);
    if (validationError) {
      return { status: 400, jsonBody: { error: validationError } };
    }

    const { name, score, time, powerUps, wave, victory } = body;

    try {
      const container = await getContainerClient();
      const scores = await readLeaderboard(container);
      scores.push({
        name: name.toUpperCase(),
        score,
        wave,
        time,
        victory,
        date: new Date().toISOString().split('T')[0],
      });
      scores.sort((a, b) => b.score - a.score);
      const trimmed = scores.slice(0, MAX_ENTRIES);
      await writeLeaderboard(container, trimmed);
      return { jsonBody: trimmed.slice(0, 10) };
    } catch (e) {
      context.log('POST leaderboard error:', e.message);
      return { status: 500, jsonBody: { error: 'Failed to save score' } };
    }
  },
});
