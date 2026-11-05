'use strict';

const { readToken } = require('../services/admin-auth.service');
const { unauthorized } = require('../utils/errors');

/** Only the admin panel needs login. Customers book without an account. */
function createAuthMiddleware(adminAuth) {
  const requireAdmin = async (ctx) => {
    const header = ctx.req.headers.authorization || '';
    const payload = header.startsWith('Bearer ') ? readToken(header.slice(7)) : null;
    const admin = payload && payload.role === 'admin' ? await adminAuth.findById(payload.sub) : null;
    if (!admin) throw unauthorized();
    ctx.admin = admin;
  };
  return { requireAdmin };
}

module.exports = { createAuthMiddleware };
