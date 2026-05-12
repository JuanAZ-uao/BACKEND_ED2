require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n TicketMaster API corriendo en http://localhost:${PORT}`);
  console.log(`\n Endpoints disponibles:`);

  console.log(`\n   AUTH`);
  console.log(`   - POST   /api/auth/register`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - POST   /api/auth/refresh`);
  console.log(`   - POST   /api/auth/logout              (protegido)`);

  console.log(`\n   EVENTOS`);
  console.log(`   - GET    /api/events`);
  console.log(`   - GET    /api/events/search?q=`);
  console.log(`   - GET    /api/events/:id`);
  console.log(`   - POST   /api/events                   (admin)`);
  console.log(`   - PUT    /api/events/:id               (admin)`);
  console.log(`   - DELETE /api/events/:id               (admin)`);

  console.log(`\n   TICKETS`);
  console.log(`   - GET    /api/tickets/event/:eventId`);
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
  console.log(`   - GET    /api/users                    (admin)`);

  console.log(`\n   .`);
});
