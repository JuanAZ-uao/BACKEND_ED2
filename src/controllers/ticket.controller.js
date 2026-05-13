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
    const seats = await ticketService.getSeatMap(Number(ticketTypeId));
    res.json(seats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getByConcert, reserve, cancel, verifyByCode, getSeatMap };
