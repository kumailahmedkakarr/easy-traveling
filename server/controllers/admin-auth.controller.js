'use strict';

module.exports = (adminAuth) => ({
  login: (ctx) => adminAuth.login(ctx.body),
  me: (ctx) => ({ admin: { id: ctx.admin.id, name: ctx.admin.name, email: ctx.admin.email } }),
});
