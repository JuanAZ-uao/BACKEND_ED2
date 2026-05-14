const cartService = require('../services/cart.service');
const { toSafeObjectId } = require('../utils/helpers');

const getSafeAuthUserId = (req) => toSafeObjectId(req?.user?.id, 'userId');

const getCart = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const cart = await cartService.getCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const cart = await cartService.addItem(userId, req.body);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const ticketTypeId = toSafeObjectId(req.params.ticketTypeId, 'ticketTypeId');
    const cart = await cartService.removeItem(userId, ticketTypeId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const cart = await cartService.clearCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addItem, removeItem, clearCart };
