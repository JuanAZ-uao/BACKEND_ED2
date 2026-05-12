const prisma = require('../config/prisma');
const Queue = require('../data-structures/Queue');

// Cola de espera en memoria por ticketTypeId (estructura de datos requerida)
const waitingQueues = {};

const getByEvent = async (eventId) => {
  return prisma.ticketType.findMany({
    where: { eventId },
    include: {
      section: true,
      _count: { select: { tickets: true } },
    },
    orderBy: { price: 'asc' },
  });
};

const reserve = async ({ ticketTypeId, quantity = 1 }, userId) => {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { event: true },
  });

  if (!ticketType) throw { status: 404, message: 'Tipo de boleta no encontrado' };
  if (ticketType.event.status === 'CANCELLED') throw { status: 400, message: 'El evento fue cancelado' };
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
      create: { userId, ticketTypeId, quantity, position },
    });

    throw { status: 409, message: `Sin disponibilidad. En lista de espera (posición ${position}).` };
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

  return tickets;
};

const cancel = async (ticketId, userId) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { order: true },
  });

  if (!ticket) throw { status: 404, message: 'Boleta no encontrada' };
  if (ticket.order?.userId !== userId) throw { status: 403, message: 'No tienes permiso sobre esta boleta' };

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

module.exports = { getByEvent, reserve, cancel, getWaitingQueue };
