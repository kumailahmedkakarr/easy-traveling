'use strict';

const Router = require('../router');
const { rateLimit } = require('../middleware/rateLimit');
const config = require('../config');

/** Wires URLs -> middleware -> controllers. One place to see the whole API. */
function buildApiRouter({ adminAuth, bookingService, adminService, store, auth }) {
  const busCtl = require('../controllers/bus.controller')(bookingService);
  const carCtl = require('../controllers/car.controller')(bookingService);
  const bookingCtl = require('../controllers/booking.controller')(bookingService);
  const adminCtl = require('../controllers/admin.controller')(adminService, bookingService);
  const adminAuthCtl = require('../controllers/admin-auth.controller')(adminAuth);
  const contactCtl = require('../controllers/contact.controller')(store);

  const { requireAdmin } = auth;
  const strict = rateLimit({ windowMs: 60_000, max: 20 });        // lookups, cancel, contact form
  const loginLimit = rateLimit({ windowMs: 60_000, max: 6 });     // admin login (brute-force guard)
  const general = rateLimit(config.rateLimit);

  const api = new Router();

  // Open /api/health in the browser to see if the database is connected.
  api.get('/health', async () => {
    const database = await store.ping();
    return { status: database.connected ? 'ok' : 'database-error', uptime: Math.round(process.uptime()), database };
  });
  api.get('/meta', busCtl.meta);

  // Bus booking (no account needed)
  api.get('/buses', busCtl.list);
  api.get('/buses/:id', busCtl.get);
  api.get('/buses/:id/seats', busCtl.seats);
  api.post('/bus-bookings', busCtl.book);

  // 2D car booking (no account needed)
  api.get('/cars/operators', carCtl.operators);
  api.get('/cars/seats', carCtl.seats);
  api.post('/car-bookings', carCtl.book);

  // Find / cancel my booking with booking number + phone
  api.get('/bookings/track', strict, bookingCtl.track);
  api.patch('/bookings/:id/cancel', strict, bookingCtl.cancel);

  api.post('/contact', strict, contactCtl.send);

  // Admin panel API (admin login required)
  api.post('/admin/login', loginLimit, adminAuthCtl.login);
  api.get('/admin/me', requireAdmin, adminAuthCtl.me);
  api.get('/admin/stats', requireAdmin, adminCtl.stats);
  api.get('/admin/bookings', requireAdmin, adminCtl.bookings);
  api.get('/admin/routes', requireAdmin, adminCtl.routes);
  api.get('/admin/messages', requireAdmin, adminCtl.messages);
  api.patch('/admin/bookings/:id/cancel', requireAdmin, adminCtl.cancel);

  const root = new Router();
  root.use('/api', api, general);
  return root;
}

module.exports = { buildApiRouter };
