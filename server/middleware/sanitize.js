/**
 * Strips MongoDB query operators (keys starting with '$') from request inputs
 * to prevent NoSQL injection attacks. Applied as Express middleware before
 * routes process req.body, req.query, and req.params.
 */
const sanitize = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // strip operator keys
    clean[key] = typeof value === 'object' ? sanitize(value) : value;
  }
  return clean;
};

const mongoSanitize = (req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

module.exports = mongoSanitize;
