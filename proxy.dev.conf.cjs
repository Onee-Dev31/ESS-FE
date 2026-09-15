const existing = require('./proxy.conf.json');

module.exports = {
  '/uploads': existing['/uploads'],
  '/uploads-uat': existing['/uploads-uat'],
  '/api/**': {
    target: 'http://10.31.1.83:8001',
    secure: false,
    changeOrigin: true,
    ws: true,
  },
};
