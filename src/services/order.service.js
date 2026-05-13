const prisma = require('../config/prisma');
const MinHeap = require('../data-structures/MinHeap');
const notificationService = require('./notification.service');
const { sendSMS } = require('./sms.service');
const { toSafePositiveInt } = require('../utils/helpers');

const SERVICE_FEE_RATE = 0.10; // 10% cargos de servicio
const INSURANCE_RATE = 0.03;   // 3% seguros

const getByUser = async (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  return prisma.order.findMany({
    where: { userId: safeUserId },
    include: {
      items: {
        include: {
          ticketType: {
            include: { concert: { include: { artist: true, venue: true } } },
          },
        },
      },
      tickets: {
        select: {
          id: true,
          qrCode: true,
          ticketCode: true,
          seatLabel: true,
          row: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getById = async (id, userId) => {
  const safeOrderId = toSafePositiveInt(id, 'orderId');
  const safeUserId = toSafePositiveInt(userId, 'userId');

  const order = await prisma.order.findFirst({
    where: { id: safeOrderId, userId: safeUserId },
    include: {
      items: {
        include: {
          ticketType: {
            include: { concert: { include: { artist: true, venue: true } } },
          },
        },
      },
      tickets: true,
    },
  });
  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  return order;
};

// items = [{ ticketTypeId, quantity }]
// Las boletas deben estar previamente en estado RESERVED
const create = async ({ items, paymentMethod = 'CARD' }, userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 400, message: 'La orden debe incluir items' };
  }

  let subtotal = 0;
  const orderItemsData = [];
  const allTicketIds = [];

  // MinHeap para procesar las líneas ordenadas por precio
  const heap = new MinHeap();

  for (const item of items) {
    const safeTicketTypeId = toSafePositiveInt(item.ticketTypeId, 'ticketTypeId');
    const safeQuantity = toSafePositiveInt(item.quantity, 'quantity');

    const ticketType = await prisma.ticketType.findUnique({
      where: { id: safeTicketTypeId },
    });
    if (!ticketType) throw { status: 404, message: `Tipo ${safeTicketTypeId} no encontrado` };

    const reserved = await prisma.ticket.findMany({
      where: { ticketTypeId: safeTicketTypeId, status: 'RESERVED' },
      take: safeQuantity,
    });

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
    allTicketIds.push(...reserved.map((t) => t.id));
  }

  const safeTicketIds = allTicketIds.map((id) => toSafePositiveInt(id, 'ticketId'));

  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const insurance = Math.round(subtotal * INSURANCE_RATE);
  const totalAmount = subtotal + serviceFee + insurance;

  const order = await prisma.order.create({
    data: {
      userId: safeUserId,
      subtotal,
      serviceFee,
      insurance,
      totalAmount,
      status: 'CONFIRMED',
      paymentMethod,
      items: { create: orderItemsData },
      tickets: { connect: safeTicketIds.map((id) => ({ id })) },
    },
    include: {
      items: {
        include: {
          ticketType: { include: { concert: { include: { artist: true } } } },
        },
      },
      tickets: true,
    },
  });

  await prisma.ticket.updateMany({
    where: { id: { in: safeTicketIds } },
    data: { status: 'SOLD', userId: safeUserId },
  });

  // Notificación en bandeja + SMS (no bloquean la respuesta)
  Promise.resolve().then(async () => {
    try {
      const user = await prisma.user.findUnique({ where: { id: safeUserId } });
      const firstItem = order.items[0];
      const concert = firstItem?.ticketType?.concert;
      const artist = concert?.artist;
      if (!user || !concert || !artist) return;

      const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const title = 'Compra confirmada';
      const message = `Compraste ${totalTickets} boleta${totalTickets > 1 ? 's' : ''} para ${artist.name} - ${concert.tourName}`;

      await notificationService.create({
        userId: safeUserId,
        type: 'PURCHASE',
        title,
        message,
        link: '/tickets',
      });

      if (user.phone) {
        const firstCode = order.tickets[0]?.ticketCode ?? '';
        const smsBody = `Concertix: ${message}. Codigo: ${firstCode}. Total: $${Math.round(totalAmount).toLocaleString('es-CO')}`;
        sendSMS(user.phone, smsBody).catch(() => {});
      }
    } catch (e) {
      console.error('[Order] notificación fallida:', e.message);
    }
  });

  return order;
};

const cancel = async (id, userId) => {
  const safeOrderId = toSafePositiveInt(id, 'orderId');
  const safeUserId = toSafePositiveInt(userId, 'userId');

  const order = await prisma.order.findFirst({ where: { id: safeOrderId, userId: safeUserId } });
  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  if (order.status === 'CANCELLED') throw { status: 400, message: 'La orden ya fue cancelada' };

  await prisma.ticket.updateMany({
    where: { orderId: safeOrderId },
    data: { status: 'CANCELLED', userId: null },
  });

  const items = await prisma.orderItem.findMany({ where: { orderId: safeOrderId } });
  for (const item of items) {
    await prisma.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { availableQuantity: { increment: item.quantity } },
    });
  }

  return prisma.order.update({
    where: { id: safeOrderId },
    data: { status: 'CANCELLED' },
  });
};

module.exports = { getByUser, getById, create, cancel };
