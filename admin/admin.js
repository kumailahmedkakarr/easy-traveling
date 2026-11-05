// Admin panel (opens only at the secret URL). Talks to /api/admin/*.
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `Rs. ${Number(n).toLocaleString()}`;
const TOKEN = 'et.admin.token';
const TABS = [['Dashboard', 'fa-chart-line'], ['Bookings', 'fa-ticket'], ['Manifest', 'fa-clipboard-list'], ['Messages', 'fa-envelope'], ['Buses', 'fa-bus'], ['Routes', 'fa-route']];
let tab = 'Dashboard';
let bookings = [];
const filters = { q: '', status: '', type: '', from: '', to: '' };
let manifestDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

const getToken = () => { try { return sessionStorage.getItem(TOKEN); } catch { return null; } };
const setToken = (t) => { try { t ? sessionStorage.setItem(TOKEN, t) : sessionStorage.removeItem(TOKEN); } catch { /* storage blocked */ } };

async function call(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/admin/login') { signOut(); throw new Error('Please sign in again'); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function signOut() { setToken(null); $('panel').classList.add('hidden'); $('login').classList.remove('hidden'); }

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('login-error');
  err.classList.add('hidden');
  try {
    const { token } = await call('POST', '/admin/login', { email: $('email').value, password: $('password').value });
    setToken(token);
    $('password').value = '';
    start();
  } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
});
$('logout').addEventListener('click', signOut);

function paintTabs() {
  $('tabs').innerHTML = TABS.map(([t, icon]) => `<button data-tab="${t}" class="px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap ${t === tab ? 'bg-[#0868C8] text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'}"><i class="fa-solid ${icon} mr-1.5"></i>${t}</button>`).join('');
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; load(); } });

// ---------- helpers ----------
const pill = (s) => `<span class="font-bold px-2 py-0.5 rounded ${s === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}">${esc(s)}</span>`;
const mapLink = (p) => (p ? `<a class="text-blue-600 underline" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}">Open map</a>` : '-');
const table = (heads, rows, empty = 'Nothing to show yet.') => `<div class="overflow-x-auto"><table class="w-full text-xs text-left"><thead><tr class="bg-slate-50 text-slate-500 uppercase">${heads.map((h) => `<th class="p-3">${h}</th>`).join('')}</tr></thead><tbody class="divide-y divide-slate-100">${rows.length ? rows.join('') : `<tr><td class="p-4 text-slate-500" colspan="${heads.length}">${empty}</td></tr>`}</tbody></table></div>`;

function bookingRow(b, actions) {
  const lead = b.passengers[0];
  return `<tr class="align-top"><td class="p-3 font-extrabold text-[#0868C8] whitespace-nowrap">${esc(b.id)}<br><span class="text-[10px] font-semibold text-slate-400">${b.type === 'bus' ? 'Bus' : '2D Car'}</span></td>
    <td class="p-3"><b>${esc(lead.name)}</b><br>CNIC ${esc(lead.cnic)}<br>${esc(lead.phone)}</td>
    <td class="p-3 whitespace-nowrap">${esc(b.from)} → ${esc(b.to)}<br><span class="text-slate-500">${esc(b.operatorName)}</span></td>
    <td class="p-3 whitespace-nowrap">${esc(b.date)}${b.time ? `<br>${esc(b.time)}` : ''}</td>
    <td class="p-3">${esc(b.seats.join(', '))}</td>
    <td class="p-3">${esc(b.currentCity)}<br>${mapLink(b.pickup)}</td>
    <td class="p-3 whitespace-nowrap font-bold">${money(b.amount.total)}<br><span class="font-normal text-slate-400">${esc(b.paymentMethod || '')}</span></td>
    <td class="p-3">${pill(b.status)}</td>
    ${actions ? `<td class="p-3">${b.status === 'Confirmed' ? `<button data-cancel="${esc(b.id)}" class="text-rose-600 font-bold hover:underline">Cancel</button>` : ''}</td>` : ''}</tr>`;
}
const BOOKING_HEADS = ['ID', 'Passenger', 'Route', 'Travel', 'Seats', 'Current city / pickup', 'Total', 'Status'];

