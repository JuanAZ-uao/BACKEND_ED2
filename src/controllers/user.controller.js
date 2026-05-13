const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { excludePassword, toSafePositiveInt } = require('../utils/helpers');
const notificationService = require('../services/notification.service');

const getSafeAuthUserId = (req) => toSafePositiveInt(req?.user?.id, 'userId');

const getProfile = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const { firstName, lastName, phone, birthDate, gender, city, document, bio, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(gender !== undefined && { gender }),
        ...(city !== undefined && { city }),
        ...(document !== undefined && { document }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const getMyTickets = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        ticketType: {
          include: {
            concert: { include: { artist: true, venue: true } },
            section: true,
          },
        },
        order: { select: { id: true, createdAt: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const methods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(methods);
  } catch (error) {
    next(error);
  }
};

const addPaymentMethod = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const { lastFour, brand, expiryMonth, expiryYear, isPrimary } = req.body;

    if (isPrimary) {
      await prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        userId,
        lastFour,
        brand,
        expiryMonth,
        expiryYear,
        isPrimary: isPrimary || false,
      },
    });
    res.status(201).json(method);
  } catch (error) {
    next(error);
  }
};

const deletePaymentMethod = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const paymentMethodId = toSafePositiveInt(req.params.id, 'paymentMethodId');

    const method = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });
    if (!method) throw { status: 404, message: 'Método de pago no encontrado' };

    await prisma.paymentMethod.delete({ where: { id: method.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId },
      });
    }
    res.json(prefs);
  } catch (error) {
    next(error);
  }
};

const updateNotifications = async (req, res, next) => {
  try {
    const userId = getSafeAuthUserId(req);
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: req.body,
      create: { userId, ...req.body },
    });
    res.json(prefs);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return next({ status: 400, message: 'La contraseña actual es incorrecta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
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
