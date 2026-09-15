const existing = require('./proxy.conf.json');

module.exports = {
  '/uploads': existing['/uploads'],
  '/uploads-uat': existing['/uploads-uat'],
  '/api/**': {
    target: 'http://localhost:5258',
    secure: false,
    changeOrigin: true,
    ws: true,
  },
};
