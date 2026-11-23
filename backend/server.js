const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const crypto = require('crypto');
const config = require('./lib/config');
const store = require('./lib/store');
const study = require('./lib/study-service');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://oauth2.googleapis.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none';"
};

function parseTrustedProxies(rawConfig = process.env.NERDYBRO_TRUSTED_PROXIES || '127.0.0.1,::1') {
  const trusted = new Set();
  for (const part of rawConfig.split(',')) {
    const token = part.trim();
    if (!token) continue;
    // Hard rule: strictly forbid wildcard / open proxy trust
    if (token === '*' || token === 'all' || token === '0.0.0.0/0' || token === '::/0') {
      console.warn(`[SECURITY WARNING] Wildcard proxy '${token}' rejected in TRUSTED_PROXIES.`);
      continue;
    }
    trusted.add(token);
    if (token === '127.0.0.1') trusted.add('::ffff:127.0.0.1');
    if (token === '::1') trusted.add('::ffff:127.0.0.1');
  }
  return trusted;
}

const TRUSTED_PROXIES = parseTrustedProxies();

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

function sanitizeIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return null;
  const clean = ipStr.trim();
  if (IPV4_REGEX.test(clean) || IPV6_REGEX.test(clean) || clean.startsWith('::ffff:')) {
    return clean;
  }
  return null;
}

function getClientIp(req) {
  const directIp = (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  const cleanDirect = sanitizeIp(directIp) || '127.0.0.1';
  if (TRUSTED_PROXIES.has(cleanDirect) || TRUSTED_PROXIES.has(cleanDirect.replace(/^::ffff:/, ''))) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const candidate = String(forwarded).split(',')[0].trim();
      const validCandidate = sanitizeIp(candidate);
      if (validCandidate) return validCandidate;
    }
  }
  return cleanDirect;
}

const RATE_LIMIT_LOGIN = 10;
const RATE_LIMIT_GENERATE = 20;
const rateCounters = new Map();

function checkRateLimit(ip, action, maxRequests) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const key = `${ip}:${action}`;
  let timestamps = rateCounters.get(key) || [];
  timestamps = timestamps.filter(t => t > now - windowMs);
  if (timestamps.length >= maxRequests) {
    rateCounters.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateCounters.set(key, timestamps);
  if (rateCounters.size > 1000) {
    for (const [k, ts] of rateCounters.entries()) {
      const active = ts.filter(t => t > now - windowMs);
      if (active.length === 0) rateCounters.delete(k);
      else rateCounters.set(k, active);
    }
  }
  return true;
}

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function isAccountLocked(identifier) {
  const norm = store.normalizeEmail(identifier) || store.normalizeUsername(identifier);
  const rec = loginAttempts.get(norm);
  if (!rec) return { locked: false, remainingSeconds: 0 };
  const now = Date.now();
  if (rec.lockedUntil > now) {
    return { locked: true, remainingSeconds: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    loginAttempts.delete(norm);
  }
  return { locked: false, remainingSeconds: 0 };
}

function recordLoginFailure(identifier) {
  const norm = store.normalizeEmail(identifier) || store.normalizeUsername(identifier);
  const rec = loginAttempts.get(norm) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_LOGIN_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(norm, rec);
}

function clearLoginFailures(identifier) {
  const norm = store.normalizeEmail(identifier) || store.normalizeUsername(identifier);
  loginAttempts.delete(norm);
}

function sendJson(res, statusCode, payload, cookieToken = null) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    ...SECURITY_HEADERS
  };
  if (cookieToken) {
    headers['Set-Cookie'] = `nb_token=${cookieToken}; Path=/; HttpOnly; SameSite=Lax`;
  } else if (cookieToken === '') {
    headers['Set-Cookie'] = 'nb_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';
  }
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  const body = Buffer.isBuffer(text) ? text : Buffer.from(String(text));
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    ...SECURITY_HEADERS
  });
  res.end(body);
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.headers['x-session-token']) {
    return req.headers['x-session-token'];
  }
  const cookieHeader = req.headers.cookie || '';
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)nb_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]).trim();
  }
  return '';
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function getSessionContext(req) {
  const state = store.readState();
  const token = getRequestToken(req);
  const session = store.getSession(state, token);
  if (!session) return { state, session: null, user: null, token: null };
  session.lastSeenAt = new Date().toISOString();
  const user = state.users.find((entry) => entry.id === session.userId) || null;
  return { state, session, user, token };
}

