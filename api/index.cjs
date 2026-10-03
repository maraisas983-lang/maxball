// Vercel HTTP adapter. Vercel functions do not support the WebSocket upgrade
// used by real-time rooms; use Render for the complete online server.
const { createApp } = require('../server/app.cjs');

const origin = process.env.PUBLIC_ORIGIN || `https://${process.env.VERCEL_URL || 'localhost'}`;
const app = createApp({
  origin,
  production: true,
  databasePath: process.env.DATABASE_PATH || '/tmp/maxball.sqlite',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim()).filter(Boolean)
});

module.exports = (request, response) => app.server.emit('request', request, response);
