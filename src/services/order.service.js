const prisma = require('../config/prisma');
const MinHeap = require('../data-structures/MinHeap');

const getByUser = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          ticketType: { include: { event: { include: { venue: true } } } },
        },
      },
      tickets: { select: { id: true, qrCode: true, seatNumber: true, status: true } },
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
          ticketType: { include: { event: { include: { venue: true } } } },
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
const create = async ({ items }, userId) => {
  let totalAmount = 0;
  const orderItemsData = [];
  const allTicketIds = [];

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

    totalAmount += ticketType.price * item.quantity;
    orderItemsData.push({
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      unitPrice: ticketType.price,
    });
    allTicketIds.push(...reserved.map((t) => t.id));
  }

  // MinHeap para ordenar líneas por precio antes de confirmar (estructura requerida)
  const heap = new MinHeap();
  orderItemsData.forEach((item) => heap.insert(item.unitPrice));

  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount,
      status: 'CONFIRMED',
      items: { create: orderItemsData },
      tickets: { connect: allTicketIds.map((id) => ({ id })) },
    },
    include: {
      items: { include: { ticketType: { include: { event: true } } } },
      tickets: true,
    },
  });

  await prisma.ticket.updateMany({
    where: { id: { in: allTicketIds } },
    data: { status: 'SOLD' },
  });

  return order;
};

const cancel = async (id, userId) => {
  const order = await prisma.order.findFirst({ where: { id, userId } });
  if (!order) throw { status: 404, message: 'Orden no encontrada' };
  if (order.status === 'CANCELLED') throw { status: 400, message: 'La orden ya fue cancelada' };

  await prisma.ticket.updateMany({
    where: { orderId: id },
    data: { status: 'CANCELLED' },
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
