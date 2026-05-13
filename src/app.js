const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/error.middleware');
const { initFirebase } = require('./config/firebase');

const app = express();
initFirebase();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'TicketMaster API funcionando',
    version: '1.0.0',
  });
});

app.use('/api', routes);

app.use(errorMiddleware);

module.exports = app;
