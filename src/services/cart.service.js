const { Cart, TicketType } = require('../models');
const Stack = require('../data-structures/Stack');
const realtimeService = require('./realtime.service');
const { toSafeObjectId, toSafePositiveInt } = require('../utils/helpers');

const CART_TTL_MS = 15 * 60 * 1000;

// Historial de acciones del carrito por userId (Stack en memoria)
const cartHistories = {};

const populateCartItems = {
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

const formatCart = (cart) => {
  if (!cart) return { items: [], total: 0 };
  const obj = cart.toJSON ? cart.toJSON() : cart;
  const total = (obj.items || []).reduce((sum, i) => {
    const price = i.ticketTypeId?.price ?? 0;
    return sum + price * i.quantity;
  }, 0);
  // Normalizar nombre del campo para compatibilidad
  obj.items = (obj.items || []).map((item) => ({
    ...item,
    ticketType: item.ticketTypeId,
  }));
  return { ...obj, total };
};

const getCart = async (userId) => {
  const cart = await Cart.findOne({ userId }).populate(populateCartItems);
  if (!cart) return { items: [], total: 0 };

  if (new Date() > cart.expiresAt) {
    await Cart.deleteOne({ userId });
    return { items: [], total: 0, expired: true };
  }

  return formatCart(cart);
};

const addItem = async (userId, { ticketTypeId, quantity }) => {
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
  if (safeQuantity > ticketType.availableQuantity) {
    throw { status: 400, message: 'No hay suficientes boletas disponibles' };
  }

  if (!cartHistories[userId]) cartHistories[userId] = new Stack();
  cartHistories[userId].push({ action: 'ADD', ticketTypeId: safeTicketTypeId, quantity: safeQuantity, at: new Date() });

  const expiresAt = new Date(Date.now() + CART_TTL_MS);

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      expiresAt,
      items: [{ ticketTypeId: safeTicketTypeId, quantity: safeQuantity }],
    });
  } else {
    cart.expiresAt = expiresAt;
    const existingItem = cart.items.find((i) => i.ticketTypeId.toString() === safeTicketTypeId);
    if (existingItem) {
      existingItem.quantity = safeQuantity;
    } else {
      cart.items.push({ ticketTypeId: safeTicketTypeId, quantity: safeQuantity });
    }
    await cart.save();
  }

  realtimeService.syncCart(userId, expiresAt).catch(() => {});

  return getCart(userId);
};

const removeItem = async (userId, ticketTypeId) => {
  const safeTicketTypeId = toSafeObjectId(ticketTypeId, 'ticketTypeId');

  const cart = await Cart.findOne({ userId });
  if (!cart) throw { status: 404, message: 'Carrito no encontrado' };

  if (cartHistories[userId]) {
    cartHistories[userId].push({ action: 'REMOVE', ticketTypeId: safeTicketTypeId, at: new Date() });
  }

  cart.items = cart.items.filter((i) => i.ticketTypeId.toString() !== safeTicketTypeId);
  await cart.save();

  return getCart(userId);
};

const clearCart = async (userId) => {
  await Cart.deleteOne({ userId });
  if (cartHistories[userId]) cartHistories[userId].push({ action: 'CLEAR', at: new Date() });
  realtimeService.clearCart(userId).catch(() => {});
  return { items: [], total: 0 };
};

const getHistory = (userId) => {
  return cartHistories[userId] ? cartHistories[userId].toArray() : [];
};

module.exports = { getCart, addItem, removeItem, clearCart, getHistory };
