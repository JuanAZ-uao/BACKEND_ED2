require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { registerCheckoutQueueSocket } = require('./src/services/checkoutQueue.service');
const { corsOptions, allowedOrigins } = require('./src/config/cors');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

registerCheckoutQueueSocket(io);

server.listen(PORT, HOST, () => {
  console.log(`\n Concertix API corriendo en http://localhost:${PORT}`);
  console.log(` Escuchando en ${HOST}:${PORT}`);
  console.log(` Socket de cola activo en ws://localhost:${PORT}`);
  console.log(` CORS permitido para: ${allowedOrigins.join(', ')}`);
  console.log(`\n Endpoints disponibles:`);

  console.log(`\n   AUTH`);
  console.log(`   - POST   /api/auth/register`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - POST   /api/auth/refresh`);
  console.log(`   - POST   /api/auth/logout              (protegido)`);

  console.log(`\n   CONCIERTOS`);
  console.log(`   - GET    /api/concerts`);
  console.log(`   - GET    /api/concerts/search?q=`);
  console.log(`   - GET    /api/concerts/:id`);
  console.log(`   - GET    /api/concerts/:id/related`);
  console.log(`   - POST   /api/concerts                 (admin)`);
  console.log(`   - PUT    /api/concerts/:id             (admin)`);
  console.log(`   - DELETE /api/concerts/:id             (admin)`);

  console.log(`\n   TICKETS`);
  console.log(`   - GET    /api/tickets/concert/:concertId`);
  console.log(`   - POST   /api/tickets/reserve          (protegido)`);
  console.log(`   - DELETE /api/tickets/:id/cancel       (protegido)`);

  console.log(`\n   ÓRDENES`);
  console.log(`   - GET    /api/orders                   (protegido)`);
  console.log(`   - GET    /api/orders/:id               (protegido)`);
  console.log(`   - POST   /api/orders                   (protegido)`);
  console.log(`   - PATCH  /api/orders/:id/cancel        (protegido)`);

  console.log(`\n   CARRITO`);
  console.log(`   - GET    /api/cart                     (protegido)`);
  console.log(`   - POST   /api/cart/items               (protegido)`);
  console.log(`   - DELETE /api/cart/items/:ticketTypeId (protegido)`);
  console.log(`   - DELETE /api/cart                     (protegido)`);

  console.log(`\n   USUARIOS`);
  console.log(`   - GET    /api/users/me                 (protegido)`);
  console.log(`   - PUT    /api/users/me                 (protegido)`);
  console.log(`   - GET    /api/users/me/tickets         (protegido)`);
  console.log(`   - GET    /api/users/me/payment-methods (protegido)`);
  console.log(`   - POST   /api/users/me/payment-methods (protegido)`);
  console.log(`   - DELETE /api/users/me/payment-methods/:id (protegido)`);
  console.log(`   - GET    /api/users/me/notifications   (protegido)`);
  console.log(`   - PUT    /api/users/me/notifications   (protegido)`);
  console.log(`   - GET    /api/users                    (admin)`);

  console.log(`\n   .`);
});
