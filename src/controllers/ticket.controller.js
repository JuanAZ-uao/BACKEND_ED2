const ticketService = require('../services/ticket.service');

const getByConcert = async (req, res, next) => {
  try {
    const tickets = await ticketService.getByConcert(Number(req.params.concertId));
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

const reserve = async (req, res, next) => {
  try {
    const ticket = await ticketService.reserve(req.body, req.user.id);
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    await ticketService.cancel(Number(req.params.id), req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getByConcert, reserve, cancel };
