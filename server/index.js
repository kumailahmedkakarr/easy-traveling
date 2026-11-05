'use strict';

const config = require('./config');
const logger = require('./utils/logger');
const { createApp } = require('./app');

(async () => {
  const { server } = await createApp();
  server.listen(config.port, () => {
    logger.info(`Easetraveling running at http://localhost:${config.port}  (${config.env})`);
    logger.info(`Admin panel (keep this secret): http://localhost:${config.port}/${config.adminPath}/`);
  });

  // Finish in-flight requests before exiting (Ctrl+C / deploy restarts).
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
  process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
})().catch((err) => {
  logger.error('Failed to start:', err.message || err);
  if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ENOTFOUND'].includes(err.code)) {
    logger.error('Cannot connect to MySQL. Check that MySQL is running (XAMPP > Start) and that DB_HOST, DB_USER, DB_PASSWORD in .env are correct.');
  }
  process.exit(1);
});
