const prisma = require('../config/prisma');
const { excludePassword } = require('../utils/helpers');

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
    });
    res.json(excludePassword(user));
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users.map(excludePassword));
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, getAll };
