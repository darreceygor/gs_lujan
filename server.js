require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ScoutLujan#572';
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_default_scout_572';

const HISTORY_FILE = path.join(__dirname, 'json', 'history.json');
const NOVEDADES_FILE = path.join(__dirname, 'json', 'novedades.json');
const UPLOAD_DIR = path.join(__dirname, 'img');

// Asegurar directorios
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de Multer para subida de fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const yearPrefix = req.body.year ? req.body.year + '_' : '';
    const cleanOriginal = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '_')
      .replace(/_+/g, '_');
    const timestamp = Date.now().toString().slice(-6);
    cb(null, `${yearPrefix}${timestamp}_${cleanOriginal}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF, SVG)'));
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de Autenticación
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicie sesión.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}

// Helpers de lectura y escritura JSON
function readJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error leyendo JSON:', filePath, e.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// RUTAS DE LA API (ROUTER DUAL /api Y /)
// ==========================================
const apiRouter = express.Router();

// Login con credenciales del .env
apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Debe ingresar usuario y contraseña.' });
  }

  if (username.trim() === ADMIN_USER && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username: ADMIN_USER, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return res.json({
      success: true,
      message: 'Inicio de sesión correcto.',
      token,
      user: ADMIN_USER
    });
  }

  return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
});

// Verificar sesión
apiRouter.get('/auth/verify', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user.username });
});

// ==========================================
// RUTAS DE HISTORIA / LIBRO DE ORO
// ==========================================

// Obtener historia
apiRouter.get('/history', (req, res) => {
  const history = readJsonFile(HISTORY_FILE);
  history.sort((a, b) => a.year - b.year);
  res.json(history);
});

// Guardar / Actualizar capítulo de año
apiRouter.post('/history', requireAuth, (req, res) => {
  const { year, title, event, description, images, url } = req.body;
  const numYear = parseInt(year, 10);

  if (isNaN(numYear) || numYear < 1900 || numYear > 2100) {
    return res.status(400).json({ error: 'Debe especificar un año válido.' });
  }

  const history = readJsonFile(HISTORY_FILE);
  const existingIndex = history.findIndex(h => h.year === numYear);

  const eventData = {
    year: numYear,
    title: (title || '').trim(),
    event: (event || '').trim(),
    url: (url || '').trim(),
    images: Array.isArray(images) ? images : [],
    description: (description || '').trim()
  };

  if (existingIndex !== -1) {
    history[existingIndex] = eventData;
  } else {
    history.push(eventData);
  }

  history.sort((a, b) => a.year - b.year);
  writeJsonFile(HISTORY_FILE, history);

  res.json({
    success: true,
    message: `Capítulo del año ${numYear} guardado correctamente.`,
    item: eventData
  });
});

// Eliminar capítulo de año
apiRouter.delete('/history/:year', requireAuth, (req, res) => {
  const numYear = parseInt(req.params.year, 10);
  if (isNaN(numYear)) {
    return res.status(400).json({ error: 'Año inválido.' });
  }

  let history = readJsonFile(HISTORY_FILE);
  const initialLen = history.length;
  history = history.filter(h => h.year !== numYear);

  if (history.length === initialLen) {
    return res.status(404).json({ error: `No se encontró el año ${numYear}.` });
  }

  writeJsonFile(HISTORY_FILE, history);
  res.json({ success: true, message: `Año ${numYear} eliminado con éxito.` });
});

// ==========================================
// RUTAS DE NOVEDADES
// ==========================================

// Obtener novedades
apiRouter.get('/novedades', (req, res) => {
  const novedades = readJsonFile(NOVEDADES_FILE);
  novedades.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  res.json(novedades);
});

// Guardar o actualizar novedad
apiRouter.post('/novedades', requireAuth, (req, res) => {
  const { id, title, date, category, summary, content, image, published } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título de la novedad es obligatorio.' });
  }

  const novedades = readJsonFile(NOVEDADES_FILE);
  const now = new Date();
  const currentDate = date || now.toISOString().split('T')[0];

  const itemData = {
    id: id || ('nov-' + Date.now()),
    title: title.trim(),
    date: currentDate,
    category: category || 'Institucional',
    summary: (summary || '').trim(),
    content: (content || '').trim(),
    image: (image || '').trim(),
    published: published !== undefined ? Boolean(published) : true,
    updatedAt: now.toISOString()
  };

  const existingIdx = novedades.findIndex(n => n.id === itemData.id);
  if (existingIdx !== -1) {
    novedades[existingIdx] = itemData;
  } else {
    novedades.unshift(itemData);
  }

  writeJsonFile(NOVEDADES_FILE, novedades);
  res.json({
    success: true,
    message: 'Novedad guardada correctamente.',
    item: itemData
  });
});

// Eliminar novedad
apiRouter.delete('/novedades/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  let novedades = readJsonFile(NOVEDADES_FILE);
  const initialLen = novedades.length;
  novedades = novedades.filter(n => n.id !== id);

  if (novedades.length === initialLen) {
    return res.status(404).json({ error: 'Novedad no encontrada.' });
  }

  writeJsonFile(NOVEDADES_FILE, novedades);
  res.json({ success: true, message: 'Novedad eliminada con éxito.' });
});

// ==========================================
// SUBIDA DE IMÁGENES
// ==========================================

apiRouter.post('/upload', requireAuth, upload.array('photos', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se enviaron archivos para subir.' });
  }

  const uploadedPaths = req.files.map(f => 'img/' + f.filename);
  res.json({
    success: true,
    message: `${uploadedPaths.length} imagen(es) subida(s) con éxito.`,
    files: uploadedPaths
  });
});

// Montar router para que responda tanto en /api/... como en /...
app.use('/api', apiRouter);
app.use('/', apiRouter);

// ==========================================
// ARCHIVOS ESTÁTICOS Y RUTAS WEB
// ==========================================

// Servir panel de administración en /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Servir estáticos
app.use(express.static(__dirname));

// Manejo de errores de multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Error al subir archivo: ' + err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Iniciar servidor local o exportar para serverless (Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(` Grupo Scout #572 'Nuestra Señora de Luján'`);
    console.log(` Servidor activo en http://localhost:${PORT}`);
    console.log(` Panel Administrador: http://localhost:${PORT}/admin`);
    console.log(`==============================================`);
  });
}

module.exports = app;
