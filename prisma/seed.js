require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
// Usar Google DNS para resolver registros SRV de MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Registrar plugin global (igual que en database.js)
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
} = require('../src/models');

let ticketCounter = 1;

async function createTickets(ticketTypeId, quantity, prefix) {
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const seatsPerRow = 14;
  const tickets = [];

  for (let i = 0; i < quantity; i++) {
    const rowIndex = Math.floor(i / seatsPerRow);
    const seatNum  = (i % seatsPerRow) + 1;
    const row      = rows[rowIndex % 26];
    const seatLabel = `${row}-${String(seatNum).padStart(2, '0')}`;
    const code      = String(ticketCounter).padStart(5, '0');

    tickets.push({
      ticketTypeId,
      status: 'AVAILABLE',
      row,
      seatLabel,
      ticketCode: `CON-2026-${code}`,
      qrCode: `QR-${prefix}-${code}`,
    });
    ticketCounter++;
  }

  await Ticket.insertMany(tickets);
}

async function clearDatabase() {
  await Promise.all([
    Review.deleteMany({}),
    WaitingList.deleteMany({}),
    Cart.deleteMany({}),
    Ticket.deleteMany({}),
    Order.deleteMany({}),
    TicketType.deleteMany({}),
    Concert.deleteMany({}),
    Artist.deleteMany({}),
    Venue.deleteMany({}),
    Notification.deleteMany({}),
    NotificationPreference.deleteMany({}),
    PaymentMethod.deleteMany({}),
    RefreshToken.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('Base de datos limpia.');
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI no definida en .env');

  await mongoose.connect(uri);
  console.log('MongoDB conectado para seed:', mongoose.connection.host);

  await clearDatabase();

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const [adminPass, samuelPass, mariaPass, pedroPass] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('samuel123', 10),
    bcrypt.hash('maria123', 10),
    bcrypt.hash('pedro123', 10),
  ]);

  await User.create({
    firstName: 'Admin',
    lastName:  'Concertix',
    email:     'admin@concertix.com',
    password:  adminPass,
    role:      'ADMIN',
    phone:     '3001234567',
    city:      'Bogotá',
  });

  const samuel = await User.create({
    firstName: 'Samuel',
    lastName:  'Rios',
    email:     'samuel@ejemplo.com',
    password:  samuelPass,
    phone:     '3109876543',
    birthDate: new Date('1999-05-15'),
    gender:    'Masculino',
    city:      'Cali, Valle del Cauca',
    document:  '1234567890',
  });

  const maria = await User.create({
    firstName: 'María',
    lastName:  'González',
    email:     'maria@ejemplo.com',
    password:  mariaPass,
    phone:     '3205551234',
    birthDate: new Date('1995-08-22'),
    gender:    'Femenino',
    city:      'Bogotá, Cundinamarca',
  });

  const pedro = await User.create({
    firstName: 'Pedro',
    lastName:  'Ramírez',
    email:     'pedro@ejemplo.com',
    password:  pedroPass,
    phone:     '3118889900',
    city:      'Medellín, Antioquia',
  });

  console.log('✓ Usuarios creados');

  // ── MÉTODOS DE PAGO ────────────────────────────────────────────────────────
  await PaymentMethod.insertMany([
    { userId: samuel._id, lastFour: '4242', brand: 'VISA',       expiryMonth: 8, expiryYear: 2027, isPrimary: false },
    { userId: samuel._id, lastFour: '8080', brand: 'MASTERCARD', expiryMonth: 3, expiryYear: 2028, isPrimary: true  },
  ]);

  // ── PREFERENCIAS DE NOTIFICACIÓN ──────────────────────────────────────────
  await NotificationPreference.insertMany([
    { userId: samuel._id },
    { userId: maria._id  },
  ]);

  console.log('✓ Métodos de pago y notificaciones creadas');

  // ── VENUES + SECCIONES ────────────────────────────────────────────────────
  const elCampin = await Venue.create({
    name: 'Estadio El Campín',
    address: 'Cra 30 # 57-60',
    city: 'Bogotá',
    sections: [
      { name: 'Palco Premium',   capacity: 300,  description: 'Zona exclusiva con mejor vista al escenario', color: '#8B5CF6' },
      { name: 'VIP Floor',       capacity: 1500, description: 'Zona VIP de pie frente al escenario',         color: '#3B82F6' },
      { name: 'General Piso',    capacity: 8000, description: 'Zona general en el campo',                    color: '#10B981' },
      { name: 'General Lateral', capacity: 6000, description: 'Tribunas laterales numeradas',                color: '#10B981' },
    ],
  });

  const movArena = await Venue.create({
    name: 'Movistar Arena',
    address: 'Cra 24 # 6-00',
    city: 'Bogotá',
    sections: [
      { name: 'Palco Premium', capacity: 200,  description: 'Palcos VIP con vista privilegiada',    color: '#8B5CF6' },
      { name: 'VIP Floor',     capacity: 800,  description: 'Zona VIP frente al escenario',         color: '#3B82F6' },
      { name: 'General',       capacity: 5000, description: 'Zona general con numeración',           color: '#10B981' },
    ],
  });

  const atanasio = await Venue.create({
    name: 'Estadio Atanasio Girardot',
    address: 'Cra 74 # 48-64',
    city: 'Medellín',
    sections: [
      { name: 'Palco Premium', capacity: 200,  description: 'Palco VIP con mejor ángulo al escenario', color: '#8B5CF6' },
      { name: 'Pista',         capacity: 3000, description: 'Zona de pie en la pista central',         color: '#3B82F6' },
      { name: 'General',       capacity: 5000, description: 'Sillas numeradas con buena vista',        color: '#10B981' },
    ],
  });

  const coliseoMed = await Venue.create({
    name: 'Centro de Eventos',
    address: 'Cra 43 # 18-00',
    city: 'Medellín',
    sections: [
      { name: 'Pista VIP',     capacity: 500,  description: 'Zona VIP en la pista',    color: '#3B82F6' },
      { name: 'Pista General', capacity: 3000, description: 'Zona de pie general',     color: '#10B981' },
    ],
  });

  const pascualGuerrero = await Venue.create({
    name: 'Estadio Pascual Guerrero',
    address: 'Calle 5 # 38-00',
    city: 'Cali',
    sections: [
      { name: 'VIP Floor', capacity: 600,  description: 'Zona VIP frente al escenario', color: '#3B82F6' },
      { name: 'General',   capacity: 4000, description: 'Zona general numerada',         color: '#10B981' },
    ],
  });

  console.log('✓ Venues y secciones creados');

  // Helper para encontrar sección por nombre
  const sec = (venue, name) => venue.sections.find((s) => s.name === name);

  // ── ARTISTAS ──────────────────────────────────────────────────────────────
  const [jbalvin, karolg, maluma, feid, badBunny, shakira] = await Promise.all([
    Artist.create({ name: 'J Balvin',  genres: ['Reggaeton', 'Pop', 'Urbano', 'Trap'],   bio: 'José Álvaro Osorio Balvín, pionero del reggaeton urbano colombiano con proyección mundial.' }),
    Artist.create({ name: 'Karol G',   genres: ['Reggaeton', 'Trap', 'Pop'],              bio: 'Carolina Giraldo Navarro, "La Bichota", reina global del reggaeton y el trap latino.' }),
    Artist.create({ name: 'Maluma',    genres: ['Reggaeton', 'Pop Urbano', 'Trap'],       bio: 'Juan Luis Londoño Arias, cantante y compositor colombiano de talla mundial.' }),
    Artist.create({ name: 'Feid',      genres: ['Reggaeton', 'Urbano', 'R&B'],            bio: 'Salomón Villada Hoyos, artista colombiano conocido como "El Ferxxo", fusiona reggaeton con R&B.' }),
    Artist.create({ name: 'Bad Bunny', genres: ['Reggaeton', 'Trap', 'Latin Pop'],        bio: 'Benito Antonio Martínez, el artista latino más escuchado del mundo, originario de Puerto Rico.' }),
    Artist.create({ name: 'Shakira',   genres: ['Pop', 'Rock', 'Latin'],                  bio: 'Shakira Isabel Mebarak Ripoll, cantante barranquillera de fama mundial e ícono global.' }),
  ]);

  console.log('✓ Artistas creados');

  // ── CONCIERTO 1: J Balvin - Rayo Tour (FEATURED) ─────────────────────────
  const c1 = await Concert.create({
    artistId: jbalvin._id,
    tourName: 'Rayo Tour Colombia 2026',
    description: 'J Balvin regresa a Colombia con su explosivo Rayo Tour 2026. Una noche de reggaeton, música urbana y producción única.',
    date: new Date('2026-06-28T20:00:00-05:00'),
    doorsOpenAt: new Date('2026-06-28T18:00:00-05:00'),
    endDate: new Date('2026-06-28T23:30:00-05:00'),
    status: 'PUBLISHED',
    isFeatured: true,
    venueId: elCampin._id,
    genres: ['Reggaeton', 'Pop', 'Urbano', 'Trap'],
    viewerCount: 847,
  });

  const c1General = await TicketType.create({
    concertId: c1._id,
    sectionId: sec(elCampin, 'General Piso')?._id,
    name: 'General',
    description: 'Zona general en el campo. Acceso estándar.',
    price: 220000,
    totalQuantity: 500,
    availableQuantity: 500,
    maxPerOrder: 8,
  });
  await createTickets(c1General._id, 500, 'C1G');

  const c1VIP = await TicketType.create({
    concertId: c1._id,
    sectionId: sec(elCampin, 'VIP Floor')?._id,
    name: 'VIP Floor',
    description: 'Zona VIP de pie frente al escenario con acceso preferencial.',
    price: 480000,
    totalQuantity: 150,
    availableQuantity: 30,
    maxPerOrder: 4,
  });
  await createTickets(c1VIP._id, 150, 'C1V');
  // Marcar todos como SOLD y luego solo 30 como AVAILABLE
  await Ticket.updateMany({ ticketTypeId: c1VIP._id }, { status: 'SOLD' });
  const c1VIPAvail = await Ticket.find({ ticketTypeId: c1VIP._id }).limit(30).select('_id');
  await Ticket.updateMany({ _id: { $in: c1VIPAvail.map((t) => t._id) } }, { status: 'AVAILABLE' });

  const c1Palco = await TicketType.create({
    concertId: c1._id,
    sectionId: sec(elCampin, 'Palco Premium')?._id,
    name: 'Palco Premium',
    description: 'Zona exclusiva con mejor vista. Incluye lounge privado y servicio personalizado.',
    price: 950000,
    totalQuantity: 50,
    availableQuantity: 3,
    maxPerOrder: 2,
  });
  await createTickets(c1Palco._id, 50, 'C1P');
  await Ticket.updateMany({ ticketTypeId: c1Palco._id }, { status: 'SOLD' });
  const c1PalcoAvail = await Ticket.find({ ticketTypeId: c1Palco._id }).limit(3).select('_id');
  await Ticket.updateMany({ _id: { $in: c1PalcoAvail.map((t) => t._id) } }, { status: 'AVAILABLE' });

  console.log('✓ Concierto 1 creado (J Balvin - FEATURED)');

  // ── CONCIERTO 2: Karol G - Mañana Será Bonito Tour ───────────────────────
  const c2 = await Concert.create({
    artistId: karolg._id,
    tourName: 'Mañana Será Bonito Tour',
    description: 'La Bichota llega a Bogotá con el show más esperado del año. Un espectáculo visual y musical de talla mundial.',
    date: new Date('2026-07-22T20:00:00-05:00'),
    doorsOpenAt: new Date('2026-07-22T18:00:00-05:00'),
    endDate: new Date('2026-07-22T23:45:00-05:00'),
    status: 'PUBLISHED',
    isFeatured: false,
    venueId: movArena._id,
    genres: ['Reggaeton', 'Trap', 'Pop'],
    viewerCount: 312,
  });

  const c2General = await TicketType.create({
    concertId: c2._id, sectionId: sec(movArena, 'General')?._id,
    name: 'General', price: 280000, totalQuantity: 600, availableQuantity: 600, maxPerOrder: 8,
  });
  await createTickets(c2General._id, 600, 'C2G');

  const c2VIP = await TicketType.create({
    concertId: c2._id, sectionId: sec(movArena, 'VIP Floor')?._id,
    name: 'VIP Floor', price: 520000, totalQuantity: 200, availableQuantity: 200, maxPerOrder: 4,
  });
  await createTickets(c2VIP._id, 200, 'C2V');

  const c2Palco = await TicketType.create({
    concertId: c2._id, sectionId: sec(movArena, 'Palco Premium')?._id,
    name: 'Palco Premium', price: 890000, totalQuantity: 60, availableQuantity: 60, maxPerOrder: 2,
  });
  await createTickets(c2Palco._id, 60, 'C2P');

  console.log('✓ Concierto 2 creado (Karol G)');

  // ── CONCIERTO 3: Maluma - Don Juan Tour ──────────────────────────────────
  const c3 = await Concert.create({
    artistId: maluma._id,
    tourName: 'Don Juan Tour',
    description: 'Maluma regresa a Colombia con su Don Juan Tour. Una noche de éxitos, bailoteo y el mejor reggaeton colombiano.',
    date: new Date('2026-08-08T21:00:00-05:00'),
    doorsOpenAt: new Date('2026-08-08T19:00:00-05:00'),
    endDate: new Date('2026-08-09T00:30:00-05:00'),
    status: 'PUBLISHED',
    isFeatured: false,
    venueId: atanasio._id,
    genres: ['Reggaeton', 'Pop Urbano', 'Trap'],
    viewerCount: 203,
  });

  const c3General = await TicketType.create({
    concertId: c3._id, sectionId: sec(atanasio, 'General')?._id,
    name: 'General', price: 320000, totalQuantity: 500, availableQuantity: 500, maxPerOrder: 8,
  });
  await createTickets(c3General._id, 500, 'C3G');

  const c3Pista = await TicketType.create({
    concertId: c3._id, sectionId: sec(atanasio, 'Pista')?._id,
    name: 'Pista', price: 480000, totalQuantity: 200, availableQuantity: 200, maxPerOrder: 4,
  });
  await createTickets(c3Pista._id, 200, 'C3P');

  const c3Palco = await TicketType.create({
    concertId: c3._id, sectionId: sec(atanasio, 'Palco Premium')?._id,
    name: 'Palco Premium', price: 750000, totalQuantity: 50, availableQuantity: 50, maxPerOrder: 2,
  });
  await createTickets(c3Palco._id, 50, 'C3L');

  console.log('✓ Concierto 3 creado (Maluma)');

  // ── CONCIERTO 4: Feid - Mar Tour Colombia 2026 ───────────────────────────
  const c4 = await Concert.create({
    artistId: feid._id,
    tourName: 'Mar Tour Colombia 2026',
    description: 'El Ferxxo desembarca en Medellín con su Mar Tour. Una experiencia musical inmersiva que fusiona reggaeton, R&B y urbano.',
    date: new Date('2026-08-15T20:00:00-05:00'),
    doorsOpenAt: new Date('2026-08-15T18:30:00-05:00'),
    endDate: new Date('2026-08-15T23:00:00-05:00'),
    status: 'PUBLISHED',
    isFeatured: false,
    venueId: coliseoMed._id,
    genres: ['Reggaeton', 'Urbano', 'R&B'],
    viewerCount: 156,
  });

  const c4Pista = await TicketType.create({
    concertId: c4._id, sectionId: sec(coliseoMed, 'Pista General')?._id,
    name: 'Pista', price: 200000, totalQuantity: 400, availableQuantity: 400, maxPerOrder: 8,
  });
  await createTickets(c4Pista._id, 400, 'C4P');

  const c4VIP = await TicketType.create({
    concertId: c4._id, sectionId: sec(coliseoMed, 'Pista VIP')?._id,
    name: 'VIP', price: 380000, totalQuantity: 150, availableQuantity: 150, maxPerOrder: 4,
  });
  await createTickets(c4VIP._id, 150, 'C4V');

  console.log('✓ Concierto 4 creado (Feid)');

  // ── CONCIERTO 5: Bad Bunny (FEATURED) ────────────────────────────────────
  const c5 = await Concert.create({
    artistId: badBunny._id,
    tourName: 'Nadie Sabe Lo Que Va a Pasar Mañana Tour',
    description: 'El artista más escuchado del mundo llega a Colombia. Bad Bunny presenta su tour mundial con producción de nivel internacional.',
    date: new Date('2026-09-20T20:00:00-05:00'),
    doorsOpenAt: new Date('2026-09-20T18:00:00-05:00'),
    endDate: new Date('2026-09-20T23:30:00-05:00'),
    status: 'PUBLISHED',
    isFeatured: true,
    venueId: elCampin._id,
    genres: ['Reggaeton', 'Trap', 'Latin Pop'],
    viewerCount: 1247,
  });

  const c5General = await TicketType.create({
    concertId: c5._id, sectionId: sec(elCampin, 'General Piso')?._id,
    name: 'General', price: 350000, totalQuantity: 600, availableQuantity: 600, maxPerOrder: 8,
  });
  await createTickets(c5General._id, 600, 'C5G');

  const c5VIP = await TicketType.create({
    concertId: c5._id, sectionId: sec(elCampin, 'VIP Floor')?._id,
    name: 'VIP Floor', price: 650000, totalQuantity: 200, availableQuantity: 200, maxPerOrder: 4,
  });
  await createTickets(c5VIP._id, 200, 'C5V');

  const c5Palco = await TicketType.create({
    concertId: c5._id, sectionId: sec(elCampin, 'Palco Premium')?._id,
    name: 'Palco Premium', price: 1200000, totalQuantity: 50, availableQuantity: 50, maxPerOrder: 2,
  });
  await createTickets(c5Palco._id, 50, 'C5P');

  console.log('✓ Concierto 5 creado (Bad Bunny)');

  // ── CONCIERTO 6: Shakira - AGOTADO ───────────────────────────────────────
  const c6 = await Concert.create({
    artistId: shakira._id,
    tourName: 'Las Mujeres Ya No Lloran World Tour',
    description: 'La artista colombiana más exitosa de la historia regresa con su tour mundial. Un show sin precedentes que marcará la historia de Colombia.',
    date: new Date('2026-10-10T20:00:00-05:00'),
    doorsOpenAt: new Date('2026-10-10T18:00:00-05:00'),
    endDate: new Date('2026-10-10T23:30:00-05:00'),
    status: 'SOLD_OUT',
    isFeatured: false,
    venueId: elCampin._id,
    genres: ['Pop', 'Rock', 'Latin'],
    viewerCount: 4521,
  });

  const c6General = await TicketType.create({
    concertId: c6._id, sectionId: sec(elCampin, 'General Piso')?._id,
    name: 'General', price: 280000, totalQuantity: 800, availableQuantity: 0, maxPerOrder: 8,
  });
  await createTickets(c6General._id, 800, 'C6G');
  await Ticket.updateMany({ ticketTypeId: c6General._id }, { status: 'SOLD' });

  const c6VIP = await TicketType.create({
    concertId: c6._id, sectionId: sec(elCampin, 'VIP Floor')?._id,
    name: 'VIP Floor', price: 550000, totalQuantity: 200, availableQuantity: 0, maxPerOrder: 4,
  });
  await createTickets(c6VIP._id, 200, 'C6V');
  await Ticket.updateMany({ ticketTypeId: c6VIP._id }, { status: 'SOLD' });

  console.log('✓ Concierto 6 creado (Shakira - SOLD_OUT)');

  // ── CONCIERTO 7: Karol G - Cali (COMPLETADO) ─────────────────────────────
  const c7 = await Concert.create({
    artistId: karolg._id,
    tourName: 'Mañana Será Bonito Tour',
    description: 'Karol G en Cali. Un show histórico en el Estadio Pascual Guerrero.',
    date: new Date('2025-04-10T19:30:00-05:00'),
    doorsOpenAt: new Date('2025-04-10T18:00:00-05:00'),
    status: 'COMPLETED',
    isFeatured: false,
    venueId: pascualGuerrero._id,
    genres: ['Reggaeton', 'Trap', 'Pop'],
    viewerCount: 0,
  });

  const c7VIP = await TicketType.create({
    concertId: c7._id, sectionId: sec(pascualGuerrero, 'VIP Floor')?._id,
    name: 'VIP Floor', price: 450000, totalQuantity: 200, availableQuantity: 0, maxPerOrder: 4,
  });
  await createTickets(c7VIP._id, 200, 'C7V');
  await Ticket.updateMany({ ticketTypeId: c7VIP._id }, { status: 'SOLD' });

  const c7General = await TicketType.create({
    concertId: c7._id, sectionId: sec(pascualGuerrero, 'General')?._id,
    name: 'General', price: 220000, totalQuantity: 400, availableQuantity: 0, maxPerOrder: 8,
  });
  await createTickets(c7General._id, 400, 'C7G');
  await Ticket.updateMany({ ticketTypeId: c7General._id }, { status: 'SOLD' });

  console.log('✓ Concierto 7 creado (Karol G Cali - COMPLETADO)');

  // ── ÓRDENES DE EJEMPLO ────────────────────────────────────────────────────

  // Samuel compra 2 boletas General para J Balvin
  const samuelTicketsDocs = await Ticket.find({ ticketTypeId: c1General._id, status: 'AVAILABLE' }).limit(2);
  const samuelOrder = await Order.create({
    userId: samuel._id,
    subtotal: 2 * c1General.price,
    serviceFee: 2 * c1General.price * 0.1,
    insurance:  2 * c1General.price * 0.03,
    totalAmount: 2 * c1General.price * 1.13,
    status: 'CONFIRMED',
    paymentMethod: 'CARD',
    items: [{ ticketTypeId: c1General._id, quantity: 2, unitPrice: c1General.price }],
  });
  await Ticket.updateMany(
    { _id: { $in: samuelTicketsDocs.map((t) => t._id) } },
    { status: 'SOLD', userId: samuel._id, orderId: samuelOrder._id }
  );
  await TicketType.findByIdAndUpdate(c1General._id, { $inc: { availableQuantity: -2 } });

  // María compra 1 VIP Floor para Karol G
  const mariaTicketsDocs = await Ticket.find({ ticketTypeId: c2VIP._id, status: 'AVAILABLE' }).limit(1);
  const mariaOrder = await Order.create({
    userId: maria._id,
    subtotal: c2VIP.price,
    serviceFee: c2VIP.price * 0.1,
    insurance:  c2VIP.price * 0.03,
    totalAmount: c2VIP.price * 1.13,
    status: 'CONFIRMED',
    paymentMethod: 'CARD',
    items: [{ ticketTypeId: c2VIP._id, quantity: 1, unitPrice: c2VIP.price }],
  });
  await Ticket.updateMany(
    { _id: { $in: mariaTicketsDocs.map((t) => t._id) } },
    { status: 'SOLD', userId: maria._id, orderId: mariaOrder._id }
  );
  await TicketType.findByIdAndUpdate(c2VIP._id, { $inc: { availableQuantity: -1 } });

  console.log('✓ Órdenes creadas');

  // ── LISTA DE ESPERA ───────────────────────────────────────────────────────
  await WaitingList.insertMany([
    { userId: maria._id,   concertId: c6._id, ticketTypeId: c6General._id, quantity: 2, position: 1 },
    { userId: pedro._id,   concertId: c6._id, ticketTypeId: c6VIP._id,     quantity: 1, position: 1 },
    { userId: samuel._id,  concertId: c6._id, ticketTypeId: c6General._id, quantity: 4, position: 2 },
  ]);
  console.log('✓ Lista de espera creada');

  // ── RESEÑAS ───────────────────────────────────────────────────────────────
  await Review.insertMany([
    { userId: samuel._id, concertId: c7._id, rating: 5, comment: 'Karol G en Cali fue una experiencia de otro mundo. La producción, el sonido, el ambiente... todo 10/10.' },
    { userId: maria._id,  concertId: c1._id, rating: 5, comment: 'J Balvin no defrauda. El show fue espectacular, cada detalle cuidado al máximo.' },
    { userId: pedro._id,  concertId: c3._id, rating: 4, comment: 'Maluma estuvo increíble. El Atanasio lleno y una energía única.' },
  ]);
  console.log('✓ Reseñas creadas');

  // ── CARRITO DE EJEMPLO ────────────────────────────────────────────────────
  await Cart.create({
    userId: pedro._id,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    items: [{ ticketTypeId: c3General._id, quantity: 2 }],
  });
  console.log('✓ Carrito de ejemplo creado');

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  const [uCount, cCount, aCount, ttCount, tCount, oCount] = await Promise.all([
    User.countDocuments(),
    Concert.countDocuments(),
    Artist.countDocuments(),
    TicketType.countDocuments(),
    Ticket.countDocuments(),
    Order.countDocuments(),
  ]);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅  SEED COMPLETADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════');
  console.log(`  Usuarios:       ${uCount}`);
  console.log(`  Conciertos:     ${cCount}`);
  console.log(`  Artistas:       ${aCount}`);
  console.log(`  Tipos boleta:   ${ttCount}`);
  console.log(`  Boletas:        ${tCount}`);
  console.log(`  Órdenes:        ${oCount}`);
  console.log('───────────────────────────────────────');
  console.log('  Credenciales de prueba:');
  console.log('  ADMIN  → admin@concertix.com  / admin123');
  console.log('  USER   → samuel@ejemplo.com   / samuel123');
  console.log('  USER   → maria@ejemplo.com    / maria123');
  console.log('  USER   → pedro@ejemplo.com    / pedro123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('Error en seed:', e); process.exit(1); })
  .finally(() => mongoose.disconnect());
