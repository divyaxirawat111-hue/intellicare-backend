const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { firstName, lastName, email, password, role } = req.body;

  try {
    // Check if email is already registered
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists.',
      });
    }

    const user = new User({ firstName, lastName, email, password, role });
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Generic message — don't reveal which field was wrong
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Sign a JWT valid for 15 minutes
    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      data: {
        accessToken: token,
        user: {
          userId: user._id,
          firstName: user.firstName,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

module.exports = { register, login };
