const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const client = require('prom-client');
require('dotenv').config();

const noteRoutes = require('./routes/noteRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ── MONITORING SETUP (Stage 7): Prometheus metrics ───────────────────────────
// Collects default Node.js process metrics (CPU, memory, event loop lag, etc.)
// every 10 seconds, plus custom HTTP request duration and error counters.
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP requests that resulted in an error (4xx/5xx)',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestErrors);

// Middleware: times every request and records it against the histogram above
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    end({ method: req.method, route, status_code: res.statusCode });
    if (res.statusCode >= 400) {
      httpRequestErrors.inc({ method: req.method, route, status_code: res.statusCode });
    }
  });
  next();
});

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

// ── OPTIMIZATION 1 (Client-side): Response compression (gzip) ────────────────
app.use(compression({
  level: 6,
  threshold: 1024,
}));

// ── SECURITY FIX #1: Restrict CORS to trusted origins only ───────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
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

// ── Prometheus metrics endpoint ───────────────────────────────────────────────
// Prometheus scrapes this URL periodically to collect CPU, memory, and
// request-level metrics for the Grafana dashboard.
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Health check with client-side caching ────────────────────────────────────
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
