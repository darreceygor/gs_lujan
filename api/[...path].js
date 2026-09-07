const app = require('../server');

module.exports = (req, res) => {
  // Si req.query.path existe (Vercel catch-all), asegurar la ruta /api/...
  if (req.query && req.query.path) {
    const subpath = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : req.query.path;
    const queryIdx = (req.url || '').indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : '';
    req.url = `/api/${subpath}${queryString}`;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
};
