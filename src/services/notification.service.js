const prisma = require('../config/prisma');

const create = async ({ userId, type, title, message, link = null }) => {
  return prisma.notification.create({
    data: { userId, type, title, message, link },
  });
};

const getByUser = async (userId, limit = 30) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

const markRead = async (id, userId) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
};

const markAllRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

const countUnread = async (userId) => {
  return prisma.notification.count({ where: { userId, read: false } });
};

module.exports = { create, getByUser, markRead, markAllRead, countUnread };
