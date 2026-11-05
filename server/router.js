'use strict';

/**
 * Small path router with `:param` support.
 * A route is a list of handlers. Handlers that return `undefined` let the
 * request continue (middleware); the first handler that returns a value ends it.
 */
class Router {
  constructor() { this.routes = []; }

  add(method, path, ...handlers) {
    const keys = [];
    const pattern = new RegExp(`^${path.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
    this.routes.push({ method, path, pattern, keys, handlers });
    return this;
  }

  get(path, ...h) { return this.add('GET', path, ...h); }
  post(path, ...h) { return this.add('POST', path, ...h); }
  patch(path, ...h) { return this.add('PATCH', path, ...h); }

  /** Mount another router under a prefix (optional shared middleware runs first). */
  use(prefix, other, ...middleware) {
    other.routes.forEach((r) => this.add(r.method, prefix + r.path, ...middleware, ...r.handlers));
    return this;
  }

  match(method, pathname) {
    let pathExists = false;
    for (const r of this.routes) {
      const m = r.pattern.exec(pathname);
      if (!m) continue;
      pathExists = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handlers: r.handlers, params };
    }
    return { handlers: null, params: {}, pathExists };
  }
}

module.exports = Router;
