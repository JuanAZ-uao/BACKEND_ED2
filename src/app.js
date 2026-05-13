const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/error.middleware');
const { initFirebase } = require('./config/firebase');
const { corsOptions } = require('./config/cors');

const app = express();
initFirebase();

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
