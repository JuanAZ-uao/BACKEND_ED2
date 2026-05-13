const prisma = require('../config/prisma');
const BST = require('../data-structures/BST');
const Graph = require('../data-structures/Graph');
const { toSafePositiveInt } = require('../utils/helpers');

const concertBST = new BST();

const getAll = async ({ city, status, genre, isFeatured, thisWeek } = {}) => {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return prisma.concert.findMany({
    where: {
      ...(city && { venue: { city } }),
      status: status || 'PUBLISHED',
      ...(genre && { genres: { has: genre } }),
      ...(isFeatured === 'true' && { isFeatured: true }),
      ...(thisWeek === 'true' && { date: { gte: now, lte: weekEnd } }),
    },
    include: {
      artist: true,
      venue: true,
      ticketTypes: { orderBy: { price: 'asc' } },
    },
    orderBy: { date: 'asc' },
  });
};

// búsqueda por prefijo de artista o nombre del tour usando BST
const search = async (query = '') => {
  const concerts = await prisma.concert.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      artist: true,
      venue: true,
      ticketTypes: { orderBy: { price: 'asc' }, take: 1 },
    },
  });

  const bst = new BST();
  concerts.forEach((c) => {
    bst.insert(c.artist.name.toLowerCase(), c);
    bst.insert(c.tourName.toLowerCase(), c);
    // Insertar cada palabra del nombre para búsqueda parcial ("balv" encuentra "J Balvin")
    c.artist.name.toLowerCase().split(' ').forEach((word) => {
      if (word.length > 1) bst.insert(word, c);
    });
  });

  const q = query.toLowerCase();
  const results = bst.searchPrefix(q);

  // Deduplicar por id (un concierto puede estar registrado dos veces en el BST)
  const seen = new Set();
  return results.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
};

const getById = async (id) => {
  const safeConcertId = toSafePositiveInt(id, 'concertId');

  const concert = await prisma.concert.findUnique({
    where: { id: safeConcertId },
    include: {
      artist: true,
      venue: { include: { sections: true } },
      ticketTypes: { include: { section: true }, orderBy: { price: 'asc' } },
      reviews: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!concert) throw { status: 404, message: 'Concierto no encontrado' };
  return concert;
};

// conciertos relacionados por género, venue o artista usando Graph BFS
const getRelated = async (concertId) => {
  const safeConcertId = toSafePositiveInt(concertId, 'concertId');

  const concerts = await prisma.concert.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      artist: true,
      venue: true,
      ticketTypes: { orderBy: { price: 'asc' }, take: 1 },
    },
  });

  const graph = new Graph();
  concerts.forEach((c) => graph.addVertex(c.id));

  concerts.forEach((c1) => {
    concerts.forEach((c2) => {
      if (c1.id === c2.id) return;
      const sharedGenre = c1.genres.some((g) => c2.genres.includes(g));
      const sameVenue = c1.venueId === c2.venueId;
      const sameArtist = c1.artistId === c2.artistId;
      if (sharedGenre || sameVenue || sameArtist) graph.addEdge(c1.id, c2.id);
    });
  });

  const relatedIds = graph.bfs(safeConcertId, 2);
  return concerts
    .filter((c) => relatedIds.includes(c.id) && c.id !== safeConcertId)
    .slice(0, 6);
};

const create = async (data) => {
  return prisma.concert.create({
    data,
    include: { artist: true, venue: true },
  });
};

const update = async (id, data) => {
  const safeConcertId = toSafePositiveInt(id, 'concertId');

  return prisma.concert.update({
    where: { id: safeConcertId },
    data,
    include: { artist: true, venue: true },
  });
};

const remove = async (id) => {
  const safeConcertId = toSafePositiveInt(id, 'concertId');
  return prisma.concert.delete({ where: { id: safeConcertId } });
};

module.exports = { getAll, search, getById, getRelated, create, update, remove };
