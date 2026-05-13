const notificationService = require('../services/notification.service');
const { toSafePositiveInt } = require('../utils/helpers');

const getSafeAuthUserId = (req) => toSafePositiveInt(req?.user?.id, 'userId');

const getAll = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const [notifications, unreadCount] = await Promise.all([
      notificationService.getByUser(userId),
      notificationService.countUnread(userId),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notificationId = toSafePositiveInt(req.params.id, 'notificationId');
    const userId = getSafeAuthUserId(req);
    await notificationService.markRead(notificationId, userId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    await notificationService.markAllRead(userId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, markRead, markAllRead };
