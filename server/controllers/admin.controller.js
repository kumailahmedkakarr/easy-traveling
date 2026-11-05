'use strict';

module.exports = (adminService, bookingService) => ({
  stats: async () => ({ stats: await adminService.stats() }),
  bookings: async () => ({ bookings: await adminService.bookings() }),
  messages: async () => ({ messages: await adminService.messages() }),
  routes: () => ({ routes: adminService.routes() }),
  cancel: async (ctx) => ({ booking: await bookingService.cancel(ctx.params.id, null, { asAdmin: true }) }),
});
