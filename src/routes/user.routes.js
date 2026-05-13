const { Router } = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

router.get('/me', authMiddleware, userController.getProfile);
router.put('/me', authMiddleware, userController.updateProfile);
router.get('/me/tickets', authMiddleware, userController.getMyTickets);
router.get('/me/payment-methods', authMiddleware, userController.getPaymentMethods);
router.post('/me/payment-methods', authMiddleware, userController.addPaymentMethod);
router.delete('/me/payment-methods/:id', authMiddleware, userController.deletePaymentMethod);
router.get('/me/notifications', authMiddleware, userController.getNotifications);
router.put('/me/notifications', authMiddleware, userController.updateNotifications);
router.get('/', authMiddleware, roleMiddleware('ADMIN'), userController.getAll);

module.exports = router;
