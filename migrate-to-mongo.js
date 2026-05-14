/**
 * migrate-to-mongo.js
 * Lee TODOS los datos reales de PostgreSQL (Neon) y los inserta en MongoDB Atlas.
 * Mantiene todas las relaciones mapeando IDs enteros → ObjectId de Mongo.
 */
require('dotenv').config();
const { Client } = require('pg');
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.plugin((schema) => {
  const transform = (doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  };
  schema.set('toJSON', { virtuals: false, transform });
  schema.set('toObject', { virtuals: false, transform });
});

const {
  User, RefreshToken, Venue, Artist, Concert,
  TicketType, Ticket, Order, Cart, WaitingList,
  Review, PaymentMethod, NotificationPreference, Notification,
} = require('./src/models');

const newId = () => new mongoose.Types.ObjectId();

async function bulk(Model, docs, batchSize = 500) {
  for (let i = 0; i < docs.length; i += batchSize) {
    await Model.insertMany(docs.slice(i, i + batchSize), { ordered: false });
    process.stdout.write(`\r    → ${Math.min(i + batchSize, docs.length)}/${docs.length}`);
  }
  if (docs.length > 0) process.stdout.write('\n');
}

async function migrate() {
  // ── Conexiones ─────────────────────────────────────────────────────────────
  console.log('\nConectando a PostgreSQL (Neon)...');
  const pg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();
  console.log('✓ PostgreSQL conectado');

  console.log('Conectando a MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ MongoDB conectado:', mongoose.connection.host);

  // ── Limpiar MongoDB ─────────────────────────────────────────────────────────
  console.log('\nLimpiando colecciones MongoDB...');
  await Promise.all([
    User.deleteMany({}), RefreshToken.deleteMany({}), Venue.deleteMany({}),
    Artist.deleteMany({}), Concert.deleteMany({}), TicketType.deleteMany({}),
    Ticket.deleteMany({}), Order.deleteMany({}), Cart.deleteMany({}),
    WaitingList.deleteMany({}), Review.deleteMany({}),
    PaymentMethod.deleteMany({}), NotificationPreference.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('✓ MongoDB limpio\n');

  // Mapas Postgres int → Mongo ObjectId
  const userMap       = new Map();
  const venueMap      = new Map();
  const sectionMap    = new Map();
  const artistMap     = new Map();
  const concertMap    = new Map();
  const ttMap         = new Map(); // ticketType
  const ticketMap     = new Map();
  const orderMap      = new Map();

  // ── 1. USUARIOS ────────────────────────────────────────────────────────────
  console.log('Migrando usuarios...');
  const { rows: users } = await pg.query('SELECT * FROM "User" ORDER BY id');
  const userDocs = users.map((u) => {
    const mid = newId();
    userMap.set(u.id, mid);
    return {
      _id:       mid,
      firstName: u.firstName,
      lastName:  u.lastName,
      email:     u.email,
      password:  u.password,
      role:      u.role,
      phone:     u.phone       || undefined,
      birthDate: u.birthDate   || undefined,
      gender:    u.gender      || undefined,
      city:      u.city        || undefined,
      document:  u.document    || undefined,
      bio:       u.bio         || undefined,
      avatarUrl: u.avatarUrl   || undefined,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  });
  await bulk(User, userDocs);
  console.log(`✓ ${users.length} usuarios`);

  // ── 2. VENUES + SECCIONES ─────────────────────────────────────────────────
  console.log('Migrando venues y secciones...');
  const { rows: venues   } = await pg.query('SELECT * FROM "Venue"   ORDER BY id');
  const { rows: sections } = await pg.query('SELECT * FROM "Section" ORDER BY id');

  const secsByVenue = {};
  for (const s of sections) {
    const secMid = newId();
    sectionMap.set(s.id, secMid);
    if (!secsByVenue[s.venueId]) secsByVenue[s.venueId] = [];
    secsByVenue[s.venueId].push({ ...s, _mid: secMid });
  }

  const venueDocs = venues.map((v) => {
    const mid = newId();
    venueMap.set(v.id, mid);
    return {
      _id:      mid,
      name:     v.name,
      address:  v.address,
      city:     v.city,
      country:  v.country   || 'Colombia',
      imageUrl: v.imageUrl  || undefined,
      sections: (secsByVenue[v.id] || []).map((s) => ({
        _id:         s._mid,
        name:        s.name,
        capacity:    s.capacity,
        description: s.description || undefined,
        color:       s.color       || undefined,
      })),
    };
  });
  await bulk(Venue, venueDocs);
  console.log(`✓ ${venues.length} venues, ${sections.length} secciones`);

  // ── 3. ARTISTAS ───────────────────────────────────────────────────────────
  console.log('Migrando artistas...');
  const { rows: artists } = await pg.query('SELECT * FROM "Artist" ORDER BY id');
  const artistDocs = artists.map((a) => {
    const mid = newId();
    artistMap.set(a.id, mid);
    return {
      _id:      mid,
      name:     a.name,
      bio:      a.bio      || undefined,
      imageUrl: a.imageUrl || undefined,
      genres:   a.genres   || [],
    };
  });
  await bulk(Artist, artistDocs);
  console.log(`✓ ${artists.length} artistas`);

  // ── 4. CONCIERTOS ─────────────────────────────────────────────────────────
  console.log('Migrando conciertos...');
  const { rows: concerts } = await pg.query('SELECT * FROM "Concert" ORDER BY id');
  const concertDocs = concerts.map((c) => {
    const mid = newId();
    concertMap.set(c.id, mid);
    return {
      _id:         mid,
      artistId:    artistMap.get(c.artistId),
      tourName:    c.tourName,
      description: c.description  || undefined,
      date:        c.date,
      doorsOpenAt: c.doorsOpenAt  || undefined,
      endDate:     c.endDate      || undefined,
      venueId:     venueMap.get(c.venueId),
      imageUrl:    c.imageUrl     || undefined,
      bannerUrl:   c.bannerUrl    || undefined,
      status:      c.status,
      isFeatured:  c.isFeatured,
      genres:      c.genres       || [],
      viewerCount: c.viewerCount  || 0,
      createdAt:   c.createdAt,
      updatedAt:   c.updatedAt,
    };
  });
  await bulk(Concert, concertDocs);
  console.log(`✓ ${concerts.length} conciertos`);

  // ── 5. TIPOS DE BOLETA ───────────────────────────────────────────────────
  console.log('Migrando tipos de boleta...');
  const { rows: ticketTypes } = await pg.query('SELECT * FROM "TicketType" ORDER BY id');
  const ttDocs = ticketTypes.map((tt) => {
    const mid = newId();
    ttMap.set(tt.id, mid);
    return {
      _id:               mid,
      concertId:         concertMap.get(tt.concertId),
      sectionId:         tt.sectionId ? sectionMap.get(tt.sectionId) : undefined,
      name:              tt.name,
      description:       tt.description        || undefined,
      price:             tt.price,
      totalQuantity:     tt.totalQuantity,
      availableQuantity: tt.availableQuantity,
      maxPerOrder:       tt.maxPerOrder,
    };
  });
  await bulk(TicketType, ttDocs);
  console.log(`✓ ${ticketTypes.length} tipos de boleta`);

  // ── 6. BOLETAS ────────────────────────────────────────────────────────────
  console.log('Migrando boletas (puede tardar)...');
  const { rows: tickets } = await pg.query('SELECT * FROM "Ticket" ORDER BY id');

  // Pre-generar todos los IDs de boletas
  for (const t of tickets) ticketMap.set(t.id, newId());

  const BATCH = 500;
  for (let i = 0; i < tickets.length; i += BATCH) {
    const docs = tickets.slice(i, i + BATCH).map((t) => ({
      _id:          ticketMap.get(t.id),
      ticketTypeId: ttMap.get(t.ticketTypeId),
      userId:       t.userId ? userMap.get(t.userId) : undefined,
      row:          t.row        || undefined,
      seatLabel:    t.seatLabel  || undefined,
      ticketCode:   t.ticketCode,
      qrCode:       t.qrCode,
      status:       t.status,
      usedAt:       t.usedAt     || undefined,
      createdAt:    t.createdAt,
    }));
    await Ticket.insertMany(docs, { ordered: false });
    process.stdout.write(`\r    → ${Math.min(i + BATCH, tickets.length)}/${tickets.length}`);
  }
  process.stdout.write('\n');
  console.log(`✓ ${tickets.length} boletas`);

  // ── 7. ÓRDENES + ITEMS EMBEBIDOS ─────────────────────────────────────────
  console.log('Migrando órdenes...');
  const { rows: orders     } = await pg.query('SELECT * FROM "Order"     ORDER BY id');
  const { rows: orderItems } = await pg.query('SELECT * FROM "OrderItem" ORDER BY id');

  const itemsByOrder = {};
  for (const item of orderItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  const orderDocs = orders.map((o) => {
    const mid = newId();
    orderMap.set(o.id, mid);
    return {
      _id:           mid,
      userId:        userMap.get(o.userId),
      status:        o.status,
      subtotal:      o.subtotal,
      serviceFee:    o.serviceFee,
      insurance:     o.insurance,
      totalAmount:   o.totalAmount,
      paymentMethod: o.paymentMethod || undefined,
      items: (itemsByOrder[o.id] || []).map((item) => ({
        ticketTypeId: ttMap.get(item.ticketTypeId),
        quantity:     item.quantity,
        unitPrice:    item.unitPrice,
      })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });
  await bulk(Order, orderDocs);
  console.log(`✓ ${orders.length} órdenes`);

  // ── 8. ACTUALIZAR orderId en boletas ─────────────────────────────────────
  console.log('Enlazando boletas con órdenes...');
  const ticketsConOrden = tickets.filter((t) => t.orderId !== null);
  for (let i = 0; i < ticketsConOrden.length; i += BATCH) {
    const ops = ticketsConOrden.slice(i, i + BATCH).map((t) => ({
      updateOne: {
        filter: { _id: ticketMap.get(t.id) },
        update: { $set: { orderId: orderMap.get(t.orderId) } },
      },
    }));
    await Ticket.bulkWrite(ops);
    process.stdout.write(`\r    → ${Math.min(i + BATCH, ticketsConOrden.length)}/${ticketsConOrden.length}`);
  }
  process.stdout.write('\n');
  console.log(`✓ ${ticketsConOrden.length} boletas enlazadas con su orden`);

  // ── 9. CARRITOS + ITEMS EMBEBIDOS ────────────────────────────────────────
  console.log('Migrando carritos...');
  const { rows: carts     } = await pg.query('SELECT * FROM "Cart"     ORDER BY id');
  const { rows: cartItems } = await pg.query('SELECT * FROM "CartItem" ORDER BY id');

  const itemsByCart = {};
  for (const item of cartItems) {
    if (!itemsByCart[item.cartId]) itemsByCart[item.cartId] = [];
    itemsByCart[item.cartId].push(item);
  }

  const cartDocs = carts.map((cart) => ({
    userId:    userMap.get(cart.userId),
    expiresAt: cart.expiresAt,
    items: (itemsByCart[cart.id] || []).map((item) => ({
      ticketTypeId: ttMap.get(item.ticketTypeId),
      quantity:     item.quantity,
    })),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  }));
  if (cartDocs.length > 0) await bulk(Cart, cartDocs);
  console.log(`✓ ${carts.length} carritos`);

  // ── 10. LISTA DE ESPERA ──────────────────────────────────────────────────
  console.log('Migrando lista de espera...');
  const { rows: wl } = await pg.query('SELECT * FROM "WaitingList" ORDER BY id');
  const wlDocs = wl.map((w) => ({
    userId:       userMap.get(w.userId),
    concertId:    concertMap.get(w.concertId),
    ticketTypeId: ttMap.get(w.ticketTypeId),
    quantity:     w.quantity,
    position:     w.position,
    createdAt:    w.createdAt,
  }));
  if (wlDocs.length > 0) await bulk(WaitingList, wlDocs);
  console.log(`✓ ${wl.length} entradas en lista de espera`);

  // ── 11. RESEÑAS ──────────────────────────────────────────────────────────
  console.log('Migrando reseñas...');
  const { rows: reviews } = await pg.query('SELECT * FROM "Review" ORDER BY id');
  const reviewDocs = reviews.map((r) => ({
    userId:    userMap.get(r.userId),
    concertId: concertMap.get(r.concertId),
    rating:    r.rating,
    comment:   r.comment  || undefined,
    createdAt: r.createdAt,
  }));
  if (reviewDocs.length > 0) await bulk(Review, reviewDocs);
  console.log(`✓ ${reviews.length} reseñas`);

  // ── 12. MÉTODOS DE PAGO ──────────────────────────────────────────────────
  console.log('Migrando métodos de pago...');
  const { rows: pms } = await pg.query('SELECT * FROM "PaymentMethod" ORDER BY id');
  const pmDocs = pms.map((pm) => ({
    userId:      userMap.get(pm.userId),
    lastFour:    pm.lastFour,
    brand:       pm.brand,
    expiryMonth: pm.expiryMonth,
    expiryYear:  pm.expiryYear,
    isPrimary:   pm.isPrimary,
    createdAt:   pm.createdAt,
  }));
  if (pmDocs.length > 0) await bulk(PaymentMethod, pmDocs);
  console.log(`✓ ${pms.length} métodos de pago`);

  // ── 13. PREFERENCIAS DE NOTIFICACIÓN ────────────────────────────────────
  console.log('Migrando preferencias de notificación...');
  const { rows: nps } = await pg.query('SELECT * FROM "NotificationPreference" ORDER BY id');
  const npDocs = nps.map((np) => ({
    userId:               userMap.get(np.userId),
    emailConcertsNearby:  np.emailConcertsNearby,
    emailPurchaseConfirm: np.emailPurchaseConfirm,
    emailEventReminders:  np.emailEventReminders,
    emailOffers:          np.emailOffers,
    pushTicketUpdates:    np.pushTicketUpdates,
    pushPriceAlerts:      np.pushPriceAlerts,
    smsPurchaseConfirm:   np.smsPurchaseConfirm,
    smsSecurityAlerts:    np.smsSecurityAlerts,
  }));
  if (npDocs.length > 0) await bulk(NotificationPreference, npDocs);
  console.log(`✓ ${nps.length} preferencias de notificación`);

  // ── 14. NOTIFICACIONES ───────────────────────────────────────────────────
  // La tabla Notification no existe en esta base PostgreSQL — se omite.
  console.log('⚠ Notificaciones: tabla no encontrada en Postgres, se omite.');

  // ── 15. REFRESH TOKENS (solo los no expirados) ───────────────────────────
  console.log('Migrando refresh tokens activos...');
  const { rows: rts } = await pg.query('SELECT * FROM "RefreshToken" ORDER BY id');
  const now = new Date();
  const rtDocs = rts
    .filter((rt) => rt.expiresAt > now)
    .map((rt) => ({
      token:     rt.token,
      userId:    userMap.get(rt.userId),
      expiresAt: rt.expiresAt,
      createdAt: rt.createdAt,
    }));
  if (rtDocs.length > 0) await bulk(RefreshToken, rtDocs);
  console.log(`✓ ${rtDocs.length} tokens activos migrados (de ${rts.length} totales)`);

  // ── Resumen ───────────────────────────────────────────────────────────────
  const [uC, cC, aC, ttC, tC, oC, wC, rC, pmC] = await Promise.all([
    User.countDocuments(), Concert.countDocuments(), Artist.countDocuments(),
    TicketType.countDocuments(), Ticket.countDocuments(), Order.countDocuments(),
    WaitingList.countDocuments(), Review.countDocuments(),
    PaymentMethod.countDocuments(),
  ]);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅  MIGRACIÓN COMPLETADA EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Usuarios:                  ${uC}`);
  console.log(`  Artistas:                  ${aC}`);
  console.log(`  Conciertos:                ${cC}`);
  console.log(`  Tipos de boleta:           ${ttC}`);
  console.log(`  Boletas:                   ${tC}`);
  console.log(`  Órdenes:                   ${oC}`);
  console.log(`  Lista de espera:           ${wC}`);
  console.log(`  Reseñas:                   ${rC}`);
  console.log(`  Métodos de pago:           ${pmC}`);
  console.log('═══════════════════════════════════════════════\n');

  await pg.end();
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('\n✗ Error durante migración:', err.message);
  process.exit(1);
});
