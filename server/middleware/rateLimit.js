'use strict';

const { HttpError } = require('../utils/errors');

/** Fixed-window limiter per client IP. Use `rateLimit({ max })` as route middleware. */
function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();

  return (ctx) => {
    const ip = ctx.req.socket.remoteAddress || 'unknown';
    const count = (hits.get(ip) || 0) + 1;
    hits.set(ip, count);
    if (count > max) throw new HttpError(429, 'Too many requests, please slow down');
  };
}

module.exports = { rateLimit };
