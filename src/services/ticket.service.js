const { Ticket, TicketType, WaitingList } = require('../models');
const Queue = require('../data-structures/Queue');
const realtimeService = require('./realtime.service');
const { toSafeObjectId, toSafePositiveInt } = require('../utils/helpers');

// Cola de espera en memoria por ticketTypeId
const waitingQueues = {};

const getByConcert = async (concertId) => {
  const safeId = toSafeObjectId(concertId, 'concertId');

  const ticketTypes = await TicketType.find({ concertId: safeId }).sort({ price: 1 });

  // Añadir conteo de boletas AVAILABLE por tipo
  const result = await Promise.all(
    ticketTypes.map(async (tt) => {
      const obj = tt.toJSON();
      const availCount = await Ticket.countDocuments({ ticketTypeId: tt._id, status: 'AVAILABLE' });
      obj._count = { tickets: availCount };
      return obj;
    })
  );

  return result;
};

const reserve = async ({ ticketTypeId, quantity = 1 }, userId) => {
  const safeTicketTypeId = toSafeObjectId(ticketTypeId, 'ticketTypeId');
  const safeQuantity     = toSafePositiveInt(quantity, 'quantity');

  const ticketType = await TicketType.findById(safeTicketTypeId).populate('concertId');
  if (!ticketType) throw { status: 404, message: 'Tipo de boleta no encontrado' };

  const concert = ticketType.concertId;
  if (concert && concert.status === 'CANCELLED') {
    throw { status: 400, message: 'El concierto fue cancelado' };
  }
  if (safeQuantity > ticketType.maxPerOrder) {
    throw { status: 400, message: `Máximo ${ticketType.maxPerOrder} boletas por orden` };
  }

  if (ticketType.availableQuantity < safeQuantity) {
    if (!waitingQueues[safeTicketTypeId]) waitingQueues[safeTicketTypeId] = new Queue();
    waitingQueues[safeTicketTypeId].enqueue({ userId, quantity: safeQuantity, timestamp: Date.now() });

    const position = waitingQueues[safeTicketTypeId].size;
    await WaitingList.findOneAndUpdate(
      { userId, ticketTypeId: safeTicketTypeId },
      {
        quantity: safeQuantity,
        position,
        concertId: ticketType.concertId?._id || ticketType.concertId,
      },
      { upsert: true, new: true }
    );

    throw {
      status: 409,
      message: `Sin disponibilidad. Agregado a lista de espera (posición ${position}).`,
    };
  }

  const tickets = await Ticket.find({ ticketTypeId: safeTicketTypeId, status: 'AVAILABLE' })
    .limit(safeQuantity);

  if (tickets.length < safeQuantity) {
    throw { status: 409, message: 'No hay suficientes boletas disponibles' };
  }

  const ticketIds = tickets.map((t) => t._id);

  await Ticket.updateMany({ _id: { $in: ticketIds } }, { status: 'RESERVED' });
  await TicketType.findByIdAndUpdate(safeTicketTypeId, {
    $inc: { availableQuantity: -safeQuantity },
  });

  for (const ticket of tickets) {
    if (ticket.seatLabel) {
      realtimeService.notifySeatReserving(
        ticketType.concertId?._id?.toString() || ticketType.concertId.toString(),
        ticket.seatLabel,
        ticketType.name,
        userId
      ).catch(() => {});
    }
  }

  return tickets.map((t) => t.toJSON());
};

const cancel = async (ticketId, userId) => {
  const safeTicketId = toSafeObjectId(ticketId, 'ticketId');

  const ticket = await Ticket.findById(safeTicketId).populate('orderId');
  if (!ticket) throw { status: 404, message: 'Boleta no encontrada' };

  const order = ticket.orderId;
  if (order && order.userId?.toString() !== userId.toString()) {
    throw { status: 403, message: 'No tienes permiso sobre esta boleta' };
  }

  await Ticket.findByIdAndUpdate(safeTicketId, { status: 'CANCELLED' });
  await TicketType.findByIdAndUpdate(ticket.ticketTypeId, {
    $inc: { availableQuantity: 1 },
  });
};

const getWaitingQueue = (ticketTypeId) => {
  return waitingQueues[ticketTypeId] ? waitingQueues[ticketTypeId].toArray() : [];
};

const SEAT_STATUS_PRIORITY = { SOLD: 0, USED: 0, RESERVED: 1, AVAILABLE: 2, CANCELLED: 3 };

const getSeatMap = async (ticketTypeId) => {
  const safeId = toSafeObjectId(ticketTypeId, 'ticketTypeId');

  const tickets = await Ticket.find({ ticketTypeId: safeId })
    .select('seatLabel row status')
    .sort({ row: 1, seatLabel: 1 });

  const seen = new Map();
  for (const t of tickets) {
    if (!t.seatLabel) continue;
    const existing = seen.get(t.seatLabel);
    if (!existing || (SEAT_STATUS_PRIORITY[t.status] ?? 99) < (SEAT_STATUS_PRIORITY[existing.status] ?? 99)) {
      seen.set(t.seatLabel, t.toJSON());
    }
  }
  return Array.from(seen.values());
};

module.exports = { getByConcert, reserve, cancel, getWaitingQueue, getSeatMap };
