const { Router } = require('express');
const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.get('/concert/:concertId', ticketController.getByConcert);
router.post('/reserve', authMiddleware, ticketController.reserve);
router.delete('/:id/cancel', authMiddleware, ticketController.cancel);

module.exports = router;
