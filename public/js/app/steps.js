import { $ } from '../shared/dom.js';
import { state } from './state.js';
import { pickingMode, refreshMap } from './map.js';

const STEPS = ['search', 'rides', 'seats', 'details', 'ticket'];

/** Shows one step of the sheet and hides the others. */
export function goStep(step) {
  state.step = step;
  STEPS.forEach((s) => $(`step-${s}`).classList.toggle('hidden', s !== step));
  pickingMode(step === 'details');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshMap();
}

export function paintModeButtons() {
  const on = 'bg-white shadow text-brand-600';
  const off = 'text-ink-soft';
  $('mode-bus').className = `py-2.5 rounded-xl text-sm font-extrabold ${state.mode === 'bus' ? on : off}`;
  $('mode-car').className = `py-2.5 rounded-xl text-sm font-extrabold ${state.mode === 'car' ? on : off}`;
}
