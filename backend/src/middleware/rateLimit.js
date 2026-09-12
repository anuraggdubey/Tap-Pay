const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for username registration: 5 req/min per IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", details: "Too many registration attempts. Try again in 1 minute." },
});

/**
 * Rate limiter for session creation: 10 req/min per IP
 */
const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", details: "Too many session requests. Try again in 1 minute." },
});

module.exports = { registerLimiter, sessionLimiter };
