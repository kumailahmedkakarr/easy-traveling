'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};

/** Sends a file from `root`. Returns false when it does not exist or is outside `root`. */
function sendFile(req, res, root, relative, { secret = false } = {}) {
  const file = path.normalize(path.join(root, decodeURIComponent(relative)));
  if (!file.startsWith(root + path.sep)) return false; // blocks "../" tricks

  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;

  const ext = path.extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  if (secret) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow'); // keep Google away from the admin page
  } else {
    const fresh = ext === '.html' || !config.isProduction;
    res.setHeader('Cache-Control', fresh ? 'no-cache' : 'public, max-age=86400');
  }
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file).pipe(res);
  return true;
}

/**
 * Public site: /public. Admin panel: /admin folder, reachable ONLY under the secret URL
 * (/<ADMIN_PATH>/). No page of the public site links to it.
 */
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const secret = `/${config.adminPath}`;

  if (pathname === secret) { res.statusCode = 302; res.setHeader('Location', `${secret}/`); res.end(); return true; }
  if (pathname.startsWith(`${secret}/`)) {
    const rest = pathname.slice(secret.length + 1) || 'index.html';
    return sendFile(req, res, config.adminDir, rest, { secret: true });
  }
  return sendFile(req, res, config.publicDir, pathname === '/' ? '/index.html' : pathname);
}

module.exports = { serveStatic };
