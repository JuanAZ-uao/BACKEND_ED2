const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return phone;
  // Colombian numbers: add +57 prefix
  if (digits.length === 10) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`;
  return `+${digits}`;
};

const sendSMS = async (to, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    console.log(`[SMS no configurado] → ${to}: ${message}`);
    return;
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    const toFormatted = normalizePhone(to);
    await client.messages.create({ body: message, from: fromPhone, to: toFormatted });
    console.log(`[SMS] Enviado a ${toFormatted}`);
  } catch (err) {
    console.error(`[SMS] Error: ${err.message}`);
  }
};

module.exports = { sendSMS };
