const app = require('../server');

module.exports = (req, res) => {
  // Asegurar que req.url mantenga el prefijo /api si llega a la raíz del serverless
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
