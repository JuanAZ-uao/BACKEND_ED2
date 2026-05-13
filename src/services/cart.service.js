const prisma = require('../config/prisma');
const Stack = require('../data-structures/Stack');
const realtimeService = require('./realtime.service');

const CART_TTL_MS = 15 * 60 * 1000; // 15 minutos

// historial de acciones del carrito por userId (Stack en memoria)
const cartHistories = {};

const getCart = async (userId) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
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
    await prisma.cart.delete({ where: { userId } });
    return { items: [], total: 0, expired: true };
  }

  const total = cart.items.reduce(
    (sum, i) => sum + i.ticketType.price * i.quantity,
    0
  );

  return { ...cart, total };
};

const addItem = async (userId, { ticketTypeId, quantity }) => {
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
  if (quantity > ticketType.availableQuantity) {
    throw { status: 400, message: 'No hay suficientes boletas disponibles' };
  }

  // Registrar acción en el Stack de historial
  if (!cartHistories[userId]) cartHistories[userId] = new Stack();
  cartHistories[userId].push({ action: 'ADD', ticketTypeId, quantity, at: new Date() });

  const expiresAt = new Date(Date.now() + CART_TTL_MS);

  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId, expiresAt } });
  } else {
    cart = await prisma.cart.update({ where: { id: cart.id }, data: { expiresAt } });
  }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_ticketTypeId: { cartId: cart.id, ticketTypeId } },
  });

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, ticketTypeId, quantity } });
  }

  // Sincronizar timer del carrito con Firebase
  realtimeService.syncCart(userId, expiresAt).catch(() => {});

  return getCart(userId);
};

const removeItem = async (userId, ticketTypeId) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw { status: 404, message: 'Carrito no encontrado' };

  if (cartHistories[userId]) {
    cartHistories[userId].push({ action: 'REMOVE', ticketTypeId, at: new Date() });
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, ticketTypeId } });

  return getCart(userId);
};

const clearCart = async (userId) => {
  await prisma.cart.deleteMany({ where: { userId } });
  if (cartHistories[userId]) cartHistories[userId].push({ action: 'CLEAR', at: new Date() });
  realtimeService.clearCart(userId).catch(() => {});
  return { items: [], total: 0 };
};

const getHistory = (userId) => {
  return cartHistories[userId] ? cartHistories[userId].toArray() : [];
};

module.exports = { getCart, addItem, removeItem, clearCart, getHistory };
