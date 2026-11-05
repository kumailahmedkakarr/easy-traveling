'use strict';

const config = require('../config');

/** Sample bookings so the admin panel is not empty while testing (only when the store is empty). */
async function seedDemoBookings(store) {
  if (await store.countBookings() > 0) return;

  const sample = (id, op, opId, from, to, date, time, classLabel, seats, total, name, phone, city, created) => ({
    id, type: 'bus', status: 'Confirmed', operatorId: opId, operatorName: op, from, to, via: 'Khuzdar', date, time, classLabel,
    currentCity: city, pickup: null, seats, paymentMethod: 'easypaisa',
    passengers: [{ name, cnic: '12345-6789012-3', phone }, ...seats.slice(1).map(() => ({ name: `${name} (guest)`, cnic: '12345-6789012-4', phone }))],
    amount: { base: total - config.serviceFee, serviceFee: config.serviceFee, total }, createdAt: created, cancelledAt: null,
  });
  const rows = [
    ['ET-800001', 'Al Munir', 'bus-1', 'Quetta', 'Karachi', '2026-09-25', '07:30 AM', 'Sleeper', ['A5', 'A6'], 10500, 'Jawad Khan', '0300-1234567', 'Quetta', '2026-09-20T08:00:00.000Z'],
    ['ET-800002', 'Shandar Daiwoo', 'bus-4', 'Karachi', 'Quetta', '2026-09-28', '04:30 PM', 'Business Class · 2/2 Seat', ['B3', 'B4'], 4500, 'Ali Raza', '0333-7654321', 'Karachi', '2026-09-21T08:00:00.000Z'],
  ].map((r) => sample(...r));

  for (const b of rows) {
    await store.createBooking({ booking: b, slotKey: `bus|${b.operatorId}|${b.date}|${b.time}` });
  }
}

module.exports = { seedDemoBookings };
