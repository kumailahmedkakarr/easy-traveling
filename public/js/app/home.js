import { $, todayIso, tomorrowIso } from '../shared/dom.js';
import { state } from './state.js';
import { citiesFor, fillCitySelects, findRides, setMode } from './search.js';
import { showView } from './navigation.js';

let heroMode = 'bus';

function paintTabs() {
  const on = 'text-brand-600 border-brand-500 font-semibold';
  const off = 'text-slate-500 border-transparent hover:text-slate-800';
  $('h-tab-bus').className = `pb-3 border-b-2 ${heroMode === 'bus' ? on : off}`;
  $('h-tab-car').className = `pb-3 border-b-2 ${heroMode === 'car' ? on : off}`;
}

function fillHeroCities() {
  const list = citiesFor(heroMode);
  const from = list.includes($('h-from').value) ? $('h-from').value : list[0];
  const to = list.includes($('h-to').value) && $('h-to').value !== from ? $('h-to').value : list.find((c) => c !== from);
  const opts = (sel) => list.map((c) => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
  $('h-from').innerHTML = opts(from);
  $('h-to').innerHTML = opts(to);
}

export function initHero() {
  $('h-date').min = todayIso();
  $('h-date').value = tomorrowIso();
  fillHeroCities();
  paintTabs();
}

export function setHeroMode(_el, mode) { heroMode = mode; fillHeroCities(); paintTabs(); }

/** Search from the home page: jumps to the booking page with the ride list ready. */
export async function heroSearch() {
  const from = $('h-from').value; const to = $('h-to').value; const date = $('h-date').value;
  const error = $('h-error');
  error.classList.add('hidden');
  if (from === to) { error.textContent = 'Please choose two different cities.'; error.classList.remove('hidden'); return; }
  if (state.mode !== heroMode) setMode(heroMode);
  Object.assign(state, { from, to, date });
  fillCitySelects();
  $('travel-date').value = date;
  showView('book');
  await findRides();
}
