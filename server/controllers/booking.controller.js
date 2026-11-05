'use strict';

/** Guests find and cancel their booking with the booking number + phone (no account). */
module.exports = (bookingService) => ({
  track: async (ctx) => ({ booking: await bookingService.track(ctx.query.id, ctx.query.phone) }),
  cancel: async (ctx) => ({ booking: await bookingService.cancel(ctx.params.id, ctx.body.phone) }),
});
