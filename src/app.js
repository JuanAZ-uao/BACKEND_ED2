const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/error.middleware');
const { initFirebase } = require('./config/firebase');
const { corsOptions } = require('./config/cors');
const { connectDB, getDbStatus } = require('./config/database');

const app = express();
const DB_RETRY_MS = Number(process.env.MONGO_RETRY_MS || 10000);

const hasFirebaseConfig =
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) &&
  Boolean(process.env.FIREBASE_DATABASE_URL);

if (hasFirebaseConfig) {
  initFirebase();
}

const connectWithRetry = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error(' Error conectando a MongoDB:', err.message);
    setTimeout(() => {
      void connectWithRetry();
    }, DB_RETRY_MS);
  }
};

void connectWithRetry();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'TicketMaster API funcionando',
    version: '1.0.0',
  });
});

app.get('/health', (req, res) => {
  const db = getDbStatus();
  const healthy = db.connected;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db,
  });
});

app.use('/api', routes);

app.use(errorMiddleware);

module.exports = app;
