'use strict';

const config = require('../config');
const { HttpError, badRequest } = require('../utils/errors');

/** Reads and parses a JSON request body (size limited). */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (!['POST', 'PATCH', 'PUT'].includes(req.method)) return resolve({});
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > config.maxBodyBytes) { reject(new HttpError(413, 'Request body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
        resolve(parsed);
      } catch { reject(badRequest('Request body must be a valid JSON object')); }
    });
    req.on('error', reject);
  });
}

module.exports = { readJsonBody };
