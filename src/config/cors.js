const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

const parseEnvOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseEnvOrigins()]));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

module.exports = {
  corsOptions,
  allowedOrigins,
};