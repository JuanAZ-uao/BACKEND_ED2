const { Router } = require('express');
const eventController = require('../controllers/event.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

router.get('/', eventController.getAll);
router.get('/search', eventController.search);
router.get('/:id', eventController.getById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), eventController.create);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), eventController.update);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), eventController.remove);

module.exports = router;
