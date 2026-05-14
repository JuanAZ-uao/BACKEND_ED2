const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const { excludePassword } = require('../utils/helpers');

const generateTokens = (user) => {
  const payload = { id: user.id || user._id.toString(), role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

  return { accessToken, refreshToken };
};

const saveRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.deleteMany({ userId });
  await RefreshToken.create({ token: refreshToken, userId, expiresAt });
};

const register = async ({ firstName, lastName, email, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw { status: 409, message: 'El email ya está registrado' };

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ firstName, lastName, email, password: hashed });

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken, user: excludePassword(user) };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { status: 401, message: 'Credenciales inválidas' };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: 'Credenciales inválidas' };

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken, user: excludePassword(user) };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) throw { status: 401, message: 'Refresh token no proporcionado' };

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Refresh token inválido o expirado' };
  }

  const stored = await RefreshToken.findOne({ token: refreshToken });
  if (!stored || new Date() > stored.expiresAt) {
    throw { status: 401, message: 'Sesión expirada, inicia sesión nuevamente' };
  }

  const user = await User.findById(decoded.id);
  if (!user) throw { status: 401, message: 'Usuario no encontrado' };

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await saveRefreshToken(user._id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

module.exports = { register, login, refresh, logout };
