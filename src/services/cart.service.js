const prisma = require('../config/prisma');
const Stack = require('../data-structures/Stack');
const realtimeService = require('./realtime.service');
const { toSafePositiveInt } = require('../utils/helpers');

const CART_TTL_MS = 15 * 60 * 1000; // 15 minutos

// historial de acciones del carrito por userId (Stack en memoria)
const cartHistories = {};

const getCart = async (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  const cart = await prisma.cart.findUnique({
    where: { userId: safeUserId },
    include: {
      items: {
        include: {
          ticketType: {
            include: { concert: { include: { artist: true, venue: true } } },
          },
        },
      },
    },
  });

  if (!cart) return { items: [], total: 0 };
  if (new Date() > cart.expiresAt) {
    await prisma.cart.delete({ where: { userId: safeUserId } });
    return { items: [], total: 0, expired: true };
  }

  const total = cart.items.reduce(
    (sum, i) => sum + i.ticketType.price * i.quantity,
    0
  );

  return { ...cart, total };
};

const addItem = async (userId, { ticketTypeId, quantity }) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');
  const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');
  const safeQuantity = toSafePositiveInt(quantity, 'quantity');

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
  if (safeQuantity > ticketType.availableQuantity) {
    throw { status: 400, message: 'No hay suficientes boletas disponibles' };
  }

  // Registrar acción en el Stack de historial
  if (!cartHistories[safeUserId]) cartHistories[safeUserId] = new Stack();
  cartHistories[safeUserId].push({ action: 'ADD', ticketTypeId: safeTicketTypeId, quantity: safeQuantity, at: new Date() });

  const expiresAt = new Date(Date.now() + CART_TTL_MS);

  let cart = await prisma.cart.findUnique({ where: { userId: safeUserId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: safeUserId, expiresAt } });
  } else {
    cart = await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt } });
  }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_ticketTypeId: { cartId: cart.id, ticketTypeId: safeTicketTypeId } },
  });

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: safeQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, ticketTypeId: safeTicketTypeId, quantity: safeQuantity } });
  }

  // Sincronizar timer del carrito con Firebase
  realtimeService.syncCart(safeUserId, expiresAt).catch(() => {});

  return getCart(safeUserId);
};

const removeItem = async (userId, ticketTypeId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');
  const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');

  const cart = await prisma.cart.findUnique({ where: { userId: safeUserId } });
  if (!cart) throw { status: 404, message: 'Carrito no encontrado' };

  if (cartHistories[safeUserId]) {
    cartHistories[safeUserId].push({ action: 'REMOVE', ticketTypeId: safeTicketTypeId, at: new Date() });
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, ticketTypeId: safeTicketTypeId } });

  return getCart(safeUserId);
};

const clearCart = async (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  await prisma.cart.deleteMany({ where: { userId: safeUserId } });
  if (cartHistories[safeUserId]) cartHistories[safeUserId].push({ action: 'CLEAR', at: new Date() });
  realtimeService.clearCart(safeUserId).catch(() => {});
  return { items: [], total: 0 };
};

const getHistory = (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');
  return cartHistories[safeUserId] ? cartHistories[safeUserId].toArray() : [];
};

module.exports = { getCart, addItem, removeItem, clearCart, getHistory };
