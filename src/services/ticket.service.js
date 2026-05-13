const prisma = require('../config/prisma');
const Queue = require('../data-structures/Queue');
const realtimeService = require('./realtime.service');

// cola de espera en memoria por ticketTypeId
const waitingQueues = {};

const getByConcert = async (concertId) => {
  return prisma.ticketType.findMany({
    where: { concertId },
    include: {
      section: true,
      _count: { select: { tickets: { where: { status: 'AVAILABLE' } } } },
    },
    orderBy: { price: 'asc' },
  });
};

const reserve = async ({ ticketTypeId, quantity = 1 }, userId) => {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { concert: true },
  });

  if (!ticketType) throw { status: 404, message: 'Tipo de boleta no encontrado' };
  if (ticketType.concert.status === 'CANCELLED') {
    throw { status: 400, message: 'El concierto fue cancelado' };
  }
  if (quantity > ticketType.maxPerOrder) {
    throw { status: 400, message: `Máximo ${ticketType.maxPerOrder} boletas por orden` };
  }

  if (ticketType.availableQuantity < quantity) {
    if (!waitingQueues[ticketTypeId]) waitingQueues[ticketTypeId] = new Queue();
    waitingQueues[ticketTypeId].enqueue({ userId, quantity, timestamp: Date.now() });

    const position = waitingQueues[ticketTypeId].size;
    await prisma.waitingList.upsert({
      where: { userId_ticketTypeId: { userId, ticketTypeId } },
      update: { quantity, position },
      create: {
        userId,
        concertId: ticketType.concertId,
        ticketTypeId,
        quantity,
        position,
      },
    });

    throw {
      status: 409,
      message: `Sin disponibilidad. Agregado a lista de espera (posición ${position}).`,
    };
  }

  const tickets = await prisma.ticket.findMany({
    where: { ticketTypeId, status: 'AVAILABLE' },
    take: quantity,
  });

  if (tickets.length < quantity) {
    throw { status: 409, message: 'No hay suficientes boletas disponibles' };
  }

  await prisma.ticket.updateMany({
    where: { id: { in: tickets.map((t) => t.id) } },
    data: { status: 'RESERVED' },
  });

  await prisma.ticketType.update({
    where: { id: ticketTypeId },
    data: { availableQuantity: { decrement: quantity } },
  });

  // Notificar en tiempo real a otros usuarios en el mismo concierto
  for (const ticket of tickets) {
    if (ticket.seatLabel) {
      realtimeService.notifySeatReserving(
        ticketType.concertId,
        ticket.seatLabel,
        ticketType.name,
        userId
      ).catch(() => {});
    }
  }

  return tickets;
};

const cancel = async (ticketId, userId) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { order: true },
  });

  if (!ticket) throw { status: 404, message: 'Boleta no encontrada' };
  if (ticket.order?.userId !== userId) {
    throw { status: 403, message: 'No tienes permiso sobre esta boleta' };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CANCELLED' },
  });

  await prisma.ticketType.update({
    where: { id: ticket.ticketTypeId },
    data: { availableQuantity: { increment: 1 } },
  });
};

const getWaitingQueue = (ticketTypeId) => {
  return waitingQueues[ticketTypeId]
    ? waitingQueues[ticketTypeId].toArray()
    : [];
};

const SEAT_STATUS_PRIORITY = { SOLD: 0, USED: 0, RESERVED: 1, AVAILABLE: 2, CANCELLED: 3 };

const getSeatMap = async (ticketTypeId) => {
  const tickets = await prisma.ticket.findMany({
    where: { ticketTypeId },
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
