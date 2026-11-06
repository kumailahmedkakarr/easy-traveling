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

/** Most hosts give ONE connection link: mysql://user:password@host:3306/database?ssl=true */
function dbFromUrl() {
  const link = process.env.DATABASE_URL;
  if (!link) return null;
  try {
    const u = new URL(link);
    return {
      host: u.hostname, port: Number(u.port) || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
      name: u.pathname.replace(/^\//, '') || undefined, ssl: u.searchParams.get('ssl') === 'true' || /ssl-mode=required/i.test(u.search),
    };
  } catch { throw new Error('DATABASE_URL is not a valid link (expected mysql://user:password@host:3306/database)'); }
}
const fromUrl = dbFromUrl();
const dbName = (fromUrl && fromUrl.name) || process.env.DB_NAME || 'easetraveling';
if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('The database name may only contain letters, digits and _');
const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

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
  serverless,                                  // true on Vercel: no writable disk, no long-running server
  // 'memory' (no database) or 'mysql'. If a database link / host is given and DB_DRIVER is not, MySQL is used.
  dbDriver: (process.env.DB_DRIVER || (fromUrl || process.env.DB_HOST ? 'mysql' : 'memory')).toLowerCase(),
  dataFile: serverless ? null : (process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'dev-data.json')),
  payment: {                                   // where customers send money (shown on the website and the ticket)
    easypaisa: process.env.PAY_EASYPAISA || '03363739610',
    bankName: process.env.PAY_BANK_NAME || 'Bank Al Falah',
    bankAccount: process.env.PAY_BANK_ACCOUNT || '00601004849348',
  },
  db: {
    host: (fromUrl && fromUrl.host) || process.env.DB_HOST || '127.0.0.1',
    port: (fromUrl && fromUrl.port) || Number(process.env.DB_PORT) || 3306,
    user: (fromUrl && fromUrl.user) || process.env.DB_USER || 'root',
    password: (fromUrl && fromUrl.password) || process.env.DB_PASSWORD || '',
    name: dbName,
    ssl: (fromUrl && fromUrl.ssl) || process.env.DB_SSL === 'true',
  },
  support: {                                   // shown on the website (leave empty to hide)
    phone: (process.env.SUPPORT_PHONE || '').trim(),
    whatsapp: (process.env.SUPPORT_WHATSAPP || '').replace(/\D/g, ''),   // digits only, e.g. 923001234567
    email: (process.env.SUPPORT_EMAIL || '').trim(),
  },
  maxBodyBytes: 100 * 1024,
  rateLimit: { windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || 120 },
});
