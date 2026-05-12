const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Genera N boletas individuales con QR únicos para un TicketType
async function createTickets(ticketTypeId, quantity, prefix) {
  const tickets = Array.from({ length: quantity }, (_, i) => ({
    ticketTypeId,
    status: 'AVAILABLE',
    qrCode: `${prefix}-${ticketTypeId}-${String(i + 1).padStart(5, '0')}`,
  }));
  await prisma.ticket.createMany({ data: tickets });
}

async function clearDatabase() {
  await prisma.review.deleteMany({});
  await prisma.waitingList.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.ticketType.deleteMany({});
  await prisma.eventArtist.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.artist.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Base de datos limpia.');
}

async function main() {
  await clearDatabase();

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const [adminPass, carlosPass, mariaPass, pedroPass] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('carlos123', 10),
    bcrypt.hash('maria123', 10),
    bcrypt.hash('pedro123', 10),
  ]);

  await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@ticketmaster.com', password: adminPass, role: 'ADMIN', phone: '3001234567' },
  });

  const carlos = await prisma.user.create({
    data: { name: 'Carlos Pérez', email: 'carlos@ejemplo.com', password: carlosPass, phone: '3109876543' },
  });

  const maria = await prisma.user.create({
    data: { name: 'María González', email: 'maria@ejemplo.com', password: mariaPass, phone: '3205551234' },
  });

  const pedro = await prisma.user.create({
    data: { name: 'Pedro Ramírez', email: 'pedro@ejemplo.com', password: pedroPass, phone: '3118889900' },
  });

  console.log('✓ Usuarios creados');

  // ── CATEGORÍAS ────────────────────────────────────────────────────────────
  const [catConciertos, catDeportes, catTeatro] = await Promise.all([
    prisma.category.create({ data: { name: 'Conciertos', slug: 'conciertos', icon: '🎵' } }),
    prisma.category.create({ data: { name: 'Deportes', slug: 'deportes', icon: '⚽' } }),
    prisma.category.create({ data: { name: 'Teatro y Cultura', slug: 'teatro', icon: '🎭' } }),
    prisma.category.create({ data: { name: 'Festivales', slug: 'festivales', icon: '🎪' } }),
  ]);

  console.log('✓ Categorías creadas');

  // ── VENUES + SECCIONES ────────────────────────────────────────────────────
  const movArena = await prisma.venue.create({
    data: {
      name: 'Movistar Arena',
      address: 'Cra 24 # 6-00',
      city: 'Bogotá',
      latitude: 4.6247,
      longitude: -74.0906,
      sections: {
        create: [
          { name: 'Golden Ring', capacity: 200, description: 'Zona VIP frente al escenario con open bar' },
          { name: 'Floor General', capacity: 3000, description: 'Zona de pie con vista directa al escenario' },
          { name: 'Tribuna Norte', capacity: 2500, description: 'Sillas numeradas vista lateral norte' },
          { name: 'Tribuna Sur', capacity: 2500, description: 'Sillas numeradas vista lateral sur' },
        ],
      },
    },
    include: { sections: true },
  });

  const elCampin = await prisma.venue.create({
    data: {
      name: 'Estadio El Campín',
      address: 'Cra 30 # 57-60',
      city: 'Bogotá',
      latitude: 4.6455,
      longitude: -74.0774,
      sections: {
        create: [
          { name: 'Palco Piso', capacity: 500, description: 'Campo VIP con vista privilegiada al escenario' },
          { name: 'Occidental Baja', capacity: 8000, description: 'Tribuna occidental inferior numerada' },
          { name: 'Occidental Alta', capacity: 10000, description: 'Tribuna occidental superior numerada' },
          { name: 'Sur General', capacity: 6000, description: 'Tribuna sur popular sin numerar' },
        ],
      },
    },
    include: { sections: true },
  });

  const atanasio = await prisma.venue.create({
    data: {
      name: 'Estadio Atanasio Girardot',
      address: 'Cra 74 # 48-64',
      city: 'Medellín',
      latitude: 6.2559,
      longitude: -75.5913,
      sections: {
        create: [
          { name: 'VIP Oriental', capacity: 300, description: 'Palco VIP con mejor ángulo al escenario' },
          { name: 'General Numerada', capacity: 5000, description: 'Sillas numeradas con buena vista' },
          { name: 'Barra Popular', capacity: 3000, description: 'Zona de pie sin numerar' },
        ],
      },
    },
    include: { sections: true },
  });

  const teatroMet = await prisma.venue.create({
    data: {
      name: 'Teatro Metropolitano',
      address: 'Calle 41 # 57-30',
      city: 'Medellín',
      latitude: 6.2527,
      longitude: -75.5683,
      sections: {
        create: [
          { name: 'Platea Principal', capacity: 600, description: 'Platea en nivel de escenario' },
          { name: 'Balcón', capacity: 300, description: 'Planta alta con vista panorámica' },
          { name: 'Palco Lateral', capacity: 100, description: 'Palcos privados laterales' },
        ],
      },
    },
    include: { sections: true },
  });

  console.log('✓ Venues y secciones creados');

  // Helper para obtener sección por nombre
  const sec = (venue, name) => venue.sections.find((s) => s.name === name);

  // ── ARTISTAS ──────────────────────────────────────────────────────────────
  const [maluma, jbalvin, karolg, carlosVives, fonseca, shakira] = await Promise.all([
    prisma.artist.create({ data: { name: 'Maluma', genre: 'Reggaeton / Pop urbano', bio: 'Juan Luis Londoño Arias, cantante y compositor colombiano de talla mundial.' } }),
    prisma.artist.create({ data: { name: 'J Balvin', genre: 'Reggaeton / Urban', bio: 'José Álvaro Osorio Balvín, pionero del reggaeton urbano colombiano.' } }),
    prisma.artist.create({ data: { name: 'Karol G', genre: 'Reggaeton / Trap', bio: 'Carolina Giraldo Navarro, "La Bichota", reina global del reggaeton.' } }),
    prisma.artist.create({ data: { name: 'Carlos Vives', genre: 'Vallenato / Pop', bio: 'Cantante y compositor colombiano, embajador del vallenato moderno. Ganador de Grammy.' } }),
    prisma.artist.create({ data: { name: 'Fonseca', genre: 'Pop / Tropical', bio: 'Santiago Fonseca, cantautor colombiano de pop, vallenato y ritmos tropicales.' } }),
    prisma.artist.create({ data: { name: 'Shakira', genre: 'Pop / Rock', bio: 'Shakira Isabel Mebarak Ripoll, cantante barranquillera de fama mundial.' } }),
  ]);

  console.log('✓ Artistas creados');

  // ── EVENTOS ───────────────────────────────────────────────────────────────

  // EVENTO 1: Maluma - Movistar Arena
  const event1 = await prisma.event.create({
    data: {
      name: 'Maluma - Noche de Estrellas Tour 2026',
      description: 'El rey del reggaeton colombiano regresa a Bogotá con su nuevo tour. Prepárate para una noche llena de éxitos, sorpresas y el mejor entretenimiento.',
      date: new Date('2026-07-20T20:00:00-05:00'),
      endDate: new Date('2026-07-20T23:30:00-05:00'),
      status: 'PUBLISHED',
      venueId: movArena.id,
      categoryId: catConciertos.id,
      artists: {
        create: [
          { artistId: maluma.id, headliner: true, order: 1 },
          { artistId: fonseca.id, headliner: false, order: 2 },
        ],
      },
    },
  });

  const e1Golden = await prisma.ticketType.create({
    data: {
      eventId: event1.id,
      sectionId: sec(movArena, 'Golden Ring')?.id,
      name: 'Golden Ring VIP',
      description: 'Zona exclusiva frente al escenario. Incluye open bar, acceso preferencial y kit de bienvenida.',
      price: 650000,
      totalQuantity: 100,
      availableQuantity: 100,
      maxPerOrder: 4,
    },
  });
  await createTickets(e1Golden.id, 100, 'GR');

  const e1Floor = await prisma.ticketType.create({
    data: {
      eventId: event1.id,
      sectionId: sec(movArena, 'Floor General')?.id,
      name: 'Floor General',
      description: 'Zona de pie con vista directa al escenario. El corazón del evento.',
      price: 350000,
      totalQuantity: 500,
      availableQuantity: 500,
      maxPerOrder: 6,
    },
  });
  await createTickets(e1Floor.id, 500, 'FL');

  const e1Tribuna = await prisma.ticketType.create({
    data: {
      eventId: event1.id,
      sectionId: sec(movArena, 'Tribuna Norte')?.id,
      name: 'Tribuna',
      description: 'Sillas numeradas con excelente vista al escenario.',
      price: 180000,
      totalQuantity: 800,
      availableQuantity: 800,
      maxPerOrder: 8,
    },
  });
  await createTickets(e1Tribuna.id, 800, 'TR');

  console.log('✓ Evento 1 creado (Maluma)');

  // EVENTO 2: Karol G - El Campín
  const event2 = await prisma.event.create({
    data: {
      name: 'Karol G - Mañana Será Bonito Tour',
      description: 'La Bichota llena el Estadio El Campín con el show más esperado del año. Un espectáculo de talla mundial que marcará historia.',
      date: new Date('2026-11-14T20:00:00-05:00'),
      endDate: new Date('2026-11-14T23:45:00-05:00'),
      status: 'PUBLISHED',
      venueId: elCampin.id,
      categoryId: catConciertos.id,
      artists: {
        create: [
          { artistId: karolg.id, headliner: true, order: 1 },
          { artistId: jbalvin.id, headliner: false, order: 2 },
        ],
      },
    },
  });

  const e2Palco = await prisma.ticketType.create({
    data: {
      eventId: event2.id,
      sectionId: sec(elCampin, 'Palco Piso')?.id,
      name: 'Palco Piso Platinum',
      description: 'Zona campo premium con vista privilegiada. Incluye acceso al área de artistas.',
      price: 850000,
      totalQuantity: 200,
      availableQuantity: 200,
      maxPerOrder: 4,
    },
  });
  await createTickets(e2Palco.id, 200, 'PP');

  const e2OccBaja = await prisma.ticketType.create({
    data: {
      eventId: event2.id,
      sectionId: sec(elCampin, 'Occidental Baja')?.id,
      name: 'Occidental Baja',
      description: 'Sillas numeradas en tribuna baja. Vista frontal perfecta.',
      price: 250000,
      totalQuantity: 600,
      availableQuantity: 600,
      maxPerOrder: 6,
    },
  });
  await createTickets(e2OccBaja.id, 600, 'OB');

  const e2Sur = await prisma.ticketType.create({
    data: {
      eventId: event2.id,
      sectionId: sec(elCampin, 'Sur General')?.id,
      name: 'Sur General',
      description: 'Zona general sin numerar. Ambiente y vibra únicos.',
      price: 120000,
      totalQuantity: 500,
      availableQuantity: 500,
      maxPerOrder: 8,
    },
  });
  await createTickets(e2Sur.id, 500, 'SG');

  console.log('✓ Evento 2 creado (Karol G)');

  // EVENTO 3: Colombia vs Brasil - Eliminatorias
  const event3 = await prisma.event.create({
    data: {
      name: 'Colombia vs Brasil - Eliminatorias FIFA 2030',
      description: 'La Selección Colombia recibe al gigante Brasil en partido crucial de eliminatorias camino al Mundial 2030. ¡Vístete de amarillo!',
      date: new Date('2026-09-05T20:00:00-05:00'),
      endDate: new Date('2026-09-05T22:00:00-05:00'),
      status: 'PUBLISHED',
      venueId: elCampin.id,
      categoryId: catDeportes.id,
    },
  });

  const e3Palco = await prisma.ticketType.create({
    data: {
      eventId: event3.id,
      sectionId: sec(elCampin, 'Palco Piso')?.id,
      name: 'Palco VIP',
      description: 'Zona campo VIP con sillas premium y servicio personalizado.',
      price: 450000,
      totalQuantity: 150,
      availableQuantity: 150,
      maxPerOrder: 4,
    },
  });
  await createTickets(e3Palco.id, 150, 'PV');

  const e3OccAlta = await prisma.ticketType.create({
    data: {
      eventId: event3.id,
      sectionId: sec(elCampin, 'Occidental Alta')?.id,
      name: 'Occidental Alta',
      description: 'Sillas numeradas tribuna alta con vista panorámica al campo.',
      price: 180000,
      totalQuantity: 700,
      availableQuantity: 700,
      maxPerOrder: 6,
    },
  });
  await createTickets(e3OccAlta.id, 700, 'OA');

  const e3Sur = await prisma.ticketType.create({
    data: {
      eventId: event3.id,
      sectionId: sec(elCampin, 'Sur General')?.id,
      name: 'Sur General',
      description: 'Zona de hinchada. El ambiente más caliente del estadio.',
      price: 80000,
      totalQuantity: 500,
      availableQuantity: 500,
      maxPerOrder: 8,
    },
  });
  await createTickets(e3Sur.id, 500, 'SG3');

  console.log('✓ Evento 3 creado (Colombia vs Brasil)');

  // EVENTO 4: Carlos Vives - Medellín
  const event4 = await prisma.event.create({
    data: {
      name: 'Carlos Vives - La Tierra del Olvido 30 Años',
      description: '30 años del álbum más icónico del vallenato moderno. Una celebración única con Carlos Vives y sus músicos originales.',
      date: new Date('2026-08-22T19:00:00-05:00'),
      endDate: new Date('2026-08-22T22:30:00-05:00'),
      status: 'PUBLISHED',
      venueId: atanasio.id,
      categoryId: catConciertos.id,
      artists: {
        create: [
          { artistId: carlosVives.id, headliner: true, order: 1 },
          { artistId: fonseca.id, headliner: false, order: 2 },
        ],
      },
    },
  });

  const e4VIP = await prisma.ticketType.create({
    data: {
      eventId: event4.id,
      sectionId: sec(atanasio, 'VIP Oriental')?.id,
      name: 'VIP Oriental',
      description: 'Palco VIP con el mejor ángulo del show. Incluye meet & greet.',
      price: 550000,
      totalQuantity: 80,
      availableQuantity: 80,
      maxPerOrder: 4,
    },
  });
  await createTickets(e4VIP.id, 80, 'VO');

  const e4General = await prisma.ticketType.create({
    data: {
      eventId: event4.id,
      sectionId: sec(atanasio, 'General Numerada')?.id,
      name: 'General Numerada',
      description: 'Sillas numeradas con excelente visibilidad.',
      price: 220000,
      totalQuantity: 400,
      availableQuantity: 400,
      maxPerOrder: 6,
    },
  });
  await createTickets(e4General.id, 400, 'GN');

  const e4Barra = await prisma.ticketType.create({
    data: {
      eventId: event4.id,
      sectionId: sec(atanasio, 'Barra Popular')?.id,
      name: 'Barra Popular',
      description: 'Zona de pie. El sabor y la tradición en su máxima expresión.',
      price: 110000,
      totalQuantity: 300,
      availableQuantity: 300,
      maxPerOrder: 8,
    },
  });
  await createTickets(e4Barra.id, 300, 'BP');

  console.log('✓ Evento 4 creado (Carlos Vives)');

  // EVENTO 5: Shakira - El Campín (AGOTADO — ejemplo de waiting list)
  const event5 = await prisma.event.create({
    data: {
      name: 'Shakira - Las Mujeres Ya No Lloran World Tour',
      description: 'La artista colombiana más exitosa de la historia regresa a Colombia en una gira mundial sin precedentes.',
      date: new Date('2026-10-03T20:00:00-05:00'),
      endDate: new Date('2026-10-03T23:30:00-05:00'),
      status: 'SOLD_OUT',
      venueId: elCampin.id,
      categoryId: catConciertos.id,
      artists: {
        create: [{ artistId: shakira.id, headliner: true, order: 1 }],
      },
    },
  });

  const e5VIP = await prisma.ticketType.create({
    data: {
      eventId: event5.id,
      sectionId: sec(elCampin, 'Palco Piso')?.id,
      name: 'Palco Piso VIP',
      price: 1200000,
      totalQuantity: 200,
      availableQuantity: 0,
      maxPerOrder: 2,
    },
  });
  await createTickets(e5VIP.id, 200, 'SVP');
  await prisma.ticket.updateMany({ where: { ticketTypeId: e5VIP.id }, data: { status: 'SOLD' } });

  const e5Floor = await prisma.ticketType.create({
    data: {
      eventId: event5.id,
      sectionId: sec(elCampin, 'Occidental Baja')?.id,
      name: 'Occidental Baja',
      price: 550000,
      totalQuantity: 500,
      availableQuantity: 0,
      maxPerOrder: 4,
    },
  });
  await createTickets(e5Floor.id, 500, 'SFL');
  await prisma.ticket.updateMany({ where: { ticketTypeId: e5Floor.id }, data: { status: 'SOLD' } });

  const e5Sur = await prisma.ticketType.create({
    data: {
      eventId: event5.id,
      sectionId: sec(elCampin, 'Sur General')?.id,
      name: 'Sur General',
      price: 280000,
      totalQuantity: 600,
      availableQuantity: 0,
      maxPerOrder: 6,
    },
  });
  await createTickets(e5Sur.id, 600, 'SSG');
  await prisma.ticket.updateMany({ where: { ticketTypeId: e5Sur.id }, data: { status: 'SOLD' } });

  console.log('✓ Evento 5 creado (Shakira - AGOTADO)');

  // EVENTO 6: Teatro - Temporada de Ópera (Teatro Metropolitano)
  const event6 = await prisma.event.create({
    data: {
      name: 'Ópera Carmen - Temporada 2026',
      description: 'La ópera más apasionante del repertorio universal llega al Teatro Metropolitano en una producción de clase mundial.',
      date: new Date('2026-06-12T19:30:00-05:00'),
      endDate: new Date('2026-06-12T22:30:00-05:00'),
      status: 'PUBLISHED',
      venueId: teatroMet.id,
      categoryId: catTeatro.id,
    },
  });

  const e6Platea = await prisma.ticketType.create({
    data: {
      eventId: event6.id,
      sectionId: sec(teatroMet, 'Platea Principal')?.id,
      name: 'Platea Principal',
      description: 'Sillas en planta baja con la mejor acústica del teatro.',
      price: 320000,
      totalQuantity: 200,
      availableQuantity: 200,
      maxPerOrder: 4,
    },
  });
  await createTickets(e6Platea.id, 200, 'TP');

  const e6Balcon = await prisma.ticketType.create({
    data: {
      eventId: event6.id,
      sectionId: sec(teatroMet, 'Balcón')?.id,
      name: 'Balcón',
      description: 'Vista panorámica desde la planta alta.',
      price: 180000,
      totalQuantity: 150,
      availableQuantity: 150,
      maxPerOrder: 4,
    },
  });
  await createTickets(e6Balcon.id, 150, 'TB');

  const e6Palco = await prisma.ticketType.create({
    data: {
      eventId: event6.id,
      sectionId: sec(teatroMet, 'Palco Lateral')?.id,
      name: 'Palco Privado',
      description: 'Palcos privados para grupos de hasta 4 personas con servicio exclusivo.',
      price: 450000,
      totalQuantity: 40,
      availableQuantity: 40,
      maxPerOrder: 4,
    },
  });
  await createTickets(e6Palco.id, 40, 'TPL');

  console.log('✓ Evento 6 creado (Ópera Carmen)');

  // ── ÓRDENES DE EJEMPLO ────────────────────────────────────────────────────

  // Carlos compra 2 boletas Floor para Maluma
  const carlosTickets = await prisma.ticket.findMany({
    where: { ticketTypeId: e1Floor.id, status: 'AVAILABLE' },
    take: 2,
  });
  await prisma.order.create({
    data: {
      userId: carlos.id,
      totalAmount: 2 * e1Floor.price,
      status: 'CONFIRMED',
      items: {
        create: [{ ticketTypeId: e1Floor.id, quantity: 2, unitPrice: e1Floor.price }],
      },
      tickets: { connect: carlosTickets.map((t) => ({ id: t.id })) },
    },
  });
  await prisma.ticket.updateMany({
    where: { id: { in: carlosTickets.map((t) => t.id) } },
    data: { status: 'SOLD' },
  });
  await prisma.ticketType.update({
    where: { id: e1Floor.id },
    data: { availableQuantity: { decrement: 2 } },
  });

  // María compra 1 Palco VIP para Colombia vs Brasil
  const mariaTickets = await prisma.ticket.findMany({
    where: { ticketTypeId: e3Palco.id, status: 'AVAILABLE' },
    take: 1,
  });
  await prisma.order.create({
    data: {
      userId: maria.id,
      totalAmount: 1 * e3Palco.price,
      status: 'CONFIRMED',
      items: {
        create: [{ ticketTypeId: e3Palco.id, quantity: 1, unitPrice: e3Palco.price }],
      },
      tickets: { connect: mariaTickets.map((t) => ({ id: t.id })) },
    },
  });
  await prisma.ticket.updateMany({
    where: { id: { in: mariaTickets.map((t) => t.id) } },
    data: { status: 'SOLD' },
  });
  await prisma.ticketType.update({
    where: { id: e3Palco.id },
    data: { availableQuantity: { decrement: 1 } },
  });

  // Pedro tiene una orden pendiente (puso en carrito, no confirmó)
  await prisma.order.create({
    data: {
      userId: pedro.id,
      totalAmount: 3 * e2Sur.price,
      status: 'PENDING',
      items: {
        create: [{ ticketTypeId: e2Sur.id, quantity: 3, unitPrice: e2Sur.price }],
      },
    },
  });

  console.log('✓ Órdenes creadas');

  // ── LISTA DE ESPERA ────────────────────────────────────────────────────────
  await prisma.waitingList.createMany({
    data: [
      { userId: maria.id, ticketTypeId: e5Floor.id, quantity: 2, position: 1 },
      { userId: pedro.id, ticketTypeId: e5VIP.id, quantity: 1, position: 1 },
      { userId: carlos.id, ticketTypeId: e5Sur.id, quantity: 4, position: 1 },
    ],
  });
  console.log('✓ Listas de espera creadas');

  // ── RESEÑAS ───────────────────────────────────────────────────────────────
  await prisma.review.createMany({
    data: [
      { userId: carlos.id, eventId: event1.id, rating: 5, comment: '¡Increíble show! Maluma superó todas las expectativas. La producción fue espectacular.' },
      { userId: maria.id, eventId: event3.id, rating: 5, comment: 'El ambiente en El Campín fue indescriptible. Colombia ganó y todos lloramos de felicidad.' },
      { userId: pedro.id, eventId: event4.id, rating: 5, comment: 'Carlos Vives en vivo es una experiencia que todo colombiano debe vivir. Magistral.' },
    ],
  });
  console.log('✓ Reseñas creadas');

  // ── CARRITO DE EJEMPLO ────────────────────────────────────────────────────
  const cartExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.cart.create({
    data: {
      userId: pedro.id,
      expiresAt: cartExpiry,
      items: {
        create: [
          { ticketTypeId: e2OccBaja.id, quantity: 2 },
        ],
      },
    },
  });
  console.log('✓ Carrito de ejemplo creado');

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.ticketType.count(),
    prisma.ticket.count(),
    prisma.order.count(),
  ]);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅  SEED COMPLETADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════');
  console.log(`  Usuarios:       ${stats[0]}`);
  console.log(`  Eventos:        ${stats[1]}`);
  console.log(`  Tipos boleta:   ${stats[2]}`);
  console.log(`  Boletas:        ${stats[3]}`);
  console.log(`  Órdenes:        ${stats[4]}`);
  console.log('───────────────────────────────────────');
  console.log('  Credenciales de prueba:');
  console.log('  ADMIN  → admin@ticketmaster.com / admin123');
  console.log('  USER   → carlos@ejemplo.com     / carlos123');
  console.log('  USER   → maria@ejemplo.com      / maria123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
