'use strict';

/**
 * Vercel entry point. Vercel runs this file as a "serverless function" for every request
 * that is not a plain file in /public (the API and the secret admin page).
 * The app is created once per warm instance and reused.
 */
let ready;

module.exports = async (req, res) => {
  try {
    // loaded inside try/catch so a missing setting shows a clear message instead of a blank crash
    ready = ready || require('../server/app').createApp().then((app) => app.handler);
    const handler = await ready;
    return await handler(req, res);
  } catch (err) {
    ready = null; // try again from scratch on the next request
    console.error('Startup failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'The server could not start. Open Vercel > your project > Logs, and check your Environment Variables.',
      hint: String((err && err.message) || err).slice(0, 200),
    }));
  }
};
