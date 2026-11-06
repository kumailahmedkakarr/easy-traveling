'use strict';

/**
 * Store that talks to a SQL database (MySQL in production, SQLite in tests).
 * `db` is one of the adapters in db/mysql.js or db/sqlite.js and only needs query / execute / transaction.
 * All SQL of the project is in this one file.
 */
const { DuplicateKeyError } = require('./errors');
const { conflict } = require('../utils/errors');
const { bookingRef } = require('../utils/ids');
const { phoneKey } = require('../utils/phone');

const COLUMNS = `id, booking_type, status, operator_id, operator_name, from_city, to_city, via, travel_date, dep_time,
  class_label, contact_name, contact_cnic, contact_phone, phone_key, current_city, pickup_lat, pickup_lng,
  seats, passengers, payment_method, base_amount, service_fee, total_amount, created_at, cancelled_at`;

/** Database row -> object the website understands. */
function mapBooking(r) {
  if (!r) return null;
  return {
    id: r.id, type: r.booking_type, status: r.status, operatorId: r.operator_id, operatorName: r.operator_name,
    from: r.from_city, to: r.to_city, via: r.via, date: r.travel_date, time: r.dep_time, classLabel: r.class_label,
    currentCity: r.current_city,
    pickup: r.pickup_lat == null ? null : { lat: r.pickup_lat, lng: r.pickup_lng },
    seats: JSON.parse(r.seats), passengers: JSON.parse(r.passengers), paymentMethod: r.payment_method,
    amount: { base: r.base_amount, serviceFee: r.service_fee, total: r.total_amount },
    createdAt: r.created_at, cancelledAt: r.cancelled_at,
  };
}

const num = (v) => Number(v);

function createSqlStore(db) {
  const takenSeats = async (q, slotKey) => (await q.query('SELECT seat FROM booking_seats WHERE slot_key = ?', [slotKey])).map((r) => r.seat);
  const count = async (sql, params = []) => num((await db.query(sql, params))[0].n);

  async function insertBooking(q, b, slotKey) {
    const lead = b.passengers[0];
    await q.execute(
      `INSERT INTO bookings (${COLUMNS}) VALUES (${COLUMNS.split(',').map(() => '?').join(', ')})`,
      [b.id, b.type, b.status, b.operatorId, b.operatorName, b.from, b.to, b.via || null, b.date, b.time || null,
        b.classLabel || null, lead.name, lead.cnic, lead.phone, phoneKey(lead.phone), b.currentCity,
        b.pickup ? b.pickup.lat : null, b.pickup ? b.pickup.lng : null,
        JSON.stringify(b.seats), JSON.stringify(b.passengers), b.paymentMethod || null,
        b.amount.base, b.amount.serviceFee, b.amount.total, b.createdAt, b.cancelledAt || null],
    );
    for (const seat of b.seats) {
      await q.execute('INSERT INTO booking_seats (slot_key, seat, booking_id) VALUES (?, ?, ?)', [slotKey, String(seat), b.id]);
    }
  }

  return {
    init: () => db.init(),
    close: () => db.close(),
    async ping() {
      try { await db.query('SELECT 1 AS ok'); return { driver: 'mysql', connected: true, persistent: true }; } catch { return { driver: 'mysql', connected: false, persistent: true }; }
    },

    // ---------- admins ----------
    async findAdminById(id) {
      const r = (await db.query('SELECT * FROM admins WHERE id = ?', [id]))[0];
      return r && { id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash };
    },
    async findAdminByEmail(email) {
      const r = (await db.query('SELECT * FROM admins WHERE LOWER(email) = ?', [email.toLowerCase()]))[0];
      return r && { id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash };
    },
    createAdmin: (a) => db.execute('INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [a.id, a.name, a.email, a.passwordHash]),
    setAdminPassword: (id, hash) => db.execute('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, id]),

    // ---------- bookings ----------
    takenSeats: (slotKey) => takenSeats(db, slotKey),

    /** One transaction: check the seats, save the booking, lock the seats. The database primary key is the final guard. */
    async createBooking({ booking, slotKey, baseline = [] }) {
      try {
        return await db.transaction(async (tx) => {
          const taken = new Set([...baseline.map(String), ...(await takenSeats(tx, slotKey))]);
          const clash = booking.seats.filter((s) => taken.has(String(s)));
          if (clash.length) throw conflict('Some seats were just booked by someone else', { unavailable: clash });

          let id = booking.id;
          if (!id) do { id = bookingRef(); } while ((await tx.query('SELECT id FROM bookings WHERE id = ?', [id])).length);
          const saved = { ...booking, id };
          await insertBooking(tx, saved, slotKey);
          return saved;
        });
      } catch (err) {
        if (err instanceof DuplicateKeyError) throw conflict('Some seats were just booked by someone else', { unavailable: booking.seats });
        throw err;
      }
    },

    async getBooking(id) { return mapBooking((await db.query('SELECT * FROM bookings WHERE id = ?', [id]))[0]); },

    async cancelBooking(id, whenIso) {
      return db.transaction(async (tx) => {
        const changed = await tx.execute('UPDATE bookings SET status = ?, cancelled_at = ? WHERE id = ? AND status = ?', ['Cancelled', whenIso, id, 'Confirmed']);
        if (!changed.affectedRows) return null;
        await tx.execute('DELETE FROM booking_seats WHERE booking_id = ?', [id]);
        return mapBooking((await tx.query('SELECT * FROM bookings WHERE id = ?', [id]))[0]);
      });
    },

    async listBookings(limit = 200) {
      return (await db.query(`SELECT * FROM bookings ORDER BY created_at DESC LIMIT ${Number(limit) || 200}`)).map(mapBooking);
    },

    countBookings: () => count('SELECT COUNT(*) AS n FROM bookings'),

    async stats({ todayUtc, todayPk, days }) {
      const revenue = (await db.query("SELECT COALESCE(SUM(total_amount), 0) AS n FROM bookings WHERE status = 'Confirmed'"))[0].n;
      const rows = await db.query(
        "SELECT SUBSTR(created_at, 1, 10) AS d, COUNT(*) AS n, COALESCE(SUM(total_amount), 0) AS revenue FROM bookings WHERE status = 'Confirmed' AND SUBSTR(created_at, 1, 10) >= ? GROUP BY d",
        [days[0]],
      );
      const byDay = new Map(rows.map((r) => [r.d, r]));
      return {
        totalRevenue: num(revenue),
        bookingsToday: await count('SELECT COUNT(*) AS n FROM bookings WHERE SUBSTR(created_at, 1, 10) = ?', [todayUtc]),
        completedTrips: await count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'Confirmed' AND travel_date < ?", [todayPk]),
        cancelledBookings: await count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'Cancelled'"),
        totalBookings: await count('SELECT COUNT(*) AS n FROM bookings'),
        daily: days.map((d) => ({ date: d, bookings: byDay.has(d) ? num(byDay.get(d).n) : 0, revenue: byDay.has(d) ? num(byDay.get(d).revenue) : 0 })),
      };
    },

    // ---------- messages ----------
    addMessage: (m) => db.execute('INSERT INTO messages (id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)', [m.id, m.name, m.email, m.message, m.createdAt]),
    async listMessages() {
      return (await db.query('SELECT id, name, email, message, created_at FROM messages ORDER BY created_at DESC LIMIT 200'))
        .map((r) => ({ id: r.id, name: r.name, email: r.email, message: r.message, createdAt: r.created_at }));
    },
  };
}

module.exports = { createSqlStore };
