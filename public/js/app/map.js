import { $ } from '../shared/dom.js';
import { state, coords, isBus } from './state.js';

/*
 * Map: Leaflet + OpenStreetMap (free, no API key).
 * If Leaflet cannot load (no internet / blocked), a simple offline "schematic" map is drawn instead,
 * so the route and the pickup point still work.
 */
let map; let routeLayer; let pickupMarker; let pickingEnabled = false; let onPick = () => {};
let lastVia = null; let schematic = false;
const hasLeaflet = () => typeof window.L !== 'undefined' && map;

const pin = (cls, size = 18) => window.L.divIcon({ className: '', html: `<div class="pin ${cls}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

// ---------- offline schematic map (SVG, Pakistan 60E-77E, 23N-37N) ----------
const project = (c) => [(c.lng - 60) * 10, (37 - c.lat) * 10];

function renderSchematic() {
  const el = $('map');
  const a = coords(state.from); const b = coords(state.to);
  const stops = [a, ...(lastVia && isBus() ? [coords(lastVia)].filter(Boolean) : []), b].filter(Boolean).map(project);
  const dots = state.meta.cities.map((c) => { const [x, y] = project(c); return `<circle cx="${x}" cy="${y}" r="1.1" fill="#94A3B8"/><text x="${x + 2}" y="${y + 1}" font-size="3.2" fill="#475569" font-weight="600">${c.name}</text>`; }).join('');
  const line = stops.length > 1 ? `<polyline points="${stops.map((s) => s.join(',')).join(' ')}" fill="none" stroke="#0A84F0" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  const from = stops[0] ? `<circle cx="${stops[0][0]}" cy="${stops[0][1]}" r="2.2" fill="#16A34A" stroke="#fff" stroke-width="0.8"/>` : '';
  const to = stops.length > 1 ? `<rect x="${stops[stops.length - 1][0] - 2}" y="${stops[stops.length - 1][1] - 2}" width="4" height="4" rx="0.8" fill="#E11D48" stroke="#fff" stroke-width="0.8"/>` : '';
  const p = state.pickup ? project(state.pickup) : null;
  const pick = p ? `<circle cx="${p[0]}" cy="${p[1]}" r="2.4" fill="#F59E0B" stroke="#fff" stroke-width="0.8"/>` : '';
  el.innerHTML = `<svg viewBox="0 0 170 140" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;cursor:crosshair"><rect width="170" height="140" fill="#DDE7E1"/>${line}${dots}${from}${to}${pick}<text x="3" y="137" font-size="3" fill="#64748B">Simple map (online map not available)</text></svg>`;
}

function initSchematic() {
  schematic = true;
  $('map').addEventListener('click', (e) => {
    if (!pickingEnabled) return;
    const svg = $('map').querySelector('svg');
    if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const spot = pt.matrixTransform(svg.getScreenCTM().inverse());
    setPickup({ lat: Math.round((37 - spot.y / 10) * 1e6) / 1e6, lng: Math.round((spot.x / 10 + 60) * 1e6) / 1e6 });
    onPick(state.pickup);
  });
  renderSchematic();
}

// ---------- public functions ----------
export function initMap() {
  if (typeof window.L === 'undefined') { initSchematic(); return; }
  map = window.L.map('map', { zoomControl: false, attributionControl: true }).setView([29.5, 67.5], 6);
  window.L.control.zoom({ position: 'topright' }).addTo(map);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
  map.on('click', (e) => { if (pickingEnabled) { setPickup({ lat: e.latlng.lat, lng: e.latlng.lng }); onPick(state.pickup); } });
}

/** Draws source -> (via) -> destination. */
export function drawRoute(via) {
  lastVia = via || null;
  if (schematic) { renderSchematic(); return; }
  if (!hasLeaflet()) return;
  const a = coords(state.from); const b = coords(state.to);
  if (!a || !b) return;
  if (routeLayer) routeLayer.remove();
  const stops = [a, ...(via && isBus() ? [coords(via)].filter(Boolean) : []), b];
  const line = window.L.polyline(stops.map((s) => [s.lat, s.lng]), { color: '#0A84F0', weight: 5, opacity: 0.9 });
  routeLayer = window.L.layerGroup([
    line,
    window.L.marker([a.lat, a.lng], { icon: pin('pin-from') }).bindTooltip(state.from),
    window.L.marker([b.lat, b.lng], { icon: pin('pin-to') }).bindTooltip(state.to),
  ]).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [40, 40] });
}

export function setPickup(point) {
  state.pickup = point;
  if (schematic) { renderSchematic(); return; }
  if (!hasLeaflet()) return;
  if (pickupMarker) { pickupMarker.remove(); pickupMarker = null; }
  if (point) {
    pickupMarker = window.L.marker([point.lat, point.lng], { icon: pin('pin-pickup', 22), draggable: true }).addTo(map).bindTooltip('Pickup point');
    pickupMarker.on('dragend', () => { const p = pickupMarker.getLatLng(); state.pickup = { lat: p.lat, lng: p.lng }; onPick(state.pickup); });
    map.panTo([point.lat, point.lng]);
  }
}

/** While `on` is true, tapping the map sets the pickup point. */
export function pickingMode(on, callback) {
  pickingEnabled = on;
  if (callback) onPick = callback;
  $('map-hint').classList.toggle('hidden', !on);
}

export const refreshMap = () => { if (hasLeaflet()) setTimeout(() => map.invalidateSize(), 60); };
