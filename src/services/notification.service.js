const prisma = require('../config/prisma');
const { toSafePositiveInt } = require('../utils/helpers');

const create = async ({ userId, type, title, message, link = null }) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  return prisma.notification.create({
    data: { userId: safeUserId, type, title, message, link },
  });
};

const getByUser = async (userId, limit = 30) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');
  const safeLimit = toSafePositiveInt(limit, 'limit');

  return prisma.notification.findMany({
    where: { userId: safeUserId },
    orderBy: { createdAt: 'desc' },
    take: safeLimit,
  });
};

const markRead = async (id, userId) => {
  const safeId = toSafePositiveInt(id, 'id');
  const safeUserId = toSafePositiveInt(userId, 'userId');

  return prisma.notification.updateMany({
    where: { id: safeId, userId: safeUserId },
    data: { read: true },
  });
};

const markAllRead = async (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');

  return prisma.notification.updateMany({
    where: { userId: safeUserId, read: false },
    data: { read: true },
  });
};

const countUnread = async (userId) => {
  const safeUserId = toSafePositiveInt(userId, 'userId');
  return prisma.notification.count({ where: { userId: safeUserId, read: false } });
};

module.exports = { create, getByUser, markRead, markAllRead, countUnread };
