const { Notification } = require('../models');
const { toSafeObjectId, toSafePositiveInt } = require('../utils/helpers');

const create = async ({ userId, type, title, message, link = null }) => {
  const notification = await Notification.create({ userId, type, title, message, link });
  return notification.toJSON();
};

const getByUser = async (userId, limit = 30) => {
  const safeLimit = toSafePositiveInt(limit, 'limit');

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return notifications.map((n) => n.toJSON());
};

const markRead = async (id, userId) => {
  const safeId = toSafeObjectId(id, 'id');

  const result = await Notification.updateMany(
    { _id: safeId, userId },
    { read: true }
  );
  return result;
};

const markAllRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  return result;
};

const countUnread = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

module.exports = { create, getByUser, markRead, markAllRead, countUnread };
