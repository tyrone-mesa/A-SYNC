const crypto = require('crypto');

// Generates a readable temporary password for admin-created accounts,
// e.g. "sync-4f9a2c1e". The admin shares this with the student to log in with.
const generateTempPassword = () => `sync-${crypto.randomBytes(5).toString('hex')}`;

module.exports = generateTempPassword;
