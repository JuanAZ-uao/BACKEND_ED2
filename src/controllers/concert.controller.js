const concertService = require('../services/concert.service');

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
    const concert = await concertService.getById(Number(req.params.id));
    res.json(concert);
  } catch (error) {
    next(error);
  }
};

const getRelated = async (req, res, next) => {
  try {
    const related = await concertService.getRelated(Number(req.params.id));
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
    const concert = await concertService.update(Number(req.params.id), req.body);
    res.json(concert);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await concertService.remove(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, search, getById, getRelated, create, update, remove };
