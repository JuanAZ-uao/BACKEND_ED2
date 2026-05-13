const ticketService = require('../services/ticket.service');
const { toSafePositiveInt } = require('../utils/helpers');

const getSafeAuthUserId = (req) => toSafePositiveInt(req?.user?.id, 'userId');

const getByConcert = async (req, res, next) => {
  try {
    const concertId = toSafePositiveInt(req.params.concertId, 'concertId');
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
    const ticketId = toSafePositiveInt(req.params.id, 'ticketId');
    const userId = getSafeAuthUserId(req);
    await ticketService.cancel(ticketId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const verifyByCode = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: req.params.code },
      include: {
        user: { select: { firstName: true, lastName: true, city: true } },
        ticketType: {
          include: {
            concert: { include: { artist: true, venue: true } },
            section: true,
          },
        },
        order: { select: { id: true, createdAt: true, totalAmount: true } },
      },
    });
    if (!ticket) throw { status: 404, message: 'Boleta no encontrada' };
    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

const getSeatMap = async (req, res, next) => {
  try {
    const { ticketTypeId } = req.query;
    if (!ticketTypeId) throw { status: 400, message: 'ticketTypeId requerido' };
    const safeTicketTypeId = toSafePositiveInt(ticketTypeId, 'ticketTypeId');
    const seats = await ticketService.getSeatMap(safeTicketTypeId);
    res.json(seats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getByConcert, reserve, cancel, verifyByCode, getSeatMap };
