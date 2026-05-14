const mongoose = require('mongoose');
const dns = require('dns');
// Usar Google DNS para resolver registros SRV de MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

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

  await mongoose.connect(uri);
  console.log(' MongoDB conectado:', mongoose.connection.host);
};

module.exports = { connectDB };
