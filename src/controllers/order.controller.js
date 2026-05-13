const orderService = require('../services/order.service');
const { toSafePositiveInt } = require('../utils/helpers');

const getSafeAuthUserId = (req) => toSafePositiveInt(req?.user?.id, 'userId');

const getMyOrders = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const orders = await orderService.getByUser(userId);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const orderId = toSafePositiveInt(req.params.id, 'orderId');
    const order = await orderService.getById(orderId, userId);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const order = await orderService.create(req.body, userId);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const orderId = toSafePositiveInt(req.params.id, 'orderId');
    const order = await orderService.cancel(orderId, userId);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyOrders, getById, create, cancel };
