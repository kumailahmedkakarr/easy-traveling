'use strict';

/**
 * Static catalogue (operators, routes, prices).
 * Bookings and users live in the database file, not here.
 */

const DEPARTURE_TIMES = ['07:30 AM', '04:30 PM'];

// Seats that are already taken for every departure (same as the original UI demo).
const BUS_BASELINE_BOOKED = ['A1', 'A2', 'B4', 'C2', 'D3'];
const BUS_SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const BUS_SEATS_PER_ROW = 4;

const buses = [
  {
    id: 'bus-1', operator: 'Al Munir', type: 'Sleeper', from: 'Quetta', to: 'Karachi', via: 'Khuzdar',
    times: DEPARTURE_TIMES, classes: [{ label: 'Sleeper', price: 5000 }],
    image: '/assets/images/al-munir.jpg',
  },
  {
    id: 'bus-2', operator: 'Al Munir', type: 'Sleeper', from: 'Karachi', to: 'Quetta', via: 'Khuzdar',
    times: DEPARTURE_TIMES, classes: [{ label: 'Sleeper', price: 4000 }],
    image: '/assets/images/al-munir.jpg',
  },
  {
    id: 'bus-3', operator: 'Shandar Daiwoo', type: 'Business Class', from: 'Quetta', to: 'Karachi', via: 'Khuzdar',
    times: DEPARTURE_TIMES, classes: [{ label: '2/1 Seat', price: 4000 }, { label: '2/2 Seat', price: 3000 }],
    image: '/assets/images/shandar-daiwoo.jpg',
  },
  {
    id: 'bus-4', operator: 'Shandar Daiwoo', type: 'Business Class', from: 'Karachi', to: 'Quetta', via: 'Khuzdar',
    times: DEPARTURE_TIMES, classes: [{ label: '2/1 Seat', price: 3000 }, { label: '2/2 Seat', price: 2000 }],
    image: '/assets/images/shandar-daiwoo.jpg',
  },
];

const CAR_CITIES = ['Quetta', 'Karachi', 'Lahore', 'Islamabad'];

// Used by the map on the booking page (Khuzdar is the stop on the Quetta-Karachi bus route).
const CITY_COORDS = {
  Quetta: { lat: 30.1798, lng: 66.975 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Khuzdar: { lat: 27.8, lng: 66.61 },
};
const CAR_SEAT_COUNT = 4;

const carOperators = [
  {
    id: 'az-movers', name: 'AZ Movers', tagline: 'Safe Journey Together', initials: 'AZ',
    carType: 'Toyota Corolla', pricePerSeat: 2000, seats: CAR_SEAT_COUNT, popular: true, theme: 'blue',
  },
  {
    id: 'pakistan-2d', name: 'PAKISTAN 2D', tagline: 'Comfortable Rides, Better Journeys', initials: 'PK',
    carType: 'Toyota Corolla', pricePerSeat: 1800, seats: CAR_SEAT_COUNT, popular: false, theme: 'emerald',
  },
  {
    id: 'asia-2d', name: 'ASIA 2D', tagline: 'Travel Different', initials: 'A',
    carType: 'Toyota Corolla', pricePerSeat: 1700, seats: CAR_SEAT_COUNT, popular: false, theme: 'indigo',
  },
];

const PAYMENT_METHODS = {
  bus: ['easypaisa', 'bank'],
  car: ['easypaisa', 'bank', 'cash'],
};

/** Cheapest price per route, used for the "popular routes" cards on the home page. */
const routeCards = () => {
  const cards = new Map();
  buses.forEach((b) => {
    const key = `bus|${b.from}|${b.to}`;
    const price = Math.min(...b.classes.map((c) => c.price));
    const old = cards.get(key);
    cards.set(key, { mode: 'bus', from: b.from, to: b.to, via: b.via, fromPrice: old ? Math.min(old.fromPrice, price) : price });
  });
  const cheapest = Math.min(...carOperators.map((o) => o.pricePerSeat));
  CAR_CITIES.forEach((a) => CAR_CITIES.forEach((b) => {
    if (a !== b && (a === 'Quetta' || b === 'Quetta')) cards.set(`car|${a}|${b}`, { mode: 'car', from: a, to: b, via: null, fromPrice: cheapest });
  }));
  return [...cards.values()];
};

const busSeatIds = () => BUS_SEAT_ROWS.flatMap((r) =>
  Array.from({ length: BUS_SEATS_PER_ROW }, (_, i) => `${r}${i + 1}`));

module.exports = {
  buses, carOperators, CAR_CITIES, CITY_COORDS, CAR_SEAT_COUNT,
  BUS_BASELINE_BOOKED, BUS_SEAT_ROWS, PAYMENT_METHODS, routeCards, BUS_SEATS_PER_ROW, DEPARTURE_TIMES, busSeatIds,
};
