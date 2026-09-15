const existing = require('./proxy.conf.json');

module.exports = {
  '/uploads': existing['/uploads'],
  '/uploads-uat': existing['/uploads-uat'],
};
