'use strict';

const catalog = require('../data/catalog');

module.exports = (bookingService) => ({
  operators: () => ({ operators: catalog.carOperators, cities: catalog.CAR_CITIES }),
  seats: (ctx) => bookingService.carSeatMap(ctx.query),
  book: async (ctx) => ({ status: 201, body: { booking: await bookingService.createCarBooking(ctx.body) } }),
});
