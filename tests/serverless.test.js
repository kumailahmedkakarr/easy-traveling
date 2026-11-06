'use strict';

// Checks the Vercel entry file (api/index.js) the way Vercel uses it: one function that receives every request.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

process.env.VERCEL = '1';          // behave like Vercel: no writable disk
process.env.DB_DRIVER = 'memory';
const vercelHandler = require('../api/index.js');

let server; let base;
before(async () => {
  server = http.createServer((req, res) => vercelHandler(req, res));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));

const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
};

test('Vercel function answers the API and reports the database mode', async () => {
  const health = await call('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.database.driver, 'memory');
  assert.equal(health.data.database.persistent, false, 'no file is written on Vercel');
});

test('booking works inside the Vercel function (no disk write)', async () => {
  const date = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const r = await call('POST', '/api/bus-bookings', {
    busId: 'bus-3', classIndex: 1, time: '07:30 AM', date, seats: ['C1'], currentCity: 'Quetta',
    passengers: [{ name: 'Test User', cnic: '12345-6789012-3', phone: '0300-1234567' }], paymentMethod: 'easypaisa',
  });
  assert.equal(r.status, 201);
  assert.match(r.data.booking.id, /^ET-\d{6}$/);
});

test('secret admin page is served by the function from the admin folder', async () => {
  const page = await fetch(`${base}/secret-admin/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Admin sign in/);
  assert.equal((await fetch(`${base}/admin/`)).status, 404);
});
