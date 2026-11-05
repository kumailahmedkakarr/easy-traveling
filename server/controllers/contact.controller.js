'use strict';

const logger = require('../utils/logger');
const { uid } = require('../utils/ids');
const { Validator } = require('../utils/validators');

module.exports = (store) => ({
  async send(ctx) {
    const v = new Validator();
    const name = v.string(ctx.body.name, 'name', { min: 2, max: 80 });
    const email = v.pattern(ctx.body.email, 'email', 'email', 'Enter a valid email');
    const message = v.string(ctx.body.message, 'message', { min: 5, max: 2000 });
    v.done();

    await store.addMessage({ id: uid(), name, email, message, createdAt: new Date().toISOString() });
    logger.info('New contact message from', email);
    return { status: 201, body: { ok: true } };
  },
});
