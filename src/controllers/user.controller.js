const bcrypt = require('bcryptjs');
const { User, Ticket, PaymentMethod, NotificationPreference } = require('../models');
const { excludePassword, toSafeObjectId } = require('../utils/helpers');
const notificationService = require('../services/notification.service');

const getSafeAuthUserId = (req) => {
  const id = req?.user?.id;
  if (!id) throw { status: 401, message: 'Usuario no autenticado' };
  return id;
};

const getProfile = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: 'Usuario no encontrado' };
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const { firstName, lastName, phone, birthDate, gender, city, document, bio, avatarUrl } = req.body;

    const updates = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(gender !== undefined && { gender }),
      ...(city !== undefined && { city }),
      ...(document !== undefined && { document }),
      ...(bio !== undefined && { bio }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    };

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) throw { status: 404, message: 'Usuario no encontrado' };
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);

    const tickets = await Ticket.find({ userId })
      .populate({
        path: 'ticketTypeId',
        populate: [
          {
            path: 'concertId',
            populate: [
              { path: 'artistId' },
              { path: 'venueId' },
            ],
          },
        ],
      })
      .populate({ path: 'orderId', select: 'id createdAt totalAmount' })
      .sort({ createdAt: -1 });

    res.json(tickets.map((t) => {
      const obj = t.toJSON();
      obj.ticketType = obj.ticketTypeId;
      obj.order = obj.orderId;
      return obj;
    }));
  } catch (error) {
    next(error);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const methods = await PaymentMethod.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });
    res.json(methods.map((m) => m.toJSON()));
  } catch (error) {
    next(error);
  }
};

const addPaymentMethod = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const { lastFour, brand, expiryMonth, expiryYear, isPrimary } = req.body;

    if (isPrimary) {
      await PaymentMethod.updateMany({ userId }, { isPrimary: false });
    }

    const method = await PaymentMethod.create({
      userId,
      lastFour,
      brand,
      expiryMonth,
      expiryYear,
      isPrimary: isPrimary || false,
    });
    res.status(201).json(method.toJSON());
  } catch (error) {
    next(error);
  }
};

const deletePaymentMethod = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const paymentMethodId = toSafeObjectId(req.params.id, 'paymentMethodId');

    const method = await PaymentMethod.findOne({ _id: paymentMethodId, userId });
    if (!method) throw { status: 404, message: 'Método de pago no encontrado' };

    await PaymentMethod.findByIdAndDelete(paymentMethodId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId });
    }
    res.json(prefs.toJSON());
  } catch (error) {
    next(error);
  }
};

const updateNotifications = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: req.body },
      { upsert: true, new: true }
    );
    res.json(prefs.toJSON());
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(excludePassword));
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next({ status: 400, message: 'Contraseña actual y nueva son obligatorias' });
    }
    if (newPassword.length < 6) {
      return next({ status: 400, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const user = await User.findById(userId);
    if (!user) return next({ status: 404, message: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return next({ status: 400, message: 'La contraseña actual es incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashed });

    notificationService.create({
      userId,
      type: 'SECURITY',
      title: 'Contraseña actualizada',
      message: 'Tu contraseña fue cambiada exitosamente. Si no fuiste tú, contacta soporte.',
      link: '/profile',
    }).catch(() => {});

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getMyTickets,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  getNotifications,
  updateNotifications,
  changePassword,
  getAll,
};
