const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// Strict rate limiter for login — 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
  },
});

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required.').trim(),
    body('lastName').notEmpty().withMessage('Last name is required.').trim(),
    body('email')
      .isEmail().withMessage('A valid email address is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 10 }).withMessage('Password must be at least 10 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain at least one number.')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
    body('role')
      .isIn(['clinician', 'admin', 'patient'])
      .withMessage('Role must be one of: clinician, admin, patient.'),
  ],
  register
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  login
);

module.exports = router;
