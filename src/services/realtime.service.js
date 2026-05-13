const { getFirebaseDb } = require('../config/firebase');

// Tiempo en ms que se muestra la notificación "reservando asiento"
const SEAT_NOTIFY_TTL = 30 * 1000; // 30 segundos

// escribe en Firebase el estado del carrito con su tiempo de expiración
const syncCart = async (userId, expiresAt) => {
  const db = getFirebaseDb();
  if (!db) return;

  await db.ref(`carts/${userId}`).set({
    expiresAt: new Date(expiresAt).getTime(),
    status: 'active',
    updatedAt: Date.now(),
  });

  // Programar limpieza automática cuando expira
  const msLeft = new Date(expiresAt) - Date.now();
  if (msLeft > 0) {
    setTimeout(async () => {
      await db.ref(`carts/${userId}`).update({ status: 'expired' });
    }, msLeft);
  }
};

// limpia el carrito de Firebase al confirmar o cancelar
const clearCart = async (userId) => {
  const db = getFirebaseDb();
  if (!db) return;
  await db.ref(`carts/${userId}`).remove();
};

// avisa en tiempo real que un asiento está siendo reservado
const notifySeatReserving = async (concertId, seatLabel, ticketTypeName, userId) => {
  const db = getFirebaseDb();
  if (!db) return;

  const ref = db.ref(`concerts/${concertId}/reserving/${seatLabel.replace('-', '_')}`);
  await ref.set({
    ticketTypeName,
    userId,
    at: Date.now(),
  });

  // Se elimina automáticamente a los 30 segundos si no se confirma
  setTimeout(async () => {
    const snapshot = await ref.once('value');
    if (snapshot.exists() && snapshot.val().userId === userId) {
      await ref.remove();
    }
  }, SEAT_NOTIFY_TTL);
};

// mueve el asiento de "reservando" a "vendido" en Firebase
const markSeatSold = async (concertId, seatLabel) => {
  const db = getFirebaseDb();
  if (!db) return;

  const key = seatLabel.replace('-', '_');
  await db.ref(`concerts/${concertId}/reserving/${key}`).remove();
  await db.ref(`concerts/${concertId}/sold/${key}`).set(true);
};

module.exports = { syncCart, clearCart, notifySeatReserving, markSeatSold };
