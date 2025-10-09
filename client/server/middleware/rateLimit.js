const rateLimit = require('express-rate-limit');

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many email submissions from this IP, please try again later.'
  }
});

module.exports = { emailLimiter };