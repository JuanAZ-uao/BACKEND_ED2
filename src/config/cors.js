const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

const parseEnvOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseEnvOrigins()]));

const isVercelPreviewOrigin = (origin) => /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

const isOriginAllowed = (origin) =>
  allowedOrigins.includes(origin) || isVercelPreviewOrigin(origin);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    // Devuelve respuesta CORS bloqueada sin reventar el request con 500.
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

module.exports = {
  corsOptions,
  allowedOrigins,
};