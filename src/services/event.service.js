const { Event } = require('../models');
const BST = require('../data-structures/BST');
const { toSafeObjectId } = require('../utils/helpers');

const eventBST = new BST();

const getAll = async ({ city, status } = {}) => {
  const filter = { status: status || 'PUBLISHED' };

  const events = await Event.find(filter)
    .populate('venueId')
    .sort({ date: 'asc' });

  if (city) {
    return events.filter((e) => {
      const venue = e.venueId;
      return venue && typeof venue === 'object' && venue.city === city;
    }).map((e) => e.toJSON());
  }

  return events.map((e) => e.toJSON());
};

const search = async (query = '') => {
  const events = await Event.find({ status: { $ne: 'CANCELLED' } })
    .populate('venueId');

  events.forEach((e) => {
    const obj = e.toJSON();
    eventBST.insert(obj.name.toLowerCase(), obj);
  });

  return eventBST.searchPrefix(query.toLowerCase());
};

const getById = async (id) => {
  const safeId = toSafeObjectId(id, 'eventId');

  const event = await Event.findById(safeId).populate('venueId');
  if (!event) throw { status: 404, message: 'Evento no encontrado' };
  return event.toJSON();
};

const create = async (data) => {
  const event = await Event.create(data);
  return event.toJSON();
};

const update = async (id, data) => {
  const safeId = toSafeObjectId(id, 'eventId');
  const event = await Event.findByIdAndUpdate(safeId, data, { new: true }).populate('venueId');
  if (!event) throw { status: 404, message: 'Evento no encontrado' };
  return event.toJSON();
};

const remove = async (id) => {
  const safeId = toSafeObjectId(id, 'eventId');
  const event = await Event.findByIdAndDelete(safeId);
  if (!event) throw { status: 404, message: 'Evento no encontrado' };
  return event.toJSON();
};

module.exports = { getAll, search, getById, create, update, remove };
