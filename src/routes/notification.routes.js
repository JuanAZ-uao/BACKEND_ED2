const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, controller.getAll);
router.patch('/read-all', authMiddleware, controller.markAllRead);
router.patch('/:id/read', authMiddleware, controller.markRead);

module.exports = router;
