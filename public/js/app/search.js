import { $, tomorrowIso, todayIso } from '../shared/dom.js';
import { state, isBus } from './state.js';
import { goStep, paintModeButtons } from './steps.js';
import { drawRoute, setPickup } from './map.js';
import { loadRides } from './rides.js';

const BUS_CITIES = ['Quetta', 'Karachi'];
const CAR_CITIES = ['Quetta', 'Karachi', 'Lahore', 'Islamabad'];
const options = (list, selected) => list.map((c) => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');

export function fillCitySelects() {
  const list = isBus() ? BUS_CITIES : CAR_CITIES;
  if (!list.includes(state.from)) state.from = list[0];
  if (!list.includes(state.to) || state.to === state.from) state.to = list.find((c) => c !== state.from);
  $('from-city').innerHTML = options(list, state.from);
  $('to-city').innerHTML = options(list, state.to);
}

export function initSearchForm() {
  const date = $('travel-date');
  date.min = todayIso();
  date.value = state.date || tomorrowIso();
  fillCitySelects();
  paintModeButtons();
}

export function setMode(mode) {
  if (state.mode === mode) return;
  Object.assign(state, { mode, bus: null, operator: null, seats: [], booked: [], cls: 0, time: 0 });
  fillCitySelects();
  paintModeButtons();
  goStep('search');
  drawRoute();
}

export function swapCities() {
  [state.from, state.to] = [$('to-city').value, $('from-city').value];
  fillCitySelects();
  drawRoute('Khuzdar');
}

export async function findRides() {
  const error = $('search-error');
  const from = $('from-city').value; const to = $('to-city').value;
  error.classList.add('hidden');
  if (from === to) { error.textContent = 'Please choose two different cities.'; error.classList.remove('hidden'); return; }
  Object.assign(state, { from, to, date: $('travel-date').value, seats: [] });
  setPickup(null);
  drawRoute('Khuzdar');
  await loadRides();
  goStep('rides');
}

/** Map preview as soon as the person changes a city. */
export function onCityChange() {
  state.from = $('from-city').value;
  state.to = $('to-city').value;
  if (state.from !== state.to) drawRoute('Khuzdar');
}

/** Used by the popular-route cards: switch service, fill the route and show it on the map. */
export function applyRoute(mode, from, to) {
  if (state.mode !== mode) setMode(mode);
  Object.assign(state, { from, to });
  fillCitySelects();
  goStep('search');
  drawRoute('Khuzdar');
}
