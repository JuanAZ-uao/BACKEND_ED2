const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.delete('/items/:ticketTypeId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
