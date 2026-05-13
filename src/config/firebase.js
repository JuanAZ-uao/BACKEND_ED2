const admin = require('firebase-admin');
const path = require('path');

let db = null;

function initFirebase() {
  if (admin.apps.length > 0) return admin.database();

  const keyPath = path.join(__dirname, '../../prisma/firebase-admin-key.json');

  try {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    db = admin.database();
    console.log(' Firebase conectado');
  } catch {
    console.warn(' Firebase no disponible (falta firebase-admin-key.json)');
  }

  return db;
}

function getFirebaseDb() {
  return db;
}

module.exports = { initFirebase, getFirebaseDb };
