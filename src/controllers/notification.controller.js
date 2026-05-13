const notificationService = require('../services/notification.service');

const getAll = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationService.getByUser(req.user.id),
      notificationService.countUnread(req.user.id),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    await notificationService.markRead(Number(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, markRead, markAllRead };
