'use strict';

const fs = require('fs');
const path = require('path');

/** Minimal .env loader (no external dependency). */
function loadEnvFile() {
  const file = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnvFile();

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const authSecret = process.env.AUTH_SECRET || 'dev-only-secret-change-me';

// In production every secret must be set on purpose (no silent defaults).
function required(name, devDefault) {
  const value = process.env[name] || (isProduction ? '' : devDefault);
  if (!value) throw new Error(`${name} must be set in production.`);
  return value;
}
if (isProduction && authSecret === 'dev-only-secret-change-me') throw new Error('AUTH_SECRET must be set in production.');

const adminPath = required('ADMIN_PATH', 'secret-admin');
if (!/^[A-Za-z0-9_-]{6,60}$/.test(adminPath)) throw new Error('ADMIN_PATH must be 6-60 letters, digits, - or _');

const dbName = process.env.DB_NAME || 'easetraveling';
if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('DB_NAME may only contain letters, digits and _');

module.exports = Object.freeze({
  env,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  authSecret,
  tokenTtlMs: (Number(process.env.TOKEN_TTL_HOURS) || 8) * 60 * 60 * 1000,
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  serviceFee: Number(process.env.SERVICE_FEE) || 500,
  publicDir: path.join(__dirname, '..', '..', 'public'),
  adminDir: path.join(__dirname, '..', '..', 'admin'),
  adminPath,                                   // secret URL of the admin panel: /<adminPath>/
  adminEmail: required('ADMIN_EMAIL', 'admin@easetraveling.pk'),
  adminPassword: required('ADMIN_PASSWORD', 'Admin@12345'),
  seedDemo: process.env.SEED_DEMO_DATA ? process.env.SEED_DEMO_DATA === 'true' : !isProduction,
  dbDriver: (process.env.DB_DRIVER || 'memory').toLowerCase(),   // 'memory' (no database) or 'mysql'
  dataFile: process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'dev-data.json'),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: dbName,
    ssl: process.env.DB_SSL === 'true',
  },
  support: {                                   // shown on the website (leave empty to hide)
    phone: (process.env.SUPPORT_PHONE || '').trim(),
    whatsapp: (process.env.SUPPORT_WHATSAPP || '').replace(/\D/g, ''),   // digits only, e.g. 923001234567
    email: (process.env.SUPPORT_EMAIL || '').trim(),
  },
  maxBodyBytes: 100 * 1024,
  rateLimit: { windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || 120 },
});
