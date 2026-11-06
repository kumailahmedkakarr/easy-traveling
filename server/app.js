'use strict';

const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const { createStore } = require('./db');
const { seedDemoBookings } = require('./services/seed');
const { createAdminAuthService } = require('./services/admin-auth.service');
const { createBookingService } = require('./services/booking.service');
const { createAdminService } = require('./services/admin.service');
const { createAuthMiddleware } = require('./middleware/auth');
const { applySecurityHeaders, handleCors } = require('./middleware/security');
const { readJsonBody } = require('./middleware/body');
const { buildApiRouter } = require('./routes');
const { serveStatic } = require('./static');
const { HttpError } = require('./utils/errors');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(payload));
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

/** Builds the HTTP server. Tests pass their own `store`. */
async function createApp({ store = createStore() } = {}) {
  await store.init(); // memory mode: loads the file. MySQL mode: connects and creates database + tables if missing

  const adminAuth = createAdminAuthService(store);
  await adminAuth.ensureAdmin(config.adminEmail, config.adminPassword);
  if (config.seedDemo) await seedDemoBookings(store);

  const bookingService = createBookingService(store);
  const adminService = createAdminService(store);
  const auth = createAuthMiddleware(adminAuth);
  const router = buildApiRouter({ adminAuth, bookingService, adminService, store, auth });

  const handler = async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    applySecurityHeaders(res);
    res.on('finish', () => logger.debug(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`));

    try {
      if (handleCors(req, res)) return;

      if (!url.pathname.startsWith('/api/')) {
        if (serveStatic(req, res, url.pathname)) return;
        return sendJson(res, 404, { error: 'Not found' });
      }

      const { handlers, params, pathExists } = router.match(req.method, url.pathname);
      if (!handlers) {
        return sendJson(res, pathExists ? 405 : 404, { error: pathExists ? 'Method not allowed' : 'Endpoint not found' });
      }

      const ctx = { req, res, params, query: Object.fromEntries(url.searchParams), body: await readJsonBody(req), admin: null };
      let result;
      for (const handler of handlers) {
        result = await handler(ctx);
        if (result !== undefined) break;
      }
      if (result === undefined) { res.statusCode = 204; return res.end(); }
      if (result && result.status && result.body !== undefined) return sendJson(res, result.status, result.body);
      return sendJson(res, 200, result);
    } catch (err) {
      if (err instanceof HttpError) {
        return sendJson(res, err.status, { error: err.message, ...(err.details ? { details: err.details } : {}) });
      }
      logger.error(err);
      return sendJson(res, 500, { error: 'Something went wrong on our side' });
    }
  };

  const server = http.createServer(handler);
  return { server, store, handler };
}

module.exports = { createApp };
