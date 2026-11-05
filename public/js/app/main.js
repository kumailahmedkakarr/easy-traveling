// Entry point of the booking app: connects buttons to functions and starts the page.
import { bindActions } from '../shared/events.js';
import { api } from '../shared/api.js';
import { $ } from '../shared/dom.js';
import { state } from './state.js';
import { initMap, drawRoute } from './map.js';
import { goStep } from './steps.js';
import { initSearchForm, setMode, swapCities, findRides, onCityChange } from './search.js';
import { renderRoutes, renderSupport, bookRoute, hideSplash } from './site.js';
import { initPwa, installApp } from './pwa.js';
import { selectRide } from './rides.js';
import { toggleSeat, setTime, setClass, goDetails } from './seats.js';
import { submitBooking, clearPickup, useMyLocation } from './details.js';
import { printTicket, newBooking } from './ticket.js';
import { openModal, closeModal, trackBooking, cancelBooking, sendContact, openTrip, clearSaved } from './modals.js';

// Buttons and forms in index.html call these by name (data-action / data-submit).
bindActions({
  setMode: (_el, mode) => setMode(mode),
  swapCities: () => swapCities(),
  goStep: (_el, step) => goStep(step),
  selectRide: (_el, id) => selectRide(id),
  toggleSeat: (_el, id) => toggleSeat(id),
  setTime: (_el, i) => setTime(i),
  setClass: (_el, i) => setClass(i),
  goDetails: () => goDetails(),
  clearPickup: () => clearPickup(),
  useMyLocation: () => useMyLocation(),
  printTicket: () => printTicket(),
  newBooking: () => newBooking(),
  bookRoute, installApp, openTrip, clearSaved,
  openModal, closeModal, cancelBooking,
  findRides, submitBooking, trackBooking, sendContact,
});

// Tapping the dark background closes a popup.
document.addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg')) closeModal(); });

const CITY_SUGGESTIONS = ['Quetta', 'Karachi', 'Lahore', 'Islamabad', 'Khuzdar', 'Hyderabad', 'Sukkur', 'Multan', 'Faisalabad', 'Rawalpindi', 'Peshawar', 'Gwadar', 'Turbat', 'Sibi'];

async function init() {
  try { state.meta = await api.get('/meta'); } catch { /* the app still opens; booking calls will show errors */ }
  $('city-list').innerHTML = CITY_SUGGESTIONS.map((c) => `<option value="${c}">`).join('');
  $('year').textContent = new Date().getFullYear();
  renderRoutes();
  renderSupport();
  initMap();
  initSearchForm();
  $('from-city').addEventListener('change', onCityChange);
  $('to-city').addEventListener('change', onCityChange);
  drawRoute('Khuzdar');
  goStep('search');
  initPwa();
  hideSplash();

  // Shortcuts from the installed app icon: /?open=track or /?open=trips
  const open = new URLSearchParams(location.search).get('open');
  if (open === 'track' || open === 'trips') openModal(null, open);
}

init();
