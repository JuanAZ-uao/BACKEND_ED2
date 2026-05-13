const concertService = require('../services/concert.service');
const { toSafePositiveInt } = require('../utils/helpers');

const getAll = async (req, res, next) => {
  try {
    const concerts = await concertService.getAll(req.query);
    res.json(concerts);
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await concertService.search(q);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const concertId = toSafePositiveInt(req.params.id, 'concertId');
    const concert = await concertService.getById(concertId);
    res.json(concert);
  } catch (error) {
    next(error);
  }
};

const getRelated = async (req, res, next) => {
  try {
    const concertId = toSafePositiveInt(req.params.id, 'concertId');
    const related = await concertService.getRelated(concertId);
    res.json(related);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const concert = await concertService.create(req.body);
    res.status(201).json(concert);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const concertId = toSafePositiveInt(req.params.id, 'concertId');
    const concert = await concertService.update(concertId, req.body);
    res.json(concert);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const concertId = toSafePositiveInt(req.params.id, 'concertId');
    await concertService.remove(concertId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, search, getById, getRelated, create, update, remove };
