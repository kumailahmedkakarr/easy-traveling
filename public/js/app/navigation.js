import { $ } from '../shared/dom.js';
import { state } from './state.js';
import { drawRoute, refreshMap } from './map.js';
import { setMode } from './search.js';

const VIEWS = ['home', 'book', 'about', 'contact'];

export const closeMenu = () => $('mobile-menu').classList.add('hidden');
export const toggleMenu = () => $('mobile-menu').classList.toggle('hidden');

/** Shows one page of the website (the site is a single page with several views). */
export function showView(name) {
  VIEWS.forEach((v) => $(`view-${v}`).classList.toggle('hidden', v !== name));
  const active = name === 'book' ? `book-${state.mode}` : name;
  document.querySelectorAll('#nav-links [data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === active));
  closeMenu();
  window.scrollTo({ top: 0 });
  if (name === 'book') { refreshMap(); drawRoute('Khuzdar'); }  // the map needs a visible box to measure itself
}

export const navigate = (_el, view) => showView(view);

/** "Search Buses" / "2D Car" in the menu. */
export function openBooking(_el, mode) {
  if (mode && state.mode !== mode) setMode(mode);
  showView('book');
}
