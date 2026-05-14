const ticketService = require('../services/ticket.service');
const { toSafeObjectId } = require('../utils/helpers');

const getSafeAuthUserId = (req) => toSafeObjectId(req?.user?.id, 'userId');

const getByConcert = async (req, res, next) => {
  try {
    const concertId = toSafeObjectId(req.params.concertId, 'concertId');
    const tickets = await ticketService.getByConcert(concertId);
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

const reserve = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const ticket = await ticketService.reserve(req.body, userId);
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const ticketId = toSafeObjectId(req.params.id, 'ticketId');
    const userId = getSafeAuthUserId(req);
    await ticketService.cancel(ticketId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const verifyByCode = async (req, res, next) => {
  try {
    const ticket = await ticketService.verifyByCode(req.params.code);
    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

const getSeatMap = async (req, res, next) => {
  try {
    const { ticketTypeId } = req.query;
    if (!ticketTypeId) throw { status: 400, message: 'ticketTypeId requerido' };
    const safeTicketTypeId = toSafeObjectId(ticketTypeId, 'ticketTypeId');
    const seats = await ticketService.getSeatMap(safeTicketTypeId);
    res.json(seats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getByConcert, reserve, cancel, verifyByCode, getSeatMap };
