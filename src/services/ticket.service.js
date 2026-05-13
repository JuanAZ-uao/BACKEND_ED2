const prisma = require('../config/prisma');
const Queue = require('../data-structures/Queue');
const realtimeService = require('./realtime.service');
const { toSafePositiveInt } = require('../utils/helpers');

// cola de espera en memoria por ticketTypeId
const waitingQueues = {};

const getByConcert = async (concertId) => {
  const safeConcertId = toSafePositiveInt(concertId, 'concertId');

  return prisma.ticketType.findMany({
    where: { concertId: safeConcertId },
    include: {
      section: true,
      _count: { select: { tickets: { where: { status: 'AVAILABLE' } } } },
    },
    orderBy: { price: 'asc' },
  });
};

const reserve = async ({ ticketTypeId, quantity = 1 }, userId) => {
  const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');
  const safeQuantity = toSafePositiveInt(quantity, 'quantity');
  const safeUserId = toSafePositiveInt(userId, 'userId');

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: safeTicketTypeId },
    include: { concert: true },
  });

  if (!ticketType) throw { status: 404, message: 'Tipo de boleta no encontrado' };
  if (ticketType.concert.status === 'CANCELLED') {
    throw { status: 400, message: 'El concierto fue cancelado' };
  }
  if (safeQuantity > ticketType.maxPerOrder) {
    throw { status: 400, message: `Máximo ${ticketType.maxPerOrder} boletas por orden` };
  }

  if (ticketType.availableQuantity < safeQuantity) {
    if (!waitingQueues[safeTicketTypeId]) waitingQueues[safeTicketTypeId] = new Queue();
    waitingQueues[safeTicketTypeId].enqueue({ userId: safeUserId, quantity: safeQuantity, timestamp: Date.now() });

    const position = waitingQueues[safeTicketTypeId].size;
    await prisma.waitingList.upsert({
      where: { userId_ticketTypeId: { userId: safeUserId, ticketTypeId: safeTicketTypeId } },
      update: { quantity: safeQuantity, position },
      create: {
        userId: safeUserId,
        concertId: ticketType.concertId,
        ticketTypeId: safeTicketTypeId,
        quantity: safeQuantity,
        position,
      },
    });

    throw {
      status: 409,
      message: `Sin disponibilidad. Agregado a lista de espera (posición ${position}).`,
    };
  }

  const tickets = await prisma.ticket.findMany({
    where: { ticketTypeId: safeTicketTypeId, status: 'AVAILABLE' },
    take: safeQuantity,
  });

  if (tickets.length < safeQuantity) {
    throw { status: 409, message: 'No hay suficientes boletas disponibles' };
  }

  const safeTicketIds = tickets.map((t) => toSafePositiveInt(t.id, 'ticketId'));

  await prisma.ticket.updateMany({
    where: { id: { in: safeTicketIds } },
    data: { status: 'RESERVED' },
  });

  await prisma.ticketType.update({
    where: { id: safeTicketTypeId },
    data: { availableQuantity: { decrement: safeQuantity } },
  });

  // Notificar en tiempo real a otros usuarios en el mismo concierto
  for (const ticket of tickets) {
    if (ticket.seatLabel) {
      realtimeService.notifySeatReserving(
        ticketType.concertId,
        ticket.seatLabel,
        ticketType.name,
        safeUserId
      ).catch(() => {});
    }
  }

  return tickets;
};

const cancel = async (ticketId, userId) => {
  const safeTicketId = toSafePositiveInt(ticketId, 'ticketId');
  const safeUserId = toSafePositiveInt(userId, 'userId');

  const ticket = await prisma.ticket.findUnique({
    where: { id: safeTicketId },
    include: { order: true },
  });

  if (!ticket) throw { status: 404, message: 'Boleta no encontrada' };
  if (ticket.order?.userId !== safeUserId) {
    throw { status: 403, message: 'No tienes permiso sobre esta boleta' };
  }

  await prisma.ticket.update({
    where: { id: safeTicketId },
    data: { status: 'CANCELLED' },
  });

  await prisma.ticketType.update({
    where: { id: ticket.ticketTypeId },
    data: { availableQuantity: { increment: 1 } },
  });
};

const getWaitingQueue = (ticketTypeId) => {
  const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');

  return waitingQueues[safeTicketTypeId]
    ? waitingQueues[safeTicketTypeId].toArray()
    : [];
};

const SEAT_STATUS_PRIORITY = { SOLD: 0, USED: 0, RESERVED: 1, AVAILABLE: 2, CANCELLED: 3 };

const getSeatMap = async (ticketTypeId) => {
  const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');

  const tickets = await prisma.ticket.findMany({
    where: { ticketTypeId: safeTicketTypeId },
    select: { seatLabel: true, row: true, status: true },
    orderBy: [{ row: 'asc' }, { seatLabel: 'asc' }],
  });

  // Deduplicate by seatLabel — keep the most restrictive status (SOLD beats AVAILABLE)
  const seen = new Map();
  for (const t of tickets) {
    if (!t.seatLabel) continue;
    const existing = seen.get(t.seatLabel);
    if (!existing || (SEAT_STATUS_PRIORITY[t.status] ?? 99) < (SEAT_STATUS_PRIORITY[existing.status] ?? 99)) {
      seen.set(t.seatLabel, t);
    }
  }
  return Array.from(seen.values());
};

module.exports = { getByConcert, reserve, cancel, getWaitingQueue, getSeatMap };
