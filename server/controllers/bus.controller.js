'use strict';

const config = require('../config');
const catalog = require('../data/catalog');
const { notFound } = require('../utils/errors');

module.exports = (bookingService) => ({
  meta: () => ({
    serviceFee: config.serviceFee,
    cities: Object.entries(catalog.CITY_COORDS).map(([name, c]) => ({ name, ...c })),
    carCities: catalog.CAR_CITIES,
    paymentMethods: catalog.PAYMENT_METHODS,
    routes: catalog.routeCards(),
    support: config.support,
  }),

  list(ctx) {
    const { from, to } = ctx.query;
    const buses = catalog.buses.filter((b) => (!from || b.from === from) && (!to || b.to === to));
    return { buses, serviceFee: config.serviceFee, cities: [...new Set(catalog.buses.flatMap((b) => [b.from, b.to]))] };
  },

  get(ctx) {
    const bus = catalog.buses.find((b) => b.id === ctx.params.id);
    if (!bus) throw notFound('Bus not found');
    return { bus };
  },

  seats: (ctx) => bookingService.busSeatMap(ctx.params.id, ctx.query.date, ctx.query.time),

  book: async (ctx) => ({ status: 201, body: { booking: await bookingService.createBusBooking(ctx.body) } }),
});