function updateSessionCounts(state, userId, field) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return;
  user[field] = (user[field] || 0) + 1;
  user.updatedAt = new Date().toISOString();
}

async function handleAuthSignup(req, res, body) {
  const state = store.readState();
  const email = store.normalizeEmail(body.email);
  const username = store.normalizeUsername(body.username || email.split('@')[0]);
  const mobile = store.normalizeMobile(body.mobile);
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const password = String(body.password || '');
  // Security: New accounts ALWAYS start on the 'free' plan. Client cannot request free-premium or diamond.
  const plan = 'free';

  if (!firstName || !email || !username || !password) {
    return sendJson(res, 400, {
      ok: false,
      error: 'firstName, email, username, and password are required'
    });
  }

  if (password.length < 8) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  const emailTaken = state.users.some((user) => store.normalizeEmail(user.email) === email);
  if (emailTaken) {
    return sendJson(res, 409, { ok: false, error: 'Email is already registered' });
  }

  const usernameTaken = state.users.some((user) => store.normalizeUsername(user.username) === username);
  if (usernameTaken) {
    return sendJson(res, 409, { ok: false, error: 'Username is already registered' });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    username,
    mobile,
    firstName,
    lastName,
    plan,
    joinDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    notesCount: 0,
    sessionsCount: 0,
    filesCount: 0,
    password: store.createPasswordHash(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.users.push(user);
  const session = store.issueSession(state, user.id);
  store.writeState(state);

  return sendJson(res, 201, {
    ok: true,
    token: session.token,
    session: {
      token: session.token,
      expiresAt: session.expiresAt
    },
    user: store.publicUser(user)
  }, session.token);
}

async function handleAuthLogin(req, res, body) {
  const identifier = String(body.identifier || body.email || body.username || body.mobile || '').trim();
  const password = String(body.password || '');

  if (!identifier || !password) {
    return sendJson(res, 400, { ok: false, error: 'identifier and password are required' });
  }

  const { locked, remainingSeconds } = isAccountLocked(identifier);
  if (locked) {
    return sendJson(res, 423, {
      ok: false,
      error: `Account temporarily locked due to excessive failed attempts. Please try again in ${remainingSeconds} seconds.`
    });
  }

  const state = store.readState();
  const user = store.findUser(state, identifier);
  if (!user || !store.verifyPassword(password, user.password)) {
    recordLoginFailure(identifier);
    return sendJson(res, 401, { ok: false, error: 'Invalid credentials' });
  }

  clearLoginFailures(identifier);
  const session = store.issueSession(state, user.id);
  user.updatedAt = new Date().toISOString();
  store.writeState(state);

  return sendJson(res, 200, {
    ok: true,
    token: session.token,
    session: {
      token: session.token,
      expiresAt: session.expiresAt
    },
    user: store.publicUser(user)
  }, session.token);
}

async function handleAuthMe(req, res) {
  const { state, user } = getSessionContext(req);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }
  store.writeState(state);
  return sendJson(res, 200, { ok: true, user: store.publicUser(user) });
}

async function handleAuthLogout(req, res) {
  const state = store.readState();
  const token = getRequestToken(req);
  const session = store.revokeSession(state, token);
  if (session) store.writeState(state);
  return sendJson(res, 200, { ok: true }, '');
}

async function handleAuthReset(req, res, body) {
  const state = store.readState();
  const email = store.normalizeEmail(body.email);
  const user = state.users.find((entry) => store.normalizeEmail(entry.email) === email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    state.resetRequests.unshift({
      id: crypto.randomUUID(),
      userId: user.id,
      email,
      token,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    });
    state.resetRequests = state.resetRequests.slice(0, 50);
    store.writeState(state);
  }
  return sendJson(res, 200, {
    ok: true,
    message: 'If the account exists, a reset request has been recorded.'
  });
}

async function handleAuthResetConfirm(req, res, body) {
  const token = String(body.token || '').trim();
  const newPassword = String(body.password || body.newPassword || '');

  if (!token || !newPassword) {
    return sendJson(res, 400, { ok: false, error: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters long' });
  }

  const state = store.readState();
  const resetReq = state.resetRequests.find((r) => r.token === token && !r.used);
  if (!resetReq) {
    return sendJson(res, 400, { ok: false, error: 'Invalid or expired reset token' });
  }

  if (resetReq.expiresAt && new Date(resetReq.expiresAt) <= new Date()) {
    resetReq.used = true;
    store.writeState(state);
    return sendJson(res, 400, { ok: false, error: 'Reset token has expired' });
  }

  const user = state.users.find((u) => u.id === resetReq.userId);
  if (!user) {
    return sendJson(res, 404, { ok: false, error: 'User not found' });
  }

  user.password = store.createPasswordHash(newPassword);
  user.updatedAt = new Date().toISOString();
  resetReq.used = true;

  // Invalidate all active sessions for this user (multi-device logout per Security.txt)
  for (const session of state.sessions) {
    if (session.userId === user.id && !session.revokedAt) {
      session.revokedAt = new Date().toISOString();
    }
  }

  store.writeState(state);
  return sendJson(res, 200, {
    ok: true,
    message: 'Password successfully reset. Please log in with your new credentials.'
  });
}

async function handleUpdateProfile(req, res, body) {
  const { state, user } = getSessionContext(req);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  const nextFirstName = String(body.firstName || user.firstName).trim();
  const nextLastName = String(body.lastName || user.lastName || '').trim();
  const nextUsername = store.normalizeUsername(body.username || user.username);
  const nextMobile = store.normalizeMobile(body.mobile || user.mobile || '');

  if (!nextFirstName) {
    return sendJson(res, 400, { ok: false, error: 'firstName is required' });
  }

  const usernameTaken = state.users.some(
    (entry) =>
      entry.id !== user.id &&
      store.normalizeUsername(entry.username) === nextUsername
  );
  if (usernameTaken) {
    return sendJson(res, 409, { ok: false, error: 'Username is already registered' });
  }

  user.firstName = nextFirstName;
  user.lastName = nextLastName;
  user.username = nextUsername;
  user.mobile = nextMobile;
  user.updatedAt = new Date().toISOString();
  store.writeState(state);

  return sendJson(res, 200, { ok: true, user: store.publicUser(user) });
}

async function handleGenerate(req, res, body) {
  const state = store.readState();
  const token = getRequestToken(req);
  const session = store.getSession(state, token);

  const mode = String(body.mode || body.kind || 'notes').toLowerCase();
  const practiceType = String(body.practiceType || '').toLowerCase();
  const blockedModes = ['mock', 'flash', 'flashcard', 'flashcards', 'video-notes', 'video'];
  const blockedTypes = ['mock test paper', 'flash cards', 'mock', 'flash', 'flashcard', 'flashcards'];

  if (session) {
    const user = state.users.find((entry) => entry.id === session.userId);
    if (user && user.plan === 'free') {
      if (blockedModes.includes(mode) || blockedTypes.includes(practiceType) || body.technique === 'Video Notes') {
        return sendJson(res, 403, {
          ok: false,
          error: 'The selected option requires a Premium or Diamond plan.'
        });
      }
    }
  }

  const result = study.generateContent(body);

  if (session) {
    const user = state.users.find((entry) => entry.id === session.userId);
    if (user) {
      updateSessionCounts(state, user.id, 'sessionsCount');
      store.saveHistory(state, {
        userId: user.id,
        kind: result.mode,
        topic: result.topic,
        provider: result.provider,
        request: body,
        output: result.output
      });
      store.writeState(state);
    }
  }

  return sendJson(res, 200, {
    ok: true,
    ...result
  });
}

async function handleHistory(req, res) {
  const { state, user } = getSessionContext(req);
  if (!user) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }
  const history = state.history.filter((entry) => entry.userId === user.id);
  return sendJson(res, 200, { ok: true, history });
}

const ALLOWED_STATIC_EXTS = new Set([
  '.html', '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.gif',
  '.svg', '.ico', '.woff', '.woff2', '.ttf', '.webp', '.txt', '.docx'
]);
const FORBIDDEN_DIRS = new Set(['backend', 'node_modules', '.git', 'data', '.next', 'backup', 'New folder']);
const FORBIDDEN_FILES = new Set(['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts']);

function serveStatic(req, res, pathname) {
  const rootDir = path.resolve(__dirname, '..');
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(rootDir, normalized);
  let resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    const fePath = path.resolve(path.join(rootDir, 'frontend', normalized));
    const pubPath = path.resolve(path.join(rootDir, 'frontend', 'public', normalized));
    if (fs.existsSync(fePath) && !fs.statSync(fePath).isDirectory()) {
      resolved = fePath;
    } else if (fs.existsSync(pubPath) && !fs.statSync(pubPath).isDirectory()) {
      resolved = pubPath;
    }
  }

  if (!resolved.startsWith(rootDir)) {
    return sendText(res, 403, 'Forbidden');
  }

  const baseName = path.basename(resolved);
  if (FORBIDDEN_FILES.has(baseName)) {
    return sendText(res, 403, 'Forbidden');
  }

  const relative = path.relative(rootDir, resolved);
  const segments = relative.split(path.sep);

  if (segments.some(seg => seg.startsWith('.') || FORBIDDEN_DIRS.has(seg))) {
    return sendText(res, 403, 'Forbidden');
  }

  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_STATIC_EXTS.has(ext)) {
    return sendText(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return sendText(res, 404, 'Not found');
  }

  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain; charset=utf-8',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }[ext] || 'application/octet-stream';

  sendText(res, 200, fs.readFileSync(resolved), contentType);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const clientIp = getClientIp(req);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': config.corsOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS'
    });
    return res.end();
  }

  try {
    if (requestUrl.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        name: 'NerdLume Backend',
        provider: config.apiProvider,
        time: new Date().toISOString()
      });
    }

    if (requestUrl.pathname === '/api/plans') {
      return sendJson(res, 200, {
        ok: true,
        plans: [
          { id: 'free', label: 'Free' },
          { id: 'free-premium', label: 'Premium' },
          { id: 'diamond', label: 'Diamond' }
        ]
      });
    }

    if (requestUrl.pathname === '/api/auth/signup' && req.method === 'POST') {
      if (!checkRateLimit(clientIp, 'signup', RATE_LIMIT_LOGIN)) {
        return sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again later.' });
      }
      return handleAuthSignup(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!checkRateLimit(clientIp, 'login', RATE_LIMIT_LOGIN)) {
        return sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again later.' });
      }
      return handleAuthLogin(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/auth/me' && req.method === 'GET') {
      return handleAuthMe(req, res);
    }

    if (requestUrl.pathname === '/api/auth/logout' && req.method === 'POST') {
      return handleAuthLogout(req, res);
    }

    if (requestUrl.pathname === '/api/auth/reset-password' && req.method === 'POST') {
      return handleAuthReset(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/auth/reset-password/confirm' && req.method === 'POST') {
      return handleAuthResetConfirm(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/profile' && req.method === 'PATCH') {
      return handleUpdateProfile(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/generate' && req.method === 'POST') {
      if (!checkRateLimit(clientIp, 'generate', RATE_LIMIT_GENERATE)) {
        return sendJson(res, 429, { ok: false, error: 'Too many generation requests. Please wait a minute.' });
      }
      return handleGenerate(req, res, await readBody(req));
    }

    if (requestUrl.pathname === '/api/history' && req.method === 'GET') {
      return handleHistory(req, res);
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      return sendJson(res, 404, { ok: false, error: 'Route not found' });
    }

    return serveStatic(req, res, requestUrl.pathname);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: 'An internal server error occurred.'
    });
  }
});

server.listen(config.port, () => {
  console.log(`NerdLume backend listening on http://localhost:${config.port}`);
});
