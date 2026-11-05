const BASE = '/api';

/** Error thrown for every failed API call. `details` holds field-level messages. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }

  /** One readable text, including the field errors if the server sent them. */
  get readable() {
    return this.details && this.status === 400 ? Object.values(this.details).join('\n') : this.message;
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your internet connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed', data.details);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body || {}),
  patch: (path, body) => request('PATCH', path, body || {}),
};
