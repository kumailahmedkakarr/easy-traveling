'use strict';

/**
 * "No database" mode (for testing). Everything is kept in memory and saved to a small JSON file,
 * so bookings survive a restart. It follows the same rules as the MySQL store:
 * same methods, same seat locking, same results. Switch to MySQL later with DB_DRIVER=mysql.
 */
const fs = require('fs');
const path = require('path');
const { conflict } = require('../utils/errors');
const { bookingRef } = require('../utils/ids');

const clone = (v) => (v == null ? v : structuredClone(v));

function createMemoryStore({ file = null } = {}) {
  let data = { admins: [], bookings: [], slots: {}, messages: [] }; // slots: slotKey -> { seat: bookingId }

  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
    fs.renameSync(`${file}.tmp`, file);
  };

  return {
    async init() {
      if (file && fs.existsSync(file)) { try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* corrupt file: start fresh */ } }
    },
    async close() {},

    // ---------- admins ----------
    async findAdminById(id) { return clone(data.admins.find((a) => a.id === id)) || null; },
    async findAdminByEmail(email) { return clone(data.admins.find((a) => a.email.toLowerCase() === email.toLowerCase())) || null; },
    async createAdmin(admin) { data.admins.push(clone(admin)); save(); },
    async setAdminPassword(id, passwordHash) { data.admins.find((a) => a.id === id).passwordHash = passwordHash; save(); },

    // ---------- bookings ----------
    async takenSeats(slotKey) { return Object.keys(data.slots[slotKey] || {}); },

    /** Checks the seats and saves the booking in one step (JavaScript runs one request at a time, so no clash is possible). */
    async createBooking({ booking, slotKey, baseline = [] }) {
      const slot = data.slots[slotKey] || {};
      const taken = new Set([...baseline.map(String), ...Object.keys(slot)]);
      const clash = booking.seats.filter((s) => taken.has(String(s)));
      if (clash.length) throw conflict('Some seats were just booked by someone else', { unavailable: clash });

      let id = booking.id;
      if (!id) do { id = bookingRef(); } while (data.bookings.some((b) => b.id === id));
      const saved = { ...clone(booking), id, slotKey };
      data.bookings.push(saved);
      data.slots[slotKey] = { ...slot, ...Object.fromEntries(booking.seats.map((s) => [String(s), id])) };
      save();
      const { slotKey: _omit, ...out } = clone(saved);
      return out;
    },

    async getBooking(id) {
      const b = data.bookings.find((x) => x.id === id);
      if (!b) return null;
      const { slotKey: _omit, ...out } = clone(b);
      return out;
    },

    /** Returns the cancelled booking, or null if it does not exist / was already cancelled. */
    async cancelBooking(id, whenIso) {
      const b = data.bookings.find((x) => x.id === id);
      if (!b || b.status !== 'Confirmed') return null;
      b.status = 'Cancelled';
      b.cancelledAt = whenIso;
      const slot = data.slots[b.slotKey] || {};
      Object.keys(slot).forEach((seat) => { if (slot[seat] === id) delete slot[seat]; });
      save();
      const { slotKey: _omit, ...out } = clone(b);
      return out;
    },

    async listBookings(limit = 200) {
      return [...data.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
        .map(({ slotKey: _omit, ...rest }) => clone(rest));
    },

    async countBookings() { return data.bookings.length; },

    async stats({ todayUtc, todayPk, days }) {
      const active = data.bookings.filter((b) => b.status === 'Confirmed');
      return {
        totalRevenue: active.reduce((sum, b) => sum + b.amount.total, 0),
        bookingsToday: data.bookings.filter((b) => b.createdAt.slice(0, 10) === todayUtc).length,
        completedTrips: active.filter((b) => b.date < todayPk).length,
        cancelledBookings: data.bookings.length - active.length,
        totalBookings: data.bookings.length,
        daily: days.map((d) => {
          const day = active.filter((b) => b.createdAt.slice(0, 10) === d);
          return { date: d, bookings: day.length, revenue: day.reduce((sum, b) => sum + b.amount.total, 0) };
        }),
      };
    },

    // ---------- messages ----------
    async addMessage(message) { data.messages.push(clone(message)); save(); },
    async listMessages() { return clone([...data.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200)); },
  };
}

module.exports = { createMemoryStore };
