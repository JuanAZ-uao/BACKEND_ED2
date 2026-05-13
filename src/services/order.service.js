const prisma = require('../config/prisma');
const MinHeap = require('../data-structures/MinHeap');

const SERVICE_FEE_RATE = 0.10; // 10% cargos de servicio
const INSURANCE_RATE = 0.03;   // 3% seguros

const getByUser = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
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
  const order = await prisma.order.findFirst({
    where: { id, userId },
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
  let subtotal = 0;
  const orderItemsData = [];
  const allTicketIds = [];

  // MinHeap para procesar las líneas ordenadas por precio
  const heap = new MinHeap();

  for (const item of items) {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: item.ticketTypeId },
    });
    if (!ticketType) throw { status: 404, message: `Tipo ${item.ticketTypeId} no encontrado` };

    const reserved = await prisma.ticket.findMany({
      where: { ticketTypeId: item.ticketTypeId, status: 'RESERVED' },
      take: item.quantity,
    });

    if (reserved.length < item.quantity) {
      throw { status: 400, message: 'Debes reservar las boletas antes de confirmar la orden' };
    }

    subtotal += ticketType.price * item.quantity;
    heap.insert(ticketType.price);

    orderItemsData.push({
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      unitPrice: ticketType.price,
    });
    allTicketIds.push(...reserved.map((t) => t.id));
  }

  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const insurance = Math.round(subtotal * INSURANCE_RATE);
  const totalAmount = subtotal + serviceFee + insurance;

  const order = await prisma.order.create({
    data: {
      userId,
      subtotal,
      serviceFee,
      insurance,
      totalAmount,
      status: 'CONFIRMED',
      paymentMethod,
      items: { create: orderItemsData },
      tickets: { connect: allTicketIds.map((id) => ({ id })) },
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
    where: { id: { in: allTicketIds } },
    data: { status: 'SOLD', userId },
  });

  return order;
};

const cancel = async (id, userId) => {
  const order = await prisma.order.findFirst({ where: { id, userId } });
  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  if (order.status === 'CANCELLED') throw { status: 400, message: 'La orden ya fue cancelada' };

  await prisma.ticket.updateMany({
    where: { orderId: id },
    data: { status: 'CANCELLED', userId: null },
  });

  const items = await prisma.orderItem.findMany({ where: { orderId: id } });
  for (const item of items) {
    await prisma.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { availableQuantity: { increment: item.quantity } },
    });
  }

  return prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
};

module.exports = { getByUser, getById, create, cancel };
