import { api } from '../shared/api.js';
import { $, escapeHtml, fmtDate, money } from '../shared/dom.js';
import { state, isBus } from './state.js';
import { openSeats } from './seats.js';

const THEMES = { blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700', indigo: 'bg-indigo-100 text-indigo-700' };
const AMENITIES = ['Wi-Fi', 'AC', 'TV', 'Charging', 'Meal'];

const busCard = (b) => `
  <div class="ride" data-action="selectRide" data-args='["${b.id}"]'>
    <div class="flex gap-3">
      <img src="${b.image}" alt="${escapeHtml(b.operator)}" class="w-24 h-20 object-cover rounded-xl flex-shrink-0">
      <div class="flex-1 min-w-0">
        <span class="text-[10px] font-extrabold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">${escapeHtml(b.type)}</span>
        <h3 class="font-extrabold mt-1">${escapeHtml(b.operator)}</h3>
        <p class="text-[11px] text-ink-soft"><i class="fa-solid fa-clock mr-1"></i>${b.times.join(' & ')} · via ${escapeHtml(b.via)}</p>
        <p class="text-[10px] text-ink-soft mt-1">${AMENITIES.join(' · ')}</p>
      </div>
    </div>
    <div class="flex items-end justify-between mt-3 pt-3 border-t border-slate-100">
      <div>${b.classes.map((c) => `<div class="text-sm font-extrabold">${b.classes.length > 1 ? `${escapeHtml(c.label)}: ` : ''}${money(c.price)}</div>`).join('')}<span class="text-[10px] text-ink-soft">per seat</span></div>
      <span class="text-xs font-extrabold text-brand-600">Select seats <i class="fa-solid fa-arrow-right"></i></span>
    </div>
  </div>`;

const carCard = (o) => `
  <div class="ride" data-action="selectRide" data-args='["${o.id}"]'>
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl ${THEMES[o.theme] || THEMES.blue} font-black flex items-center justify-center">${escapeHtml(o.initials)}</div>
      <div class="flex-1">
        <h3 class="font-extrabold">${escapeHtml(o.name)} ${o.popular ? '<span class="text-[9px] bg-brand-500 text-white px-2 py-0.5 rounded-full align-middle">POPULAR</span>' : ''}</h3>
        <p class="text-[11px] text-ink-soft">${escapeHtml(o.tagline)}</p>
        <p class="text-[11px] text-ink-soft mt-0.5"><i class="fa-solid fa-car-side mr-1"></i>${escapeHtml(o.carType)} · ${o.seats} seats · AC</p>
      </div>
      <div class="text-right"><div class="text-sm font-extrabold">${money(o.pricePerSeat)}</div><span class="text-[10px] text-ink-soft">per seat</span></div>
    </div>
  </div>`;

export async function loadRides() {
  const list = $('rides-list');
  $('rides-title').textContent = isBus() ? 'Choose your bus' : 'Choose your car';
  $('rides-sub').textContent = `${state.from} → ${state.to} · ${fmtDate(state.date)}`;
  list.innerHTML = '<p class="text-sm text-ink-soft">Loading...</p>';
  try {
    if (isBus()) {
      state.buses = (await api.get(`/buses?from=${encodeURIComponent(state.from)}&to=${encodeURIComponent(state.to)}`)).buses;
      list.innerHTML = state.buses.length ? state.buses.map(busCard).join('') : '<p class="text-sm text-ink-soft">No buses on this route yet.</p>';
    } else {
      state.operators = (await api.get('/cars/operators')).operators;
      list.innerHTML = state.operators.map(carCard).join('');
    }
  } catch (err) { list.innerHTML = `<p class="text-sm text-rose-600">${escapeHtml(err.message)}</p>`; }
}

export function selectRide(id) {
  if (isBus()) { state.bus = state.buses.find((b) => b.id === id); state.cls = 0; state.time = 0; }
  else state.operator = state.operators.find((o) => o.id === id);
  state.seats = [];
  openSeats();
}
