'use strict';

const crypto = require('crypto');
const config = require('../config');
const { uid } = require('../utils/ids');
const { unauthorized } = require('../utils/errors');
const { DuplicateKeyError } = require('../db/errors');

// ---------- password hashing (scrypt, built into Node) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---------- signed tokens (HMAC-SHA256) ----------
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (body) => crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url');

function issueToken(admin) {
  const body = b64({ sub: admin.id, role: 'admin', exp: Date.now() + config.tokenTtlMs });
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

const DUMMY_HASH = hashPassword('not-a-real-password'); // keeps timing similar when the email does not exist
function createAdminAuthService(store) {
  return {
    findById: (id) => store.findAdminById(id),

    async login(body) {
      const email = String(body.email || '').trim();
      const admin = email ? await store.findAdminByEmail(email) : null;
      const ok = verifyPassword(String(body.password || ''), admin ? admin.passwordHash : DUMMY_HASH);
      if (!admin || !ok) throw unauthorized('Incorrect email or password');
      return { admin: { id: admin.id, name: admin.name, email: admin.email }, token: issueToken(admin) };
    },

    /** The .env file is the source of truth: changing ADMIN_PASSWORD changes the login. */
    async ensureAdmin(email, password) {
      const row = await store.findAdminByEmail(email);
      if (!row) {
        try { await store.createAdmin({ id: uid(), name: 'Admin', email, passwordHash: hashPassword(password) }); }
        catch (err) { if (!(err instanceof DuplicateKeyError)) throw err; } // another server instance created it first
      }
      else if (!verifyPassword(password, row.passwordHash)) await store.setAdminPassword(row.id, hashPassword(password));
    },
  };
}

module.exports = { createAdminAuthService, readToken };
