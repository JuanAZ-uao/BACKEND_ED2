const mongoose = require('mongoose');

const excludePassword = (user) => {
  if (!user) return null;
  // Funciona con documentos Mongoose y objetos planos
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const { password, ...rest } = obj;
  return rest;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatPrice = (amount) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);

// Valida que un valor sea un ObjectId válido de MongoDB
const toSafeObjectId = (value, fieldName = 'id') => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) {
    throw { status: 400, message: `${fieldName} inválido` };
  }
  return String(value);
};

const toSafeInt = (value, fieldName = 'valor') => {
  if (typeof value === 'number' && Number.isInteger(value)) return value;

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  throw { status: 400, message: `${fieldName} inválido` };
};

const toSafePositiveInt = (value, fieldName = 'valor') => {
  const parsed = toSafeInt(value, fieldName);
  if (parsed <= 0) throw { status: 400, message: `${fieldName} inválido` };
  return parsed;
};

module.exports = {
  excludePassword,
  formatDate,
  formatPrice,
  toSafeObjectId,
  toSafeInt,
  toSafePositiveInt,
};
