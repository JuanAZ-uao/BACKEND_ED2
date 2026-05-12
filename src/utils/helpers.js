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

module.exports = { excludePassword, formatDate, formatPrice };
