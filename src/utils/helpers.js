const excludePassword = (user) => {
  const { password, ...rest } = user;
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
  toSafeInt,
  toSafePositiveInt,
};
