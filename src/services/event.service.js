const prisma = require('../config/prisma');
const BST = require('../data-structures/BST');

const eventBST = new BST();

const getAll = async ({ categoryId, city, status } = {}) => {
  return prisma.event.findMany({
    where: {
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...(city && { venue: { city } }),
      status: status || 'PUBLISHED',
    },
    include: {
      venue: true,
      category: true,
      artists: { include: { artist: true }, orderBy: { order: 'asc' } },
      ticketTypes: { orderBy: { price: 'asc' } },
    },
    orderBy: { date: 'asc' },
  });
};

// Usa el BST para búsqueda por prefijo de nombre (estructura de datos requerida)
const search = async (query = '') => {
  const events = await prisma.event.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: { venue: true, category: true, ticketTypes: { orderBy: { price: 'asc' } } },
  });

  events.forEach((e) => eventBST.insert(e.name.toLowerCase(), e));

  return eventBST.searchPrefix(query.toLowerCase());
};

const getById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: { include: { sections: true } },
      category: true,
      artists: { include: { artist: true }, orderBy: { order: 'asc' } },
      ticketTypes: { include: { section: true }, orderBy: { price: 'asc' } },
      reviews: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!event) throw { status: 404, message: 'Evento no encontrado' };
  return event;
};

const create = async (data) => {
  return prisma.event.create({
    data,
    include: { venue: true, category: true },
  });
};

const update = async (id, data) => {
  return prisma.event.update({
    where: { id },
    data,
    include: { venue: true, category: true },
  });
};

const remove = async (id) => {
  return prisma.event.delete({ where: { id } });
};

module.exports = { getAll, search, getById, create, update, remove };
