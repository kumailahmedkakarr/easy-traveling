'use strict';

const config = require('../config');

/** Security headers for every response. */
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // The pages use the Tailwind CDN (needs inline styles/scripts + eval) and a few CDNs.
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
    "img-src 'self' data: https://*.tile.openstreetmap.org https://images.unsplash.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  if (config.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
}

/** CORS only for origins listed in CORS_ORIGINS. Returns true if the request was a preflight. */
function handleCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
}

module.exports = { applySecurityHeaders, handleCors };
