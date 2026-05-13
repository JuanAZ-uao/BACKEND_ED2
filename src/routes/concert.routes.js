const { Router } = require('express');
const concertController = require('../controllers/concert.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

router.get('/', concertController.getAll);
router.get('/search', concertController.search);
router.get('/:id', concertController.getById);
router.get('/:id/related', concertController.getRelated);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), concertController.create);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), concertController.update);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), concertController.remove);

module.exports = router;
