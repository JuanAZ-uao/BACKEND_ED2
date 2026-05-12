const { Router } = require('express');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const ticketRoutes = require('./ticket.routes');
const orderRoutes = require('./order.routes');
const userRoutes = require('./user.routes');
const cartRoutes = require('./cart.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);

module.exports = router;
