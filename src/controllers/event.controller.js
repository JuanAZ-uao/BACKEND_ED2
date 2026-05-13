const eventService = require('../services/event.service');
const { toSafePositiveInt } = require('../utils/helpers');

const getAll = async (req, res, next) => {
  try {
    const events = await eventService.getAll(req.query);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await eventService.search(q);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const eventId = toSafePositiveInt(req.params.id, 'eventId');
    const event = await eventService.getById(eventId);
    res.json(event);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const event = await eventService.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const eventId = toSafePositiveInt(req.params.id, 'eventId');
    const event = await eventService.update(eventId, req.body);
    res.json(event);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const eventId = toSafePositiveInt(req.params.id, 'eventId');
    await eventService.remove(eventId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, search, getById, create, update, remove };
