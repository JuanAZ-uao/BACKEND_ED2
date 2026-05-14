const { Concert, Review } = require('../models');
const BST = require('../data-structures/BST');
const Graph = require('../data-structures/Graph');
const { toSafeObjectId } = require('../utils/helpers');

const getAll = async ({ city, status, genre, isFeatured, thisWeek } = {}) => {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const filter = {
    status: status || 'PUBLISHED',
    ...(genre && { genres: genre }),
    ...(isFeatured === 'true' && { isFeatured: true }),
    ...(thisWeek === 'true' && { date: { $gte: now, $lte: weekEnd } }),
  };

  const concerts = await Concert.find(filter)
    .populate('artistId', '-__v')
    .populate({ path: 'venueId', select: '-__v' })
    .sort({ date: 1 });

  if (city) {
    return concerts.filter((c) => {
      const venue = c.venueId;
      return venue && (typeof venue === 'object' ? venue.city === city : false);
    });
  }

  return concerts.map((c) => normalizePopulated(c.toJSON()));
};

// Búsqueda por prefijo de artista o nombre del tour usando BST
const search = async (query = '') => {
  const concerts = await Concert.find({ status: { $ne: 'CANCELLED' } })
    .populate('artistId')
    .populate('venueId');

  const { TicketType } = require('../models');
  const allTicketTypes = await TicketType.find({}).sort({ price: 1 });
  const ticketTypesByConvert = {};
  for (const tt of allTicketTypes) {
    const key = tt.concertId.toString();
    if (!ticketTypesByConvert[key]) ticketTypesByConvert[key] = [];
    ticketTypesByConvert[key].push(tt.toJSON());
  }

  const concertsWithTickets = concerts.map((c) => {
    const obj = c.toJSON();
    obj.ticketTypes = ticketTypesByConvert[obj.id] || [];
    return obj;
  });

  const bst = new BST();
  concertsWithTickets.forEach((c) => {
    const artistName = c.artistId?.name || '';
    bst.insert(artistName.toLowerCase(), c);
    bst.insert(c.tourName.toLowerCase(), c);
    artistName.toLowerCase().split(' ').forEach((word) => {
      if (word.length > 1) bst.insert(word, c);
    });
  });

  const q = query.toLowerCase();
  const results = bst.searchPrefix(q);

  const seen = new Set();
  return results.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
};

const getById = async (id) => {
  const safeId = toSafeObjectId(id, 'concertId');

  const { TicketType } = require('../models');

  const concert = await Concert.findById(safeId)
    .populate('artistId')
    .populate({
      path: 'venueId',
    });

  if (!concert) throw { status: 404, message: 'Concierto no encontrado' };

  const concertObj = concert.toJSON();

  const ticketTypes = await TicketType.find({ concertId: safeId }).sort({ price: 1 });
  concertObj.ticketTypes = ticketTypes.map((tt) => tt.toJSON());

  // Enriquecer ticketTypes con info de sección desde el venue
  const venue = concert.venueId;
  if (venue && typeof venue === 'object' && venue.sections) {
    const sectionsMap = {};
    venue.sections.forEach((s) => {
      sectionsMap[s._id?.toString() || s.id] = s;
    });
    concertObj.ticketTypes = concertObj.ticketTypes.map((tt) => ({
      ...tt,
      section: tt.sectionId ? sectionsMap[tt.sectionId.toString()] || null : null,
    }));
  }

  const reviews = await Review.find({ concertId: safeId })
    .populate({ path: 'userId', select: 'firstName lastName avatarUrl' })
    .sort({ createdAt: -1 });

  concertObj.reviews = reviews.map((r) => {
    const rev = r.toJSON();
    rev.user = rev.userId;
    delete rev.userId;
    return rev;
  });

  return concertObj;
};

// Conciertos relacionados por género, venue o artista usando Graph BFS
const getRelated = async (concertId) => {
  const safeId = toSafeObjectId(concertId, 'concertId');

  const { TicketType } = require('../models');
  const concerts = await Concert.find({ status: 'PUBLISHED' })
    .populate('artistId')
    .populate('venueId');

  const allTicketTypes = await TicketType.find({}).sort({ price: 1 });
  const ticketTypesByConvert = {};
  for (const tt of allTicketTypes) {
    const key = tt.concertId.toString();
    if (!ticketTypesByConvert[key]) ticketTypesByConvert[key] = [];
    if (ticketTypesByConvert[key].length === 0) ticketTypesByConvert[key].push(tt.toJSON());
  }

  const concertsData = concerts.map((c) => {
    const obj = c.toJSON();
    obj.ticketTypes = ticketTypesByConvert[obj.id] || [];
    return obj;
  });

  const graph = new Graph();
  concertsData.forEach((c) => graph.addVertex(c.id));

  concertsData.forEach((c1) => {
    concertsData.forEach((c2) => {
      if (c1.id === c2.id) return;
      const sharedGenre = c1.genres.some((g) => c2.genres.includes(g));
      const sameVenue = c1.venueId?.id === c2.venueId?.id;
      const sameArtist = c1.artistId?.id === c2.artistId?.id;
      if (sharedGenre || sameVenue || sameArtist) graph.addEdge(c1.id, c2.id);
    });
  });

  const relatedIds = graph.bfs(safeId, 2);
  return concertsData
    .filter((c) => relatedIds.includes(c.id) && c.id !== safeId)
    .slice(0, 6);
};

const normalizePopulated = (concertJSON) => concertJSON;

const create = async (data) => {
  const concert = await Concert.create(data);
  return concert.toJSON();
};

const update = async (id, data) => {
  const safeId = toSafeObjectId(id, 'concertId');
  const concert = await Concert.findByIdAndUpdate(safeId, data, { new: true })
    .populate('artistId')
    .populate('venueId');
  if (!concert) throw { status: 404, message: 'Concierto no encontrado' };
  return concert.toJSON();
};

const remove = async (id) => {
  const safeId = toSafeObjectId(id, 'concertId');
  const concert = await Concert.findByIdAndDelete(safeId);
  if (!concert) throw { status: 404, message: 'Concierto no encontrado' };
  return concert.toJSON();
};

module.exports = { getAll, search, getById, getRelated, create, update, remove };
