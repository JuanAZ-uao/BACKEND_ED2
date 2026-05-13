const { Router } = require('express');
const authRoutes = require('./auth.routes');
const concertRoutes = require('./concert.routes');
const ticketRoutes = require('./ticket.routes');
const orderRoutes = require('./order.routes');
const userRoutes = require('./user.routes');
const cartRoutes = require('./cart.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/concerts', concertRoutes);
router.use('/tickets', ticketRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);

module.exports = router;
