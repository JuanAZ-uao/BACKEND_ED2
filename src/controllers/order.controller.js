const orderService = require('../services/order.service');

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getByUser(req.user.id);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const order = await orderService.getById(Number(req.params.id), req.user.id);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const order = await orderService.create(req.body, req.user.id);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const order = await orderService.cancel(Number(req.params.id), req.user.id);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyOrders, getById, create, cancel };
