'use strict';

const config = require('../config');
const catalog = require('../data/catalog');
const { Validator } = require('../utils/validators');
const { phoneKey } = require('../utils/phone');
const { isPast } = require('../utils/dates');
const { badRequest, notFound, forbidden } = require('../utils/errors');

const PAYMENT = require('../data/catalog').PAYMENT_METHODS;
const MAX_BUS_SEATS = 6;

const slotBus = (busId, date, time) => `bus|${busId}|${date}|${time}`;
const slotCar = (operatorId, from, to, date) => `car|${operatorId}|${from}|${to}|${date}`;

function createBookingService(store) {
  const findBus = (id) => catalog.buses.find((b) => b.id === id) || null;
  const findOperator = (id) => catalog.carOperators.find((o) => o.id === id) || null;

  /**
   * Checks the person's details (same form for buses and cars):
   * passengers[0] is the person booking (name, CNIC, contact); the others need name + CNIC.
   */
  function readPassengerForm(v, body, seatCount) {
    const list = Array.isArray(body.passengers) ? body.passengers : [];
    if (list.length !== seatCount) v.fail('passengers', 'Provide one passenger per seat');
    const passengers = list.map((p, i) => ({
      name: v.string(p && p.name, `passengers[${i}].name`, { min: 2, max: 80 }),
      cnic: v.pattern(p && p.cnic, `passengers[${i}].cnic`, 'cnic', 'Enter a valid CNIC (12345-6789012-3)'),
      phone: i === 0
        ? v.pattern(p && p.phone, 'passengers[0].phone', 'phone', 'Enter a valid mobile number (0300-1234567)')
        : String((p && p.phone) || '').trim(),
    }));
    if (passengers[0]) passengers.forEach((p, i) => { if (i > 0 && !p.phone) p.phone = passengers[0].phone; });
    const currentCity = v.string(body.currentCity, 'currentCity', { min: 2, max: 60 });

    let pickup = null;
    if (body.pickup != null) {
      const { lat, lng } = body.pickup;
      if (typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        pickup = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
      } else v.fail('pickup', 'Pickup location is not valid');
    }
    return { passengers, currentCity, pickup };
  }

  /** The store checks the seats and saves the booking in one step, so two people can never get the same seat. */
  const saveBooking = (build, slotKey) => store.createBooking({ booking: build.booking, slotKey, baseline: build.baseline });

  return {
    // ---------- BUS ----------
    async busSeatMap(busId, date, time) {
      const bus = findBus(busId);
      if (!bus) throw notFound('Bus not found');
      const v = new Validator();
      v.date(date, 'date');
      v.oneOf(time, 'time', bus.times);
      v.done();
      const booked = new Set(catalog.BUS_BASELINE_BOOKED);
      (await store.takenSeats(slotBus(busId, date, time))).forEach((s) => booked.add(s));
      return { busId, date, time, seats: catalog.busSeatIds(), booked: [...booked].sort() };
    },

    async createBusBooking(body) {
      const v = new Validator();
      const bus = findBus(body.busId);
      if (!bus) v.fail('busId', 'Unknown bus');
      const classIndex = Number.isInteger(body.classIndex) ? body.classIndex : -1;
      if (bus && !bus.classes[classIndex]) v.fail('classIndex', 'Unknown seat class');
      const time = bus ? v.oneOf(body.time, 'time', bus.times) : '';
      const date = v.date(body.date, 'date');
      if (date && isPast(date)) v.fail('date', 'Travel date cannot be in the past');
      const seats = v.stringArray(body.seats, 'seats', { min: 1, max: MAX_BUS_SEATS });
      const valid = new Set(catalog.busSeatIds());
      if (seats.some((s) => !valid.has(s))) v.fail('seats', 'One or more seats do not exist');
      v.oneOf(body.paymentMethod, 'paymentMethod', PAYMENT.bus);
      const { passengers, currentCity, pickup } = readPassengerForm(v, body, seats.length);
      v.done();

      const base = bus.classes[classIndex].price * seats.length;
      return saveBooking({
        baseline: catalog.BUS_BASELINE_BOOKED,
        booking: {
          type: 'bus', status: 'Confirmed', operatorId: bus.id, operatorName: bus.operator,
          from: bus.from, to: bus.to, via: bus.via, date, time,
          classLabel: bus.type + (bus.classes.length > 1 ? ` · ${bus.classes[classIndex].label}` : ''),
          currentCity, pickup, seats: [...seats].sort(), passengers, paymentMethod: body.paymentMethod,
          amount: { base, serviceFee: config.serviceFee, total: base + config.serviceFee },
          createdAt: new Date().toISOString(), cancelledAt: null,
        },
      }, slotBus(bus.id, date, time));
    },

    // ---------- 2D CAR ----------
    async carSeatMap(query) {
      const v = new Validator();
      const operator = findOperator(query.operatorId);
      if (!operator) v.fail('operatorId', 'Unknown operator');
      const from = v.oneOf(query.from, 'from', catalog.CAR_CITIES);
      const to = v.oneOf(query.to, 'to', catalog.CAR_CITIES);
      const date = v.date(query.date, 'date');
      v.done();
      const booked = (await store.takenSeats(slotCar(operator.id, from, to, date))).map(Number).sort((a, b) => a - b);
      return { operatorId: operator.id, from, to, date, totalSeats: operator.seats, booked };
    },

    async createCarBooking(body) {
      const v = new Validator();
      const operator = findOperator(body.operatorId);
      if (!operator) v.fail('operatorId', 'Unknown operator');
      const from = v.oneOf(body.from, 'from', catalog.CAR_CITIES);
      const to = v.oneOf(body.to, 'to', catalog.CAR_CITIES);
      if (from && from === to) v.fail('to', 'Pick a different destination city');
      const date = v.date(body.date, 'date');
      if (date && isPast(date)) v.fail('date', 'Travel date cannot be in the past');
      const seats = Array.isArray(body.seats) ? body.seats : [];
      const max = operator ? operator.seats : catalog.CAR_SEAT_COUNT;
      if (!seats.length || seats.length > max || new Set(seats).size !== seats.length
        || seats.some((s) => !Number.isInteger(s) || s < 1 || s > max)) v.fail('seats', `Choose 1-${max} valid seats`);
      v.oneOf(body.paymentMethod, 'paymentMethod', PAYMENT.car);
      const { passengers, currentCity, pickup } = readPassengerForm(v, body, seats.length);
      v.done();

      const total = operator.pricePerSeat * seats.length;
      return saveBooking({
        baseline: [],
        booking: {
          type: 'car', status: 'Confirmed', operatorId: operator.id, operatorName: operator.name,
          from, to, via: null, date, time: null, classLabel: operator.carType,
          currentCity, pickup, seats: [...seats].sort((a, b) => a - b), passengers, paymentMethod: body.paymentMethod,
          amount: { base: total, serviceFee: 0, total },
          createdAt: new Date().toISOString(), cancelledAt: null,
        },
      }, slotCar(operator.id, from, to, date));
    },

    // ---------- find / cancel (guest: booking number + phone) ----------
    async track(id, phone) {
      const booking = await store.getBooking(String(id || '').trim().toUpperCase());
      // Same answer for "no such booking" and "wrong phone", so numbers cannot be guessed.
      if (!booking || phoneKey(booking.passengers[0].phone) !== phoneKey(phone)) throw notFound('No booking found with this number and phone');
      return booking;
    },

    async cancel(id, phone, { asAdmin = false } = {}) {
      const booking = await store.getBooking(String(id || '').trim().toUpperCase());
      if (!booking) throw notFound('Booking not found');
      if (!asAdmin && phoneKey(booking.passengers[0].phone) !== phoneKey(phone)) throw forbidden('Phone number does not match this booking');
      if (booking.status !== 'Confirmed') throw badRequest('Booking is already cancelled');
      const cancelled = await store.cancelBooking(booking.id, new Date().toISOString());
      if (!cancelled) throw badRequest('Booking is already cancelled');
      return cancelled;
    },
  };
}

module.exports = { createBookingService };
