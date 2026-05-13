const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

let ticketCounter = 1;

async function createTickets(ticketTypeId, quantity, prefix) {
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const seatsPerRow = 14;
  const tickets = [];

  for (let i = 0; i < quantity; i++) {
    const rowIndex = Math.floor(i / seatsPerRow);
    const seatNum = (i % seatsPerRow) + 1;
    const row = rows[rowIndex % 26];
    const seatLabel = `${row}-${String(seatNum).padStart(2, '0')}`;
    const code = String(ticketCounter).padStart(5, '0');

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
  await prisma.concert.deleteMany({});
  await prisma.artist.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.paymentMethod.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Base de datos limpia.');
}

async function main() {
  await clearDatabase();

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const [adminPass, samuelPass, mariaPass, pedroPass] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('samuel123', 10),
    bcrypt.hash('maria123', 10),
    bcrypt.hash('pedro123', 10),
  ]);

  await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'Concertix',
      email: 'admin@concertix.com',
      password: adminPass,
      role: 'ADMIN',
      phone: '3001234567',
      city: 'Bogotá',
    },
  });

  const samuel = await prisma.user.create({
    data: {
      firstName: 'Samuel',
      lastName: 'Rios',
      email: 'samuel@ejemplo.com',
      password: samuelPass,
      phone: '3109876543',
      birthDate: new Date('1999-05-15'),
      gender: 'Masculino',
      city: 'Cali, Valle del Cauca',
      document: '1234567890',
    },
  });

  const maria = await prisma.user.create({
    data: {
      firstName: 'María',
      lastName: 'González',
      email: 'maria@ejemplo.com',
      password: mariaPass,
      phone: '3205551234',
      birthDate: new Date('1995-08-22'),
      gender: 'Femenino',
      city: 'Bogotá, Cundinamarca',
    },
  });

  const pedro = await prisma.user.create({
    data: {
      firstName: 'Pedro',
      lastName: 'Ramírez',
      email: 'pedro@ejemplo.com',
      password: pedroPass,
      phone: '3118889900',
      city: 'Medellín, Antioquia',
    },
  });

  console.log('✓ Usuarios creados');

  // ── MÉTODOS DE PAGO ────────────────────────────────────────────────────────
  await prisma.paymentMethod.createMany({
    data: [
      { userId: samuel.id, lastFour: '4242', brand: 'VISA', expiryMonth: 8, expiryYear: 2027, isPrimary: false },
      { userId: samuel.id, lastFour: '8080', brand: 'MASTERCARD', expiryMonth: 3, expiryYear: 2028, isPrimary: true },
    ],
  });

  // ── PREFERENCIAS DE NOTIFICACIÓN ──────────────────────────────────────────
  await prisma.notificationPreference.createMany({
    data: [
      { userId: samuel.id },
      { userId: maria.id },
    ],
  });

  console.log('✓ Métodos de pago y notificaciones creadas');

  // ── VENUES + SECCIONES ────────────────────────────────────────────────────
  const elCampin = await prisma.venue.create({
    data: {
      name: 'Estadio El Campín',
      address: 'Cra 30 # 57-60',
      city: 'Bogotá',
      sections: {
        create: [
          { name: 'Palco Premium', capacity: 300, description: 'Zona exclusiva con mejor vista al escenario', color: '#8B5CF6' },
          { name: 'VIP Floor', capacity: 1500, description: 'Zona VIP de pie frente al escenario', color: '#3B82F6' },
          { name: 'General Piso', capacity: 8000, description: 'Zona general en el campo', color: '#10B981' },
          { name: 'General Lateral', capacity: 6000, description: 'Tribunas laterales numeradas', color: '#10B981' },
        ],
      },
    },
    include: { sections: true },
  });

  const movArena = await prisma.venue.create({
    data: {
      name: 'Movistar Arena',
      address: 'Cra 24 # 6-00',
      city: 'Bogotá',
      sections: {
        create: [
          { name: 'Palco Premium', capacity: 200, description: 'Palcos VIP con vista privilegiada', color: '#8B5CF6' },
          { name: 'VIP Floor', capacity: 800, description: 'Zona VIP frente al escenario', color: '#3B82F6' },
          { name: 'General', capacity: 5000, description: 'Zona general con numeración', color: '#10B981' },
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
      sections: {
        create: [
          { name: 'Palco Premium', capacity: 200, description: 'Palco VIP con mejor ángulo al escenario', color: '#8B5CF6' },
          { name: 'Pista', capacity: 3000, description: 'Zona de pie en la pista central', color: '#3B82F6' },
          { name: 'General', capacity: 5000, description: 'Sillas numeradas con buena vista', color: '#10B981' },
        ],
      },
    },
    include: { sections: true },
  });

  const coliseoMed = await prisma.venue.create({
    data: {
      name: 'Centro de Eventos',
      address: 'Cra 43 # 18-00',
      city: 'Medellín',
      sections: {
        create: [
          { name: 'Pista VIP', capacity: 500, description: 'Zona VIP en la pista', color: '#3B82F6' },
          { name: 'Pista General', capacity: 3000, description: 'Zona de pie general', color: '#10B981' },
        ],
      },
    },
    include: { sections: true },
  });

  const pascualGuerrero = await prisma.venue.create({
    data: {
      name: 'Estadio Pascual Guerrero',
      address: 'Calle 5 # 38-00',
      city: 'Cali',
      sections: {
        create: [
          { name: 'VIP Floor', capacity: 600, description: 'Zona VIP frente al escenario', color: '#3B82F6' },
          { name: 'General', capacity: 4000, description: 'Zona general numerada', color: '#10B981' },
        ],
      },
    },
    include: { sections: true },
  });

  console.log('✓ Venues y secciones creados');

  const sec = (venue, name) => venue.sections.find((s) => s.name === name);

  // ── ARTISTAS ──────────────────────────────────────────────────────────────
  const [jbalvin, karolg, maluma, feid, badBunny, shakira] = await Promise.all([
    prisma.artist.create({
      data: {
        name: 'J Balvin',
        genres: ['Reggaeton', 'Pop', 'Urbano', 'Trap'],
        bio: 'José Álvaro Osorio Balvín, pionero del reggaeton urbano colombiano con proyección mundial.',
      },
    }),
    prisma.artist.create({
      data: {
        name: 'Karol G',
        genres: ['Reggaeton', 'Trap', 'Pop'],
        bio: 'Carolina Giraldo Navarro, "La Bichota", reina global del reggaeton y el trap latino.',
      },
    }),
    prisma.artist.create({
      data: {
        name: 'Maluma',
        genres: ['Reggaeton', 'Pop Urbano', 'Trap'],
        bio: 'Juan Luis Londoño Arias, cantante y compositor colombiano de talla mundial.',
      },
    }),
    prisma.artist.create({
      data: {
        name: 'Feid',
        genres: ['Reggaeton', 'Urbano', 'R&B'],
        bio: 'Salomón Villada Hoyos, artista colombiano conocido como "El Ferxxo", fusiona reggaeton con R&B.',
      },
    }),
    prisma.artist.create({
      data: {
        name: 'Bad Bunny',
        genres: ['Reggaeton', 'Trap', 'Latin Pop'],
        bio: 'Benito Antonio Martínez, el artista latino más escuchado del mundo, originario de Puerto Rico.',
      },
    }),
    prisma.artist.create({
      data: {
        name: 'Shakira',
        genres: ['Pop', 'Rock', 'Latin'],
        bio: 'Shakira Isabel Mebarak Ripoll, cantante barranquillera de fama mundial e ícono global.',
      },
    }),
  ]);

  console.log('✓ Artistas creados');

  // ── CONCIERTOS ────────────────────────────────────────────────────────────

  // CONCIERTO 1: J Balvin - Rayo Tour (FEATURED / EN VIVO pronto)
  const c1 = await prisma.concert.create({
    data: {
      artistId: jbalvin.id,
      tourName: 'Rayo Tour Colombia 2026',
      description: 'J Balvin regresa a Colombia con su explosivo Rayo Tour 2026. Una noche de reggaeton, música urbana y producción única. El show más esperado del año en el Estadio El Campín.',
      date: new Date('2026-06-28T20:00:00-05:00'),
      doorsOpenAt: new Date('2026-06-28T18:00:00-05:00'),
      endDate: new Date('2026-06-28T23:30:00-05:00'),
      status: 'PUBLISHED',
      isFeatured: true,
      venueId: elCampin.id,
      genres: ['Reggaeton', 'Pop', 'Urbano', 'Trap'],
      viewerCount: 847,
    },
  });

  const c1General = await prisma.ticketType.create({
    data: {
      concertId: c1.id,
      sectionId: sec(elCampin, 'General Piso')?.id,
      name: 'General',
      description: 'Zona general en el campo. Acceso estándar.',
      price: 220000,
      totalQuantity: 500,
      availableQuantity: 500,
      maxPerOrder: 8,
    },
  });
  await createTickets(c1General.id, 500, 'C1G');

  const c1VIP = await prisma.ticketType.create({
    data: {
      concertId: c1.id,
      sectionId: sec(elCampin, 'VIP Floor')?.id,
      name: 'VIP Floor',
      description: 'Zona VIP de pie frente al escenario con acceso preferencial.',
      price: 480000,
      totalQuantity: 150,
      availableQuantity: 30,
      maxPerOrder: 4,
    },
  });
  await createTickets(c1VIP.id, 150, 'C1V');
  await prisma.ticket.updateMany({
    where: { ticketTypeId: c1VIP.id, status: 'AVAILABLE' },
    data: { status: 'SOLD' },
    // solo los primeros 120 se marcan vendidos para que queden 30
  });
  // Revertir — la lógica de "30 disponibles" ya está en availableQuantity
  // Los tickets físicos: 150 creados, pero solo 30 son AVAILABLE
  await prisma.ticket.updateMany({
    where: { ticketTypeId: c1VIP.id },
    data: { status: 'SOLD' },
  });
  const c1VIPAvail = await prisma.ticket.findMany({
    where: { ticketTypeId: c1VIP.id },
    take: 30,
  });
  await prisma.ticket.updateMany({
    where: { id: { in: c1VIPAvail.map((t) => t.id) } },
    data: { status: 'AVAILABLE' },
  });

  const c1Palco = await prisma.ticketType.create({
    data: {
      concertId: c1.id,
      sectionId: sec(elCampin, 'Palco Premium')?.id,
      name: 'Palco Premium',
      description: 'Zona exclusiva con mejor vista. Incluye lounge privado y servicio personalizado.',
      price: 950000,
      totalQuantity: 50,
      availableQuantity: 3,
      maxPerOrder: 2,
    },
  });
  await createTickets(c1Palco.id, 50, 'C1P');
  await prisma.ticket.updateMany({ where: { ticketTypeId: c1Palco.id }, data: { status: 'SOLD' } });
  const c1PalcoAvail = await prisma.ticket.findMany({ where: { ticketTypeId: c1Palco.id }, take: 3 });
  await prisma.ticket.updateMany({
    where: { id: { in: c1PalcoAvail.map((t) => t.id) } },
    data: { status: 'AVAILABLE' },
  });

  console.log('✓ Concierto 1 creado (J Balvin - FEATURED)');

  // CONCIERTO 2: Karol G - Mañana Será Bonito Tour
  const c2 = await prisma.concert.create({
    data: {
      artistId: karolg.id,
      tourName: 'Mañana Será Bonito Tour',
      description: 'La Bichota llega a Bogotá con el show más esperado del año. Un espectáculo visual y musical de talla mundial.',
      date: new Date('2026-07-22T20:00:00-05:00'),
      doorsOpenAt: new Date('2026-07-22T18:00:00-05:00'),
      endDate: new Date('2026-07-22T23:45:00-05:00'),
      status: 'PUBLISHED',
      isFeatured: false,
      venueId: movArena.id,
      genres: ['Reggaeton', 'Trap', 'Pop'],
      viewerCount: 312,
    },
  });

  const c2General = await prisma.ticketType.create({
    data: {
      concertId: c2.id,
      sectionId: sec(movArena, 'General')?.id,
      name: 'General',
      price: 280000,
      totalQuantity: 600,
      availableQuantity: 600,
      maxPerOrder: 8,
    },
  });
  await createTickets(c2General.id, 600, 'C2G');

  const c2VIP = await prisma.ticketType.create({
    data: {
      concertId: c2.id,
      sectionId: sec(movArena, 'VIP Floor')?.id,
      name: 'VIP Floor',
      price: 520000,
      totalQuantity: 200,
      availableQuantity: 200,
      maxPerOrder: 4,
    },
  });
  await createTickets(c2VIP.id, 200, 'C2V');

  const c2Palco = await prisma.ticketType.create({
    data: {
      concertId: c2.id,
      sectionId: sec(movArena, 'Palco Premium')?.id,
      name: 'Palco Premium',
      price: 890000,
      totalQuantity: 60,
      availableQuantity: 60,
      maxPerOrder: 2,
    },
  });
  await createTickets(c2Palco.id, 60, 'C2P');

  console.log('✓ Concierto 2 creado (Karol G)');

  // CONCIERTO 3: Maluma - Don Juan Tour
  const c3 = await prisma.concert.create({
    data: {
      artistId: maluma.id,
      tourName: 'Don Juan Tour',
      description: 'Maluma regresa a Colombia con su Don Juan Tour. Una noche de éxitos, bailoteo y el mejor reggaeton colombiano.',
      date: new Date('2026-08-08T21:00:00-05:00'),
      doorsOpenAt: new Date('2026-08-08T19:00:00-05:00'),
      endDate: new Date('2026-08-09T00:30:00-05:00'),
      status: 'PUBLISHED',
      isFeatured: false,
      venueId: atanasio.id,
      genres: ['Reggaeton', 'Pop Urbano', 'Trap'],
      viewerCount: 203,
    },
  });

  const c3General = await prisma.ticketType.create({
    data: {
      concertId: c3.id,
      sectionId: sec(atanasio, 'General')?.id,
      name: 'General',
      price: 320000,
      totalQuantity: 500,
      availableQuantity: 500,
      maxPerOrder: 8,
    },
  });
  await createTickets(c3General.id, 500, 'C3G');

  const c3Pista = await prisma.ticketType.create({
    data: {
      concertId: c3.id,
      sectionId: sec(atanasio, 'Pista')?.id,
      name: 'Pista',
      price: 480000,
      totalQuantity: 200,
      availableQuantity: 200,
      maxPerOrder: 4,
    },
  });
  await createTickets(c3Pista.id, 200, 'C3P');

  const c3Palco = await prisma.ticketType.create({
    data: {
      concertId: c3.id,
      sectionId: sec(atanasio, 'Palco Premium')?.id,
      name: 'Palco Premium',
      price: 750000,
      totalQuantity: 50,
      availableQuantity: 50,
      maxPerOrder: 2,
    },
  });
  await createTickets(c3Palco.id, 50, 'C3L');

  console.log('✓ Concierto 3 creado (Maluma)');

  // CONCIERTO 4: Feid - Mar Tour Colombia 2026
  const c4 = await prisma.concert.create({
    data: {
      artistId: feid.id,
      tourName: 'Mar Tour Colombia 2026',
      description: 'El Ferxxo desembarca en Medellín con su Mar Tour. Una experiencia musical inmersiva que fusiona reggaeton, R&B y urbano.',
      date: new Date('2026-08-15T20:00:00-05:00'),
      doorsOpenAt: new Date('2026-08-15T18:30:00-05:00'),
      endDate: new Date('2026-08-15T23:00:00-05:00'),
      status: 'PUBLISHED',
      isFeatured: false,
      venueId: coliseoMed.id,
      genres: ['Reggaeton', 'Urbano', 'R&B'],
      viewerCount: 156,
    },
  });

  const c4Pista = await prisma.ticketType.create({
    data: {
      concertId: c4.id,
      sectionId: sec(coliseoMed, 'Pista General')?.id,
      name: 'Pista',
      price: 200000,
      totalQuantity: 400,
      availableQuantity: 400,
      maxPerOrder: 8,
    },
  });
  await createTickets(c4Pista.id, 400, 'C4P');

  const c4VIP = await prisma.ticketType.create({
    data: {
      concertId: c4.id,
      sectionId: sec(coliseoMed, 'Pista VIP')?.id,
      name: 'VIP',
      price: 380000,
      totalQuantity: 150,
      availableQuantity: 150,
      maxPerOrder: 4,
    },
  });
  await createTickets(c4VIP.id, 150, 'C4V');

  console.log('✓ Concierto 4 creado (Feid)');

  // CONCIERTO 5: Bad Bunny (próximo)
  const c5 = await prisma.concert.create({
    data: {
      artistId: badBunny.id,
      tourName: 'Nadie Sabe Lo Que Va a Pasar Mañana Tour',
      description: 'El artista más escuchado del mundo llega a Colombia. Bad Bunny presenta su tour mundial con producción de nivel internacional.',
      date: new Date('2026-09-20T20:00:00-05:00'),
      doorsOpenAt: new Date('2026-09-20T18:00:00-05:00'),
      endDate: new Date('2026-09-20T23:30:00-05:00'),
      status: 'PUBLISHED',
      isFeatured: true,
      venueId: elCampin.id,
      genres: ['Reggaeton', 'Trap', 'Latin Pop'],
      viewerCount: 1247,
    },
  });

  const c5General = await prisma.ticketType.create({
    data: {
      concertId: c5.id,
      sectionId: sec(elCampin, 'General Piso')?.id,
      name: 'General',
      price: 350000,
      totalQuantity: 600,
      availableQuantity: 600,
      maxPerOrder: 8,
    },
  });
  await createTickets(c5General.id, 600, 'C5G');

  const c5VIP = await prisma.ticketType.create({
    data: {
      concertId: c5.id,
      sectionId: sec(elCampin, 'VIP Floor')?.id,
      name: 'VIP Floor',
      price: 650000,
      totalQuantity: 200,
      availableQuantity: 200,
      maxPerOrder: 4,
    },
  });
  await createTickets(c5VIP.id, 200, 'C5V');

  const c5Palco = await prisma.ticketType.create({
    data: {
      concertId: c5.id,
      sectionId: sec(elCampin, 'Palco Premium')?.id,
      name: 'Palco Premium',
      price: 1200000,
      totalQuantity: 50,
      availableQuantity: 50,
      maxPerOrder: 2,
    },
  });
  await createTickets(c5Palco.id, 50, 'C5P');

  console.log('✓ Concierto 5 creado (Bad Bunny)');

  // CONCIERTO 6: Shakira - AGOTADO (demo de waiting list)
  const c6 = await prisma.concert.create({
    data: {
      artistId: shakira.id,
      tourName: 'Las Mujeres Ya No Lloran World Tour',
      description: 'La artista colombiana más exitosa de la historia regresa con su tour mundial. Un show sin precedentes que marcará la historia de Colombia.',
      date: new Date('2026-10-10T20:00:00-05:00'),
      doorsOpenAt: new Date('2026-10-10T18:00:00-05:00'),
      endDate: new Date('2026-10-10T23:30:00-05:00'),
      status: 'SOLD_OUT',
      isFeatured: false,
      venueId: elCampin.id,
      genres: ['Pop', 'Rock', 'Latin'],
      viewerCount: 4521,
    },
  });

  const c6General = await prisma.ticketType.create({
    data: {
      concertId: c6.id,
      sectionId: sec(elCampin, 'General Piso')?.id,
      name: 'General',
      price: 280000,
      totalQuantity: 800,
      availableQuantity: 0,
      maxPerOrder: 8,
    },
  });
  await createTickets(c6General.id, 800, 'C6G');
  await prisma.ticket.updateMany({ where: { ticketTypeId: c6General.id }, data: { status: 'SOLD' } });

  const c6VIP = await prisma.ticketType.create({
    data: {
      concertId: c6.id,
      sectionId: sec(elCampin, 'VIP Floor')?.id,
      name: 'VIP Floor',
      price: 550000,
      totalQuantity: 200,
      availableQuantity: 0,
      maxPerOrder: 4,
    },
  });
  await createTickets(c6VIP.id, 200, 'C6V');
  await prisma.ticket.updateMany({ where: { ticketTypeId: c6VIP.id }, data: { status: 'SOLD' } });

  console.log('✓ Concierto 6 creado (Shakira - SOLD_OUT)');

  // CONCIERTO 7: Karol G - Pascual Guerrero (COMPLETADO - historial)
  const c7 = await prisma.concert.create({
    data: {
      artistId: karolg.id,
      tourName: 'Mañana Será Bonito Tour',
      description: 'Karol G en Cali. Un show histórico en el Estadio Pascual Guerrero.',
      date: new Date('2025-04-10T19:30:00-05:00'),
      doorsOpenAt: new Date('2025-04-10T18:00:00-05:00'),
      status: 'COMPLETED',
      isFeatured: false,
      venueId: pascualGuerrero.id,
      genres: ['Reggaeton', 'Trap', 'Pop'],
      viewerCount: 0,
    },
  });

  const c7VIP = await prisma.ticketType.create({
    data: {
      concertId: c7.id,
      sectionId: sec(pascualGuerrero, 'VIP Floor')?.id,
      name: 'VIP Floor',
      price: 450000,
      totalQuantity: 200,
      availableQuantity: 0,
      maxPerOrder: 4,
    },
  });
  await createTickets(c7VIP.id, 200, 'C7V');
  await prisma.ticket.updateMany({ where: { ticketTypeId: c7VIP.id }, data: { status: 'SOLD' } });

  const c7General = await prisma.ticketType.create({
    data: {
      concertId: c7.id,
      sectionId: sec(pascualGuerrero, 'General')?.id,
      name: 'General',
      price: 220000,
      totalQuantity: 400,
      availableQuantity: 0,
      maxPerOrder: 8,
    },
  });
  await createTickets(c7General.id, 400, 'C7G');
  await prisma.ticket.updateMany({ where: { ticketTypeId: c7General.id }, data: { status: 'SOLD' } });

  console.log('✓ Concierto 7 creado (Karol G Cali - COMPLETADO)');

  // ── ÓRDENES DE EJEMPLO ────────────────────────────────────────────────────

  // Samuel compra 2 boletas General para J Balvin
  const samuelTickets = await prisma.ticket.findMany({
    where: { ticketTypeId: c1General.id, status: 'AVAILABLE' },
    take: 2,
  });
  const samuelOrder = await prisma.order.create({
    data: {
      userId: samuel.id,
      subtotal: 2 * c1General.price,
      serviceFee: 2 * c1General.price * 0.1,
      insurance: 2 * c1General.price * 0.03,
      totalAmount: 2 * c1General.price * 1.13,
      status: 'CONFIRMED',
      paymentMethod: 'CARD',
      items: {
        create: [{ ticketTypeId: c1General.id, quantity: 2, unitPrice: c1General.price }],
      },
      tickets: { connect: samuelTickets.map((t) => ({ id: t.id })) },
    },
  });
  await prisma.ticket.updateMany({
    where: { id: { in: samuelTickets.map((t) => t.id) } },
    data: { status: 'SOLD', userId: samuel.id, orderId: samuelOrder.id },
  });
  await prisma.ticketType.update({
    where: { id: c1General.id },
    data: { availableQuantity: { decrement: 2 } },
  });

  // María compra 1 VIP Floor para Karol G
  const mariaTickets = await prisma.ticket.findMany({
    where: { ticketTypeId: c2VIP.id, status: 'AVAILABLE' },
    take: 1,
  });
  const mariaOrder = await prisma.order.create({
    data: {
      userId: maria.id,
      subtotal: c2VIP.price,
      serviceFee: c2VIP.price * 0.1,
      insurance: c2VIP.price * 0.03,
      totalAmount: c2VIP.price * 1.13,
      status: 'CONFIRMED',
      paymentMethod: 'CARD',
      items: {
        create: [{ ticketTypeId: c2VIP.id, quantity: 1, unitPrice: c2VIP.price }],
      },
      tickets: { connect: mariaTickets.map((t) => ({ id: t.id })) },
    },
  });
  await prisma.ticket.updateMany({
    where: { id: { in: mariaTickets.map((t) => t.id) } },
    data: { status: 'SOLD', userId: maria.id, orderId: mariaOrder.id },
  });
  await prisma.ticketType.update({
    where: { id: c2VIP.id },
    data: { availableQuantity: { decrement: 1 } },
  });

  console.log('✓ Órdenes creadas');

  // ── LISTA DE ESPERA (Queue en ticket.service.js) ───────────────────────────
  await prisma.waitingList.createMany({
    data: [
      { userId: maria.id, concertId: c6.id, ticketTypeId: c6General.id, quantity: 2, position: 1 },
      { userId: pedro.id, concertId: c6.id, ticketTypeId: c6VIP.id, quantity: 1, position: 1 },
      { userId: samuel.id, concertId: c6.id, ticketTypeId: c6General.id, quantity: 4, position: 2 },
    ],
  });
  console.log('✓ Lista de espera creada');

  // ── RESEÑAS ───────────────────────────────────────────────────────────────
  await prisma.review.createMany({
    data: [
      { userId: samuel.id, concertId: c7.id, rating: 5, comment: 'Karol G en Cali fue una experiencia de otro mundo. La producción, el sonido, el ambiente... todo 10/10.' },
      { userId: maria.id, concertId: c1.id, rating: 5, comment: 'J Balvin no defrauda. El show fue espectacular, cada detalle cuidado al máximo.' },
      { userId: pedro.id, concertId: c3.id, rating: 4, comment: 'Maluma estuvo increíble. El Atanasio lleno y una energía única.' },
    ],
  });
  console.log('✓ Reseñas creadas');

  // ── CARRITO DE EJEMPLO ────────────────────────────────────────────────────
  await prisma.cart.create({
    data: {
      userId: pedro.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: [
          { ticketTypeId: c3General.id, quantity: 2 },
        ],
      },
    },
  });
  console.log('✓ Carrito de ejemplo creado');

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.concert.count(),
    prisma.artist.count(),
    prisma.ticketType.count(),
    prisma.ticket.count(),
    prisma.order.count(),
  ]);

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅  SEED COMPLETADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════');
  console.log(`  Usuarios:       ${stats[0]}`);
  console.log(`  Conciertos:     ${stats[1]}`);
  console.log(`  Artistas:       ${stats[2]}`);
  console.log(`  Tipos boleta:   ${stats[3]}`);
  console.log(`  Boletas:        ${stats[4]}`);
  console.log(`  Órdenes:        ${stats[5]}`);
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
  .finally(async () => { await prisma.$disconnect(); });
