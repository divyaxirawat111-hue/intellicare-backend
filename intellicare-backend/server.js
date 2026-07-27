const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const noteRoutes = require('./routes/noteRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

// ── OPTIMIZATION 1 (Client-side): Response compression (gzip) ────────────────
// Reduces response payload size by 70-90% for clients that support gzip.
// Improves perceived latency and reduces bandwidth costs on the client.
app.use(compression({
  level: 6,           // balance between speed and compression ratio
  threshold: 1024,    // only compress responses larger than 1KB
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General rate limiter (200 req / 15 min per IP) ───────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please slow down.' },
});
app.use(limiter);

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Database connection ──────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// ── Health check with client-side caching ────────────────────────────────────
// OPTIMIZATION 2 (Client-side): HTTP Cache-Control headers tell the client
// (browser, proxy, mobile app) to reuse the cached response for 60 seconds
// instead of hitting the network again. Vary header ensures gzip vs non-gzip
// responses are cached separately.
app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.set('Vary', 'Accept-Encoding');
  res.json({
    success: true,
    message: 'IntelliCare API is running',
    version: '1.0.0',
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on our end.' });
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`IntelliCare API running on port ${PORT}`);
});
