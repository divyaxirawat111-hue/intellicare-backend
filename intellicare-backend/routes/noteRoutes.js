const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { createNote, listNotes, getNote } = require('../controllers/noteController');

const router = express.Router();

// ── POST /api/notes ──────────────────────────────────────────────────────────
// Create a new clinical note.
// Only clinicians can do this.
router.post(
  '/',
  authenticateToken,
  requireRole('clinician'),
  [
    body('patientId')
      .notEmpty().withMessage('patientId is required.')
      .trim(),
    body('appointmentId')
      .notEmpty().withMessage('appointmentId is required.')
      .trim(),
    body('content')
      .notEmpty().withMessage('Note content is required.')
      .isLength({ max: 20000 }).withMessage('Note content cannot exceed 20,000 characters.')
      .trim(),
    body('noteType')
      .optional()
      .isIn(['soap', 'progress', 'referral', 'discharge'])
      .withMessage('noteType must be one of: soap, progress, referral, discharge.'),
  ],
  createNote
);

// ── GET /api/notes ───────────────────────────────────────────────────────────
// List all notes for a patient (paginated).
// Clinicians and admins can access this.
router.get(
  '/',
  authenticateToken,
  requireRole('clinician', 'admin'),
  [
    query('patientId')
      .notEmpty().withMessage('patientId query parameter is required.'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('page must be a positive integer.'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  ],
  listNotes
);

// ── GET /api/notes/:noteId ───────────────────────────────────────────────────
// Get the full content of a single note.
router.get(
  '/:noteId',
  authenticateToken,
  requireRole('clinician', 'admin'),
  [
    param('noteId')
      .notEmpty().withMessage('noteId is required.'),
  ],
  getNote
);

module.exports = router;
