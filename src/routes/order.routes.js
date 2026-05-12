const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', authMiddleware, orderController.getMyOrders);
router.get('/:id', authMiddleware, orderController.getById);
router.post('/', authMiddleware, orderController.create);
router.patch('/:id/cancel', authMiddleware, orderController.cancel);

module.exports = router;
