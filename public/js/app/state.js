import { tomorrowIso } from '../shared/dom.js';

/** Everything the booking app remembers while the page is open. */
export const state = {
  mode: 'bus',                  // 'bus' or 'car'
  step: 'search',               // search -> rides -> seats -> details -> ticket
  meta: { serviceFee: 500, cities: [], routes: [], support: {}, paymentMethods: { bus: [], car: [] } },
  from: 'Quetta',
  to: 'Karachi',
  date: tomorrowIso(),
  buses: [], bus: null, cls: 0, time: 0,       // bus mode
  operators: [], operator: null,                // car mode
  seats: [],                    // seats the person tapped
  seatIds: [],                  // every seat of the bus (from the API)
  booked: [],                   // seats already taken (from the API)
  pickup: null,                 // { lat, lng } or null
};

export const isBus = () => state.mode === 'bus';
export const unitPrice = () => (isBus() ? state.bus.classes[state.cls].price : state.operator.pricePerSeat);
export const serviceFee = () => (isBus() ? state.meta.serviceFee : 0);
export const fareBase = () => unitPrice() * state.seats.length;
export const fareTotal = () => fareBase() + serviceFee();
export const departure = () => (isBus() ? state.bus.times[state.time] : null);
export const coords = (name) => state.meta.cities.find((c) => c.name === name);
