const Contact = require('../models/Contact');

async function updateContactStats(contactIds, delta) {
  const ids = (contactIds || []).filter(Boolean);
  if (!ids.length) return;
  await Contact.updateMany({ _id: { $in: ids } }, { $inc: delta });
}

module.exports = { updateContactStats };
