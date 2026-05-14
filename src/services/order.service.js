const { Order, Ticket, TicketType, User } = require('../models');
const MinHeap = require('../data-structures/MinHeap');
const notificationService = require('./notification.service');
const { sendSMS } = require('./sms.service');
const { toSafeObjectId, toSafePositiveInt } = require('../utils/helpers');

const SERVICE_FEE_RATE = 0.10;
const INSURANCE_RATE   = 0.03;

const populateOrderTicketTypes = {
  path: 'items.ticketTypeId',
  model: 'TicketType',
  populate: {
    path: 'concertId',
    model: 'Concert',
    populate: [
      { path: 'artistId', model: 'Artist' },
      { path: 'venueId',  model: 'Venue' },
    ],
  },
};

const formatOrder = async (order) => {
  const obj = order.toJSON ? order.toJSON() : order;
  const tickets = await Ticket.find({ orderId: obj.id || obj._id }).select(
    'id qrCode ticketCode seatLabel row status'
  );
  obj.tickets = tickets.map((t) => t.toJSON());
  // Renombrar campo de items para mantener compatibilidad
  obj.items = (obj.items || []).map((item) => ({
    ...item,
    ticketType: item.ticketTypeId,
    ticketTypeId: item.ticketTypeId?.id || item.ticketTypeId,
  }));
  return obj;
};

const getByUser = async (userId) => {
  const orders = await Order.find({ userId })
    .populate(populateOrderTicketTypes)
    .sort({ createdAt: -1 });

  return Promise.all(orders.map(formatOrder));
};

const getById = async (id, userId) => {
  const safeId = toSafeObjectId(id, 'orderId');

  const order = await Order.findOne({ _id: safeId, userId })
    .populate(populateOrderTicketTypes);

  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  return formatOrder(order);
};

// items = [{ ticketTypeId, quantity }]
const create = async ({ items, paymentMethod = 'CARD' }, userId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 400, message: 'La orden debe incluir items' };
  }

  let subtotal = 0;
  const orderItemsData = [];
  const allTicketIds = [];

  const heap = new MinHeap();

  for (const item of items) {
    const safeTicketTypeId = toSafeObjectId(item.ticketTypeId, 'ticketTypeId');
    const safeQuantity     = toSafePositiveInt(item.quantity, 'quantity');

    const ticketType = await TicketType.findById(safeTicketTypeId);
    if (!ticketType) throw { status: 404, message: `Tipo ${safeTicketTypeId} no encontrado` };

    const reserved = await Ticket.find({ ticketTypeId: safeTicketTypeId, status: 'RESERVED' })
      .limit(safeQuantity);

    if (reserved.length < safeQuantity) {
      throw { status: 400, message: 'Debes reservar las boletas antes de confirmar la orden' };
    }

    subtotal += ticketType.price * safeQuantity;
    heap.insert(ticketType.price);

    orderItemsData.push({
      ticketTypeId: safeTicketTypeId,
      quantity: safeQuantity,
      unitPrice: ticketType.price,
    });
    allTicketIds.push(...reserved.map((t) => t._id));
  }

  const serviceFee  = Math.round(subtotal * SERVICE_FEE_RATE);
  const insurance   = Math.round(subtotal * INSURANCE_RATE);
  const totalAmount = subtotal + serviceFee + insurance;

  const order = await Order.create({
    userId,
    subtotal,
    serviceFee,
    insurance,
    totalAmount,
    status: 'CONFIRMED',
    paymentMethod,
    items: orderItemsData,
  });

  // Actualizar tickets: marcarlos SOLD y asignar orderId y userId
  await Ticket.updateMany(
    { _id: { $in: allTicketIds } },
    { status: 'SOLD', userId, orderId: order._id }
  );

  const populated = await Order.findById(order._id).populate(populateOrderTicketTypes);

  // Notificación en bandeja + SMS (no bloquean la respuesta)
  Promise.resolve().then(async () => {
    try {
      const user      = await User.findById(userId);
      const firstItem = populated.items[0];
      const concert   = firstItem?.ticketTypeId?.concertId;
      const artist    = concert?.artistId;
      if (!user || !concert || !artist) return;

      const totalTickets = populated.items.reduce((sum, i) => sum + i.quantity, 0);
      const artistName   = typeof artist === 'object' ? artist.name : '';
      const tourName     = typeof concert === 'object' ? concert.tourName : '';
      const title   = 'Compra confirmada';
      const message = `Compraste ${totalTickets} boleta${totalTickets > 1 ? 's' : ''} para ${artistName} - ${tourName}`;

      await notificationService.create({
        userId,
        type: 'PURCHASE',
        title,
        message,
        link: '/tickets',
      });

      if (user.phone) {
        const ticketsForOrder = await Ticket.find({ orderId: order._id }).limit(1);
        const firstCode = ticketsForOrder[0]?.ticketCode ?? '';
        const smsBody = `Concertix: ${message}. Codigo: ${firstCode}. Total: $${Math.round(totalAmount).toLocaleString('es-CO')}`;
        sendSMS(user.phone, smsBody).catch(() => {});
      }
    } catch (e) {
      console.error('[Order] notificación fallida:', e.message);
    }
  });

  return formatOrder(populated);
};

const cancel = async (id, userId) => {
  const safeId = toSafeObjectId(id, 'orderId');

  const order = await Order.findOne({ _id: safeId, userId });
  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  if (order.status === 'CANCELLED') throw { status: 400, message: 'La orden ya fue cancelada' };

  await Ticket.updateMany(
    { orderId: safeId },
    { status: 'CANCELLED', userId: null }
  );

  for (const item of order.items) {
    await TicketType.findByIdAndUpdate(item.ticketTypeId, {
      $inc: { availableQuantity: item.quantity },
    });
  }

  const updated = await Order.findByIdAndUpdate(safeId, { status: 'CANCELLED' }, { new: true });
  return updated.toJSON();
};

module.exports = { getByUser, getById, create, cancel };
