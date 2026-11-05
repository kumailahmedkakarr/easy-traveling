import { api } from '../shared/api.js';
import { $, escapeHtml, fmtDate, money } from '../shared/dom.js';
import { state, isBus, fareBase, departure } from './state.js';
import { goStep } from './steps.js';
import { renderDetails } from './details.js';

let latest = 0;
const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];

export async function openSeats() {
  $('seat-title').textContent = isBus() ? state.bus.operator : state.operator.name;
  $('seat-sub').textContent = `${state.from} → ${state.to} · ${fmtDate(state.date)}`;
  renderOptions();
  goStep('seats');
  await loadSeatMap();
}

/** Asks the server which seats are already taken for this trip. */
export async function loadSeatMap() {
  const ticket = ++latest;
  try {
    let data;
    if (isBus()) data = await api.get(`/buses/${state.bus.id}/seats?${new URLSearchParams({ date: state.date, time: departure() })}`);
    else data = await api.get(`/cars/seats?${new URLSearchParams({ operatorId: state.operator.id, from: state.from, to: state.to, date: state.date })}`);
    if (ticket !== latest) return;
    state.booked = data.booked.map(String);
    state.seatIds = data.seats || [];
    state.seats = state.seats.filter((s) => !state.booked.includes(String(s)));
  } catch { /* keep the old map, the server checks again when booking */ }
  renderSeats();
}

function renderOptions() {
  if (!isBus()) { $('seat-options').innerHTML = ''; return; }
  const b = state.bus;
  const chip = (on) => `chip ${on ? 'on' : ''}`;
  let html = `<div><span class="label">Departure time</span><div class="flex gap-2">${b.times.map((t, i) => `<button data-action="setTime" data-args='[${i}]' class="${chip(i === state.time)} flex-1">${t}</button>`).join('')}</div></div>`;
  if (b.classes.length > 1) {
    html += `<div><span class="label">Seat type</span><div class="flex gap-2">${b.classes.map((c, i) => `<button data-action="setClass" data-args='[${i}]' class="${chip(i === state.cls)} flex-1">${escapeHtml(c.label)} · ${money(c.price)}</button>`).join('')}</div></div>`;
  }
  $('seat-options').innerHTML = html;
}

export function setTime(i) { state.time = i; state.seats = []; renderOptions(); loadSeatMap(); }
export function setClass(i) { state.cls = i; renderOptions(); renderSeats(); }

const seatButton = (id, label) => {
  const taken = state.booked.includes(String(id));
  const sel = state.seats.includes(id);
  return `<button data-action="toggleSeat" data-args='[${JSON.stringify(id)}]' ${taken ? 'disabled' : ''} class="seat ${taken ? 'taken' : sel ? 'sel' : 'free'}">${label}</button>`;
};

export function renderSeats() {
  if (isBus()) {
    const ids = state.seatIds.length ? state.seatIds : SEAT_ROWS.flatMap((r) => [1, 2, 3, 4].map((n) => r + n));
    const rows = [...new Set(ids.map((s) => s[0]))];
    $('seat-grid').innerHTML = rows.map((r) => `<div class="flex items-center gap-2"><span class="text-xs font-bold text-slate-400 w-4">${r}</span><div class="grid grid-cols-4 gap-2 flex-1">${ids.filter((s) => s[0] === r).map((s) => seatButton(s, s)).join('')}</div></div>`).join('');
  } else {
    const n = state.operator.seats;
    $('seat-grid').innerHTML = `<div class="bg-slate-50 rounded-2xl p-3"><div class="text-[11px] font-bold text-ink-soft mb-2"><i class="fa-solid fa-steering-wheel"></i> Driver · front</div><div class="grid grid-cols-2 gap-2">${Array.from({ length: n }, (_, i) => seatButton(i + 1, `Seat ${i + 1}`)).join('')}</div></div>`;
  }
  const none = !state.seats.length;
  $('seat-list').textContent = none ? '-' : state.seats.join(', ');
  $('seat-total').textContent = money(fareBase());
  $('seat-continue').disabled = none;
}

export function toggleSeat(id) {
  if (state.booked.includes(String(id))) return;
  state.seats = state.seats.includes(id) ? state.seats.filter((s) => s !== id) : [...state.seats, id];
  if (!isBus()) state.seats.sort((a, b) => a - b);
  renderSeats();
}

export function goDetails() {
  if (!state.seats.length) return;
  renderDetails();
  goStep('details');
}

