const existing = require('./proxy.conf.json');

module.exports = {
  '/api/passkeys': {
    target: 'https://localhost:7097',
    secure: false,
    changeOrigin: true,
  },
  '/uploads': existing['/uploads'],
  '/uploads-uat': existing['/uploads-uat'],
};