// ---------- Dashboard ----------
function chart(daily) {
  const max = Math.max(1, ...daily.map((d) => d.bookings));
  return `<div class="flex items-end gap-2 h-40">${daily.map((d) => `<div class="flex-1 flex flex-col items-center justify-end h-full" title="${esc(d.date)}: ${d.bookings} bookings, ${money(d.revenue)}">
      <span class="text-[10px] font-bold text-slate-500 mb-1">${d.bookings}</span>
      <div class="bar w-full" style="height:${Math.max(4, (d.bookings / max) * 100)}%"></div>
      <span class="text-[10px] text-slate-400 mt-1">${esc(d.date.slice(5))}</span></div>`).join('')}</div>`;
}

async function dashboard() {
  const [{ stats }, list] = await Promise.all([call('GET', '/admin/stats'), call('GET', '/admin/bookings')]);
  bookings = list.bookings;
  const cards = [['Revenue', money(stats.totalRevenue), 'fa-coins', 'text-amber-500'], ['Bookings', stats.totalBookings, 'fa-ticket', 'text-blue-600'], ['Booked today', stats.bookingsToday, 'fa-calendar-day', 'text-emerald-600'], ['Completed trips', stats.completedTrips, 'fa-circle-check', 'text-emerald-600'], ['Cancellations', stats.cancelledBookings, 'fa-ban', 'text-rose-500'], ['Fleet', stats.fleetSize, 'fa-bus', 'text-slate-500']];
  const week = stats.daily.reduce((s, d) => s + d.revenue, 0);
  $('view').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">${cards.map(([t, v, i, c]) => `<div class="card p-3"><i class="fa-solid ${i} ${c}"></i><div class="text-[11px] font-semibold text-slate-500 mt-1">${t}</div><div class="text-xl font-black">${v}</div></div>`).join('')}</div>
    <div class="grid lg:grid-cols-[1fr_1.6fr] gap-4">
      <div class="card p-4"><div class="flex justify-between items-start mb-3"><div><h2 class="font-extrabold">Last 7 days</h2><p class="text-xs text-slate-500">Bookings made per day</p></div><div class="text-right"><span class="text-[11px] text-slate-500 block">Revenue</span><b>${money(week)}</b></div></div>${chart(stats.daily)}</div>
      <div class="card p-4"><h2 class="font-extrabold mb-3">Recent bookings</h2>${table(BOOKING_HEADS, bookings.slice(0, 6).map((b) => bookingRow(b, false)), 'No bookings yet.')}</div>
    </div>`;
}

// ---------- Bookings ----------
function filtered() {
  const q = filters.q.trim().toLowerCase();
  return bookings.filter((b) => (!q || [b.id, b.currentCity, b.operatorName, ...b.passengers.flatMap((p) => [p.name, p.phone, p.cnic])].join(' ').toLowerCase().includes(q))
    && (!filters.status || b.status === filters.status) && (!filters.type || b.type === filters.type)
    && (!filters.from || b.date >= filters.from) && (!filters.to || b.date <= filters.to));
}

function paintBookingRows() {
  const list = filtered();
  $('b-count').textContent = `${list.length} of ${bookings.length}`;
  $('b-table').innerHTML = table([...BOOKING_HEADS, ''], list.map((b) => bookingRow(b, true)), 'No bookings match these filters.');
}

async function bookingsTab() {
  bookings = (await call('GET', '/admin/bookings')).bookings;
  $('view').innerHTML = `<div class="card p-4">
    <div class="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 mb-3 no-print">
      <input id="f-q" class="in lg:col-span-2" placeholder="Search name, phone, CNIC, ID, city..." value="${esc(filters.q)}">
      <select id="f-status" class="in"><option value="">All statuses</option><option ${filters.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option><option ${filters.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select>
      <select id="f-type" class="in"><option value="">Bus + 2D Car</option><option value="bus" ${filters.type === 'bus' ? 'selected' : ''}>Bus</option><option value="car" ${filters.type === 'car' ? 'selected' : ''}>2D Car</option></select>
      <input id="f-from" type="date" class="in" value="${filters.from}" title="Travel date from">
      <input id="f-to" type="date" class="in" value="${filters.to}" title="Travel date to">
    </div>
    <div class="flex items-center justify-between mb-3 no-print"><span id="b-count" class="text-xs font-semibold text-slate-500"></span><button id="export" class="btn-ghost"><i class="fa-solid fa-file-csv mr-1"></i>Export CSV</button></div>
    <div id="b-table"></div></div>`;
  for (const [id, key] of [['f-q', 'q'], ['f-status', 'status'], ['f-type', 'type'], ['f-from', 'from'], ['f-to', 'to']]) {
    $(id).addEventListener('input', (e) => { filters[key] = e.target.value; paintBookingRows(); });
  }
  $('export').addEventListener('click', exportCsv);
  paintBookingRows();
}

function exportCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Booking', 'Type', 'Status', 'Name', 'CNIC', 'Phone', 'Current city', 'From', 'To', 'Travel date', 'Time', 'Operator', 'Seats', 'Passengers', 'Payment', 'Total (Rs)', 'Pickup lat', 'Pickup lng', 'Booked at'];
  const rows = filtered().map((b) => [b.id, b.type, b.status, b.passengers[0].name, b.passengers[0].cnic, b.passengers[0].phone, b.currentCity, b.from, b.to, b.date, b.time || '', b.operatorName, b.seats.join(' '), b.passengers.map((p) => `${p.name} (${p.cnic})`).join('; '), b.paymentMethod || '', b.amount.total, b.pickup ? b.pickup.lat : '', b.pickup ? b.pickup.lng : '', b.createdAt]);
  const csv = `\ufeff${[head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}`;   // BOM so Excel shows Urdu/special characters correctly
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('view').addEventListener('click', async (e) => {
  const id = e.target.dataset.cancel;
  if (!id || !confirm(`Cancel booking ${id}? The seat will be freed.`)) return;
  try { await call('PATCH', `/admin/bookings/${encodeURIComponent(id)}/cancel`); await load(); } catch (ex) { alert(ex.message); }
});

// ---------- Manifest (printable passenger list per trip) ----------
function manifestHtml() {
  const day = bookings.filter((b) => b.date === manifestDate && b.status === 'Confirmed');
  const groups = new Map();
  day.forEach((b) => {
    const key = `${b.type === 'bus' ? 'Bus' : '2D Car'} · ${b.operatorName} · ${b.from} → ${b.to}${b.time ? ` · ${b.time}` : ''}`;
    if (!groups.has(key)) groups.set(key, []);
    b.passengers.forEach((p, i) => groups.get(key).push({ seat: b.seats[i], name: p.name, cnic: p.cnic, phone: p.phone, city: b.currentCity, pickup: b.pickup, id: b.id }));
  });
  if (!groups.size) return '<p class="text-sm text-slate-500 py-6 text-center">No confirmed passengers for this date.</p>';
  return [...groups].map(([title, rows]) => `<div class="mb-6"><h3 class="font-extrabold mb-2">${esc(title)} <span class="text-xs font-semibold text-slate-500">· ${rows.length} passenger${rows.length > 1 ? 's' : ''}</span></h3>
    ${table(['Seat', 'Name', 'CNIC', 'Phone', 'Current city', 'Pickup', 'Booking'], rows.sort((a, b) => String(a.seat).localeCompare(String(b.seat), undefined, { numeric: true })).map((r) => `<tr><td class="p-3 font-extrabold">${esc(r.seat)}</td><td class="p-3">${esc(r.name)}</td><td class="p-3">${esc(r.cnic)}</td><td class="p-3">${esc(r.phone)}</td><td class="p-3">${esc(r.city)}</td><td class="p-3">${mapLink(r.pickup)}</td><td class="p-3">${esc(r.id)}</td></tr>`))}</div>`).join('');
}

async function manifestTab() {
  bookings = (await call('GET', '/admin/bookings')).bookings;
  $('view').innerHTML = `<div class="card p-4"><div class="flex flex-wrap items-end justify-between gap-3 mb-4 no-print">
      <div><h2 class="font-extrabold text-lg">Trip manifest</h2><p class="text-xs text-slate-500">Passenger list for each trip on the chosen travel date. Print it for the driver or counter.</p></div>
      <div class="flex items-end gap-2"><div><label class="block text-[11px] font-bold text-slate-500 mb-1" for="m-date">Travel date</label><input id="m-date" type="date" class="in" value="${manifestDate}"></div><button id="m-print" class="btn"><i class="fa-solid fa-print mr-1"></i>Print</button></div></div>
    <div id="print-area"><h2 class="hidden print:block font-extrabold text-lg mb-3">Ease Traveling · Manifest ${esc(manifestDate)}</h2><div id="m-body">${manifestHtml()}</div></div></div>`;
  $('m-date').addEventListener('input', (e) => { manifestDate = e.target.value; $('m-body').innerHTML = manifestHtml(); });
  $('m-print').addEventListener('click', () => window.print());
}

// ---------- Messages ----------
async function messagesTab() {
  const { messages } = await call('GET', '/admin/messages');
  $('view').innerHTML = `<div class="card p-4"><h2 class="font-extrabold mb-3">Contact messages <span class="text-xs font-semibold text-slate-500">(${messages.length})</span></h2>${messages.length
    ? messages.map((m) => `<div class="border border-slate-100 rounded-xl p-3 mb-2"><div class="flex flex-wrap justify-between gap-2 text-xs"><b>${esc(m.name)}</b><a class="text-blue-600" href="mailto:${esc(m.email)}">${esc(m.email)}</a><span class="text-slate-400">${esc(new Date(m.createdAt).toLocaleString())}</span></div><p class="text-sm mt-1 whitespace-pre-line">${esc(m.message)}</p></div>`).join('')
    : '<p class="text-sm text-slate-500 py-6 text-center">No messages yet.</p>'}</div>`;
}

async function busesTab() {
  const { buses } = await call('GET', '/buses');
  $('view').innerHTML = `<div class="card p-4"><h2 class="font-extrabold mb-3">Buses</h2>${table(['ID', 'Operator', 'Route', 'Type', 'Fare'], buses.map((b) => `<tr><td class="p-3 font-bold">${esc(b.id)}</td><td class="p-3">${esc(b.operator)}</td><td class="p-3">${esc(b.from)} → ${esc(b.to)} (via ${esc(b.via)})</td><td class="p-3">${esc(b.type)}</td><td class="p-3">${b.classes.map((c) => money(c.price)).join(' / ')}</td></tr>`))}</div>`;
}

async function routesTab() {
  const { routes } = await call('GET', '/admin/routes');
  $('view').innerHTML = `<div class="card p-4"><h2 class="font-extrabold mb-3">Routes</h2>${table(['From', 'To', 'Via', 'Service'], routes.map((r) => `<tr><td class="p-3">${esc(r.from)}</td><td class="p-3">${esc(r.to)}</td><td class="p-3">${esc(r.via)}</td><td class="p-3">${esc(r.kind)}</td></tr>`))}</div>`;
}

async function load() {
  paintTabs();
  try {
    await ({ Dashboard: dashboard, Bookings: bookingsTab, Manifest: manifestTab, Messages: messagesTab, Buses: busesTab, Routes: routesTab })[tab]();
  } catch (ex) { if (getToken()) $('view').innerHTML = `<div class="card p-4 text-sm text-rose-600">${esc(ex.message)}</div>`; }
}

function start() { $('login').classList.add('hidden'); $('panel').classList.remove('hidden'); tab = 'Dashboard'; load(); }
if (getToken()) start();
