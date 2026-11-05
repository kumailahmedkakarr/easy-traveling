'use strict';

/** Error that is safe to show to API clients. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);
const notFound = (msg = 'Resource not found') => new HttpError(404, msg);
const conflict = (msg, details) => new HttpError(409, msg, details);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
