'use strict';

// The same tests run against BOTH stores: the no-database memory store, and the SQL store (on in-memory SQLite,
// Node 22+). So the MySQL code path is checked too, without needing a MySQL server.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/app');
const { createMemoryStore } = require('../server/db/memory-store');
const { createSqlStore } = require('../server/db/sql-store');
const { createSqlite } = require('../server/db/sqlite');
const config = require('../server/config');
const { todayPk } = require('../server/utils/dates');

const drivers = [['memory store (no database)', () => createMemoryStore()]];
try { require('node:sqlite'); drivers.push(['SQL store (SQLite, same code as MySQL)', () => createSqlStore(createSqlite())]); } catch { /* Node < 22: SQL store tests skipped */ }

for (const [driverName, make] of drivers) {
  describe(driverName, () => {
  let server; let base;

  before(async () => {
    ({ server } = await createApp({ store: make() }));
    await new Promise((r) => server.listen(0, r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((r) => server.close(r)));

  async function api(method, url, { body, token } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  }

  const adminToken = async () => (await api('POST', '/api/admin/login', { body: { email: config.adminEmail, password: config.adminPassword } })).data.token;
  const person = (n = 1) => ({ name: `Guest ${n}`, cnic: '12345-6789012-3', phone: '0300-1234567' });
  const busBody = (seats, extra = {}) => ({
    busId: 'bus-3', classIndex: 1, time: '07:30 AM', date: todayPk(), seats,
    passengers: seats.map((_, i) => person(i + 1)), currentCity: 'Quetta',
    pickup: { lat: 30.18, lng: 66.97 }, paymentMethod: 'easypaisa', ...extra,
  });

  test('health and meta (cities with map coordinates)', async () => {
    assert.equal((await api('GET', '/api/health')).data.status, 'ok');
    const meta = await api('GET', '/api/meta');
    assert.ok(meta.data.cities.find((c) => c.name === 'Quetta' && typeof c.lat === 'number'));
  });

  test('no customer accounts: register/login endpoints do not exist', async () => {
    assert.equal((await api('POST', '/api/auth/register', { body: {} })).status, 404);
    assert.equal((await api('POST', '/api/auth/login', { body: {} })).status, 404);
  });

  test('guest can book bus seats without logging in; price is calculated on the server', async () => {
    const r = await api('POST', '/api/bus-bookings', { body: busBody(['E1', 'E2']) });
    assert.equal(r.status, 201);
    assert.equal(r.data.booking.amount.total, 2 * 3000 + 500);
    assert.match(r.data.booking.id, /^ET-\d{6}$/);
    assert.equal(r.data.booking.currentCity, 'Quetta');
    assert.deepEqual(r.data.booking.pickup, { lat: 30.18, lng: 66.97 });
    assert.equal(r.data.booking.passengers[1].phone, '0300-1234567', 'extra passengers use the booking contact');
  });

  test('a seat cannot be booked twice; other departure time is free', async () => {
    const seatMap = await api('GET', `/api/buses/bus-3/seats?date=${todayPk()}&time=07:30%20AM`);
    assert.ok(seatMap.data.booked.includes('E1') && seatMap.data.booked.includes('A1'));
    const again = await api('POST', '/api/bus-bookings', { body: busBody(['E2', 'E3']) });
    assert.equal(again.status, 409);
    assert.deepEqual(again.data.details.unavailable, ['E2']);
    assert.equal((await api('POST', '/api/bus-bookings', { body: busBody(['E2'], { time: '04:30 PM' }) })).status, 201);
  });

  test('parallel requests cannot take the same seat', async () => {
    const results = await Promise.all([1, 2, 3, 4].map(() => api('POST', '/api/bus-bookings', { body: busBody(['F4']) })));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409]);
  });

  test('validation: CNIC, contact, current city, past date', async () => {
    const r = await api('POST', '/api/bus-bookings', {
      body: busBody(['B1'], { passengers: [{ name: 'A', cnic: '123', phone: 'x' }], currentCity: '', date: '2020-01-01' }),
    });
    assert.equal(r.status, 400);
    for (const key of ['date', 'currentCity', 'passengers[0].cnic', 'passengers[0].phone', 'passengers[0].name']) assert.ok(r.data.details[key], key);
  });

  test('2D car: availability, booking, conflict, same-city rejected', async () => {
    const q = `operatorId=az-movers&from=Quetta&to=Karachi&date=${todayPk()}`;
    assert.deepEqual((await api('GET', `/api/cars/seats?${q}`)).data.booked, []);
    const body = {
      operatorId: 'az-movers', from: 'Quetta', to: 'Karachi', date: todayPk(), seats: [1, 3],
      passengers: [person(1), person(2)], currentCity: 'Quetta', pickup: null, paymentMethod: 'cash',
    };
    const ok = await api('POST', '/api/car-bookings', { body });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.booking.amount.total, 4000);
    assert.deepEqual((await api('GET', `/api/cars/seats?${q}`)).data.booked, [1, 3]);
    assert.equal((await api('POST', '/api/car-bookings', { body: { ...body, seats: [3], passengers: [person()] } })).status, 409);
    assert.equal((await api('POST', '/api/car-bookings', { body: { ...body, to: 'Quetta', seats: [2], passengers: [person()] } })).status, 400);
  });

  test('guest finds booking with number + phone, wrong phone gets nothing, cancel frees the seat', async () => {
    const made = await api('POST', '/api/bus-bookings', { body: busBody(['D4']) });
    const id = made.data.booking.id;
    assert.equal((await api('GET', `/api/bookings/track?id=${id}&phone=0300-1234567`)).data.booking.id, id);
    assert.equal((await api('GET', `/api/bookings/track?id=${id}&phone=%2B923001234567`)).status, 200, '+92 format also matches');
    assert.equal((await api('GET', `/api/bookings/track?id=${id}&phone=0311-0000000`)).status, 404);

    assert.equal((await api('PATCH', `/api/bookings/${id}/cancel`, { body: { phone: '0311-0000000' } })).status, 403);
    const cancel = await api('PATCH', `/api/bookings/${id}/cancel`, { body: { phone: '0300-1234567' } });
    assert.equal(cancel.data.booking.status, 'Cancelled');
    assert.ok(!(await api('GET', `/api/buses/bus-3/seats?date=${todayPk()}&time=07:30%20AM`)).data.booked.includes('D4'));
    assert.equal((await api('PATCH', `/api/bookings/${id}/cancel`, { body: { phone: '0300-1234567' } })).status, 400);
  });

  test('admin: login needed, wrong password rejected, full booking details visible', async () => {
    assert.equal((await api('GET', '/api/admin/bookings')).status, 401);
    assert.equal((await api('POST', '/api/admin/login', { body: { email: config.adminEmail, password: 'wrong' } })).status, 401);

    const token = await adminToken();
    const stats = await api('GET', '/api/admin/stats', { token });
    assert.equal(stats.status, 200);
    assert.ok(stats.data.stats.totalRevenue > 0 && stats.data.stats.totalBookings >= 2);

    const list = (await api('GET', '/api/admin/bookings', { token })).data.bookings;
    const mine = list.find((b) => b.seats.includes('E1'));
    assert.equal(mine.passengers[0].cnic, '12345-6789012-3');
    assert.equal(mine.currentCity, 'Quetta');
    assert.ok(mine.pickup);

    const cancelled = await api('PATCH', `/api/admin/bookings/${mine.id}/cancel`, { token });
    assert.equal(cancelled.data.booking.status, 'Cancelled');
  });

  test('tampered admin token is rejected', async () => {
    const token = await adminToken();
    const sig = token.split('.')[1];
    const forged = Buffer.from(JSON.stringify({ sub: 'x', role: 'admin', exp: Date.now() + 1e6 })).toString('base64url');
    assert.equal((await api('GET', '/api/admin/me', { token: `${forged}.${sig}` })).status, 401);
  });

  test('admin panel is only reachable at the secret URL', async () => {
    assert.equal((await fetch(`${base}/${config.adminPath}/`)).status, 200);
    assert.equal((await fetch(`${base}/${config.adminPath}/`)).headers.get('x-robots-tag'), 'noindex, nofollow');
    for (const p of ['/admin/', '/admin', '/admin/index.html', '/index.html/../admin/index.html', '/%2e%2e/admin/index.html']) {
      const res = await fetch(base + p);
      assert.ok(!(res.status === 200 && (await res.text()).includes('Admin sign in')), `${p} must not expose the admin page`);
    }
  });

  test('public pages load, path traversal blocked, unknown API 404', async () => {
    assert.notEqual((await fetch(`${base}/..%2F..%2Fpackage.json`)).status, 200);
    assert.equal((await api('GET', '/api/nothing')).status, 404);
    assert.equal((await api('DELETE', '/api/buses')).status, 405);
  });

  test('contact form saves a message', async () => {
    assert.equal((await api('POST', '/api/contact', { body: { name: 'Ali', email: 'ali@example.com', message: 'Hello there' } })).status, 201);
    assert.equal((await api('POST', '/api/contact', { body: { name: 'A', email: 'bad', message: '' } })).status, 400);
  });

  test('meta: popular routes, support info and all payment methods', async () => {
    const { data } = await api('GET', '/api/meta');
    assert.ok(data.routes.find((r) => r.mode === 'bus' && r.from === 'Quetta' && r.to === 'Karachi' && r.fromPrice === 3000));
    assert.ok(data.routes.find((r) => r.mode === 'car' && r.from === 'Quetta' && r.to === 'Lahore'));
    assert.deepEqual(data.paymentMethods.bus, ['easypaisa', 'jazzcash', 'raast', 'bank']);
    assert.ok(data.paymentMethods.car.includes('cash') && !data.paymentMethods.bus.includes('cash'));
    assert.ok('phone' in data.support && 'whatsapp' in data.support && 'email' in data.support);
  });

  test('JazzCash and Raast are accepted; cash is only for 2D car', async () => {
    assert.equal((await api('POST', '/api/bus-bookings', { body: busBody(['F1'], { paymentMethod: 'jazzcash' }) })).status, 201);
    assert.equal((await api('POST', '/api/bus-bookings', { body: busBody(['F2'], { paymentMethod: 'raast' }) })).status, 201);
    const cash = await api('POST', '/api/bus-bookings', { body: busBody(['F3'], { paymentMethod: 'cash' }) });
    assert.equal(cash.status, 400);
    assert.ok(cash.data.details.paymentMethod);
  });

  test('admin: 7-day chart data and contact messages inbox', async () => {
    const token = await adminToken();
    const { stats } = (await api('GET', '/api/admin/stats', { token })).data;
    assert.equal(stats.daily.length, 7);
    const last = stats.daily[6];
    assert.equal(last.date, new Date().toISOString().slice(0, 10));
    assert.ok(last.bookings > 0 && last.revenue > 0, 'today has bookings made by earlier tests');
    assert.ok(stats.bookingsToday > 0);

    const { messages } = (await api('GET', '/api/admin/messages', { token })).data;
    assert.ok(messages.some((m) => m.email === 'ali@example.com' && m.message === 'Hello there'));
    assert.equal((await api('GET', '/api/admin/messages')).status, 401);
  });

  test('app files: manifest, service worker and icons are served', async () => {
    const manifest = await fetch(`${base}/manifest.webmanifest`);
    assert.equal(manifest.status, 200);
    assert.match(manifest.headers.get('content-type'), /manifest\+json/);
    const m = await manifest.json();
    assert.equal(m.display, 'standalone');
    for (const icon of m.icons) assert.equal((await fetch(base + icon.src)).status, 200, icon.src);
    const sw = await fetch(`${base}/sw.js`);
    assert.equal(sw.status, 200);
    assert.match(sw.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(`${base}/robots.txt`)).status, 200);
  });

  });
}
