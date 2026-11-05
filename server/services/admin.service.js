'use strict';

const catalog = require('../data/catalog');
const { todayPk } = require('../utils/dates');

/** Last 7 days as YYYY-MM-DD (UTC, today last). Bookings are stored with UTC timestamps. */
const lastDays = (n = 7) => Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 86400000).toISOString().slice(0, 10));

function createAdminService(store) {
  return {
    async stats() {
      const s = await store.stats({ todayUtc: new Date().toISOString().slice(0, 10), todayPk: todayPk(), days: lastDays() });
      return { ...s, fleetSize: catalog.buses.length + catalog.carOperators.length };
    },

    /** Full details for the admin: who booked, CNIC, phone, current city and pickup point. */
    bookings: (limit = 500) => store.listBookings(limit),

    messages: () => store.listMessages(),

    routes() {
      const seen = new Map();
      catalog.buses.forEach((b) => seen.set(`${b.from}-${b.to}`, { from: b.from, to: b.to, via: b.via, kind: 'Bus' }));
      for (const a of catalog.CAR_CITIES) for (const b of catalog.CAR_CITIES) if (a !== b) seen.set(`car-${a}-${b}`, { from: a, to: b, via: '-', kind: '2D Car' });
      return [...seen.values()];
    },
  };
}

module.exports = { createAdminService };
