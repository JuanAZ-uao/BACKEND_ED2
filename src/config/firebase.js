const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;

function normalizePrivateKey(serviceAccount) {
  if (!serviceAccount?.private_key) return serviceAccount;

  return {
    ...serviceAccount,
    private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
  };
}

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv) {
    try {
      return normalizePrivateKey(JSON.parse(fromEnv));
    } catch {
      console.warn(' FIREBASE_SERVICE_ACCOUNT_JSON invalida');
    }
  }

  const keyPath = path.join(__dirname, '../../prisma/firebase-admin-key.json');
  if (!fs.existsSync(keyPath)) return null;

  try {
    const raw = fs.readFileSync(keyPath, 'utf8');
    return normalizePrivateKey(JSON.parse(raw));
  } catch {
    console.warn(' firebase-admin-key.json invalido');
    return null;
  }
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.database();

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn(' Firebase no disponible (falta credencial de servicio)');
    return db;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    db = admin.database();
    console.log(' Firebase conectado');
  } catch {
    console.warn(' Firebase no disponible (no se pudo inicializar)');
  }

  return db;
}

function getFirebaseDb() {
  return db;
}

module.exports = { initFirebase, getFirebaseDb };
