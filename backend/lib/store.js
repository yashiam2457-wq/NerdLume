const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, passwordRecord) {
  if (!passwordRecord?.salt || !passwordRecord?.hash) return false;
  const check = crypto.scryptSync(String(password), passwordRecord.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(passwordRecord.hash, 'hex'));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function normalizeMobile(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function createState() {
  return {
    meta: {
      createdAt: new Date().toISOString(),
      version: 1
    },
    users: [],
    sessions: [],
    history: [],
    resetRequests: []
  };
}

function seedUsers(state) {
  const demoPwd = process.env.NERDYBRO_DEMO_PASSWORD || 'Demo@1234';
  const premiumPwd = process.env.NERDYBRO_PREMIUM_PASSWORD || 'Premium@1';
  const diamondPwd = process.env.NERDYBRO_DIAMOND_PASSWORD || 'Diamond@1';

  const demoUsers = [
    {
      email: 'demo@nerdybro.in',
      username: 'demo_user',
      password: demoPwd,
      firstName: 'Demo',
      lastName: 'User',
      plan: 'free'
    },
    {
      email: 'premium@nerdybro.in',
      username: 'premium_bro',
      password: premiumPwd,
      firstName: 'Premium',
      lastName: 'Bro',
      plan: 'free-premium'
    },
    {
      email: 'diamond@nerdybro.in',
      username: 'diamond_nerd',
      password: diamondPwd,
      firstName: 'Diamond',
      lastName: 'Nerd',
      plan: 'diamond'
    },
    {
      email: 'premium2@nerdybro.in',
      username: 'premium2_bro',
      password: premiumPwd,
      firstName: 'Premium2',
      lastName: 'Bro',
      plan: 'free-premium'
    },
    {
      email: 'diamond2@nerdybro.in',
      username: 'diamond2_nerd',
      password: diamondPwd,
      firstName: 'Diamond2',
      lastName: 'Nerd',
      plan: 'diamond'
    }
  ];

  demoUsers.forEach((user) => {
    const existing = state.users.find(
      (entry) =>
        normalizeEmail(entry.email) === normalizeEmail(user.email) ||
        normalizeUsername(entry.username) === normalizeUsername(user.username)
    );
    if (existing) return;

    state.users.push({
      id: crypto.randomUUID(),
      email: normalizeEmail(user.email),
      username: normalizeUsername(user.username),
      mobile: '',
      firstName: user.firstName,
      lastName: user.lastName,
      plan: user.plan,
      joinDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      notesCount: 12,
      sessionsCount: 6,
      filesCount: 3,
      password: createPasswordHash(user.password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

function readState() {
  ensureDirectory(config.dataFile);
  if (!fs.existsSync(config.dataFile)) {
    const initial = createState();
    seedUsers(initial);
    fs.writeFileSync(config.dataFile, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(config.dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    const state = {
      ...createState(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      resetRequests: Array.isArray(parsed.resetRequests) ? parsed.resetRequests : []
    };
    seedUsers(state);
    return state;
  } catch {
    const fallback = createState();
    seedUsers(fallback);
    return fallback;
  }
}

function writeState(state) {
  ensureDirectory(config.dataFile);
  fs.writeFileSync(config.dataFile, JSON.stringify(state, null, 2), 'utf8');
}

function findUser(state, identifier) {
  const normalizedEmail = normalizeEmail(identifier);
  const normalizedUsername = normalizeUsername(identifier);
  const normalizedMobile = normalizeMobile(identifier);
  return state.users.find((user) => {
    return (
      normalizeEmail(user.email) === normalizedEmail ||
      normalizeUsername(user.username) === normalizedUsername ||
      normalizeMobile(user.mobile) === normalizedMobile
    );
  });
}

function getSession(state, token) {
  if (!token) return null;
  return state.sessions.find((session) => session.token === token && !session.revokedAt) || null;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    mobile: user.mobile || '',
    firstName: user.firstName,
    lastName: user.lastName || '',
    plan: user.plan || 'free',
    joinDate: user.joinDate || '',
    notesCount: user.notesCount ?? 0,
    sessionsCount: user.sessionsCount ?? 0,
    filesCount: user.filesCount ?? 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function issueSession(state, userId) {
  const now = new Date().toISOString();
  const session = {
    token: crypto.randomUUID(),
    userId,
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    expiresAt: new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000).toISOString()
  };
  state.sessions.push(session);
  return session;
}

function revokeSession(state, token) {
  const session = getSession(state, token);
  if (!session) return null;
  session.revokedAt = new Date().toISOString();
  session.lastSeenAt = session.revokedAt;
  return session;
}

function saveHistory(state, entry) {
  state.history.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  });
  state.history = state.history.slice(0, 200);
}

module.exports = {
  readState,
  writeState,
  findUser,
  getSession,
  publicUser,
  issueSession,
  revokeSession,
  saveHistory,
  createPasswordHash,
  verifyPassword,
  normalizeEmail,
  normalizeUsername,
  normalizeMobile
};
