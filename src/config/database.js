const mongoose = require('mongoose');
const dns = require('dns');
// En cloud (Railway) conviene usar el DNS del runtime; solo sobreescribir si se define.
const customDnsServers = (process.env.MONGO_DNS_SERVERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (customDnsServers.length > 0) {
  dns.setServers(customDnsServers);
}

const resolveDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    const pathname = (parsed.pathname || '').replace(/^\/+/, '');
    return pathname || null;
  } catch {
    return null;
  }
};

// Plugin global: convierte _id → id y elimina __v en todas las respuestas
mongoose.plugin((schema) => {
  const transform = (doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  };
  schema.set('toJSON', { virtuals: false, transform });
  schema.set('toObject', { virtuals: false, transform });
});

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Define MONGO_URI o MONGODB_URI en variables de entorno');

  const dbName = process.env.MONGO_DB_NAME || resolveDbNameFromUri(uri) || 'concertix';

  await mongoose.connect(uri, { dbName });
  console.log(` MongoDB conectado: ${mongoose.connection.host} (db: ${dbName})`);
};

module.exports = { connectDB };
