const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/error.middleware');
const { initFirebase } = require('./config/firebase');
const { corsOptions } = require('./config/cors');
const { connectDB } = require('./config/database');

const app = express();

const hasFirebaseConfig =
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) &&
  Boolean(process.env.FIREBASE_DATABASE_URL);

if (hasFirebaseConfig) {
  initFirebase();
}

connectDB().catch((err) => {
  console.error(' Error conectando a MongoDB:', err.message);
  process.exit(1);
});

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
  res.status(200).json({
    status: 'ok',
  });
});

app.use('/api', routes);

app.use(errorMiddleware);

module.exports = app;
