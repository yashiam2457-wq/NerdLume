const path = require('path');

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: toNumber(process.env.NERDLUME_PORT || process.env.NERDYBRO_PORT || process.env.PORT, 5050),
  corsOrigin: process.env.NERDLUME_CORS_ORIGIN || process.env.NERDYBRO_CORS_ORIGIN || 'http://localhost:5050',
  dataFile: path.resolve(
    __dirname,
    '..',
    process.env.NERDLUME_DATA_FILE || process.env.NERDYBRO_DATA_FILE || 'data/state.json'
  ),
  sessionTtlDays: toNumber(process.env.NERDLUME_SESSION_TTL_DAYS || process.env.NERDYBRO_SESSION_TTL_DAYS, 30),
  apiProvider: process.env.NERDLUME_API_PROVIDER || process.env.NERDYBRO_API_PROVIDER || 'local',
  apiBaseUrl: process.env.NERDLUME_API_BASE_URL || process.env.NERDYBRO_API_BASE_URL || '',
  apiKey: process.env.NERDLUME_API_KEY || process.env.NERDYBRO_API_KEY || ''
};
