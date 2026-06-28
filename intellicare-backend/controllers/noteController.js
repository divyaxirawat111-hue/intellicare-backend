const { validationResult } = require('express-validator');
const Note = require('../models/Note');

// ── POST /api/notes ──────────────────────────────────────────────────────────
// Creates a new clinical note for a patient and appointment.
// Only clinicians can do this.
const createNote = async (req, res) => {
  // Check for validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { patientId, appointmentId, content, noteType } = req.body;
  const clinicianId = req.user.userId; // pulled from the verified JWT

  try {
    const note = new Note({
      patientId,
      appointmentId,
      clinicianId,
      content,
      noteType: noteType || 'soap',
      isEditable: true,
    });

    await note.save();

    return res.status(201).json({
      success: true,
      message: 'Clinical note created successfully.',
      data: {
        noteId: note._id,
        patientId: note.patientId,
        appointmentId: note.appointmentId,
        clinicianId: note.clinicianId,
        noteType: note.noteType,
        createdAt: note.createdAt,
      },
    });
  } catch (err) {
    console.error('Error creating note:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while saving the note.',
    });
  }
};

// ── GET /api/notes ───────────────────────────────────────────────────────────
// Returns a paginated list of notes for a given patient.
// Clinicians and admins can access this.
const listNotes = async (req, res) => {
  // Check for validation errors (e.g. missing patientId query param)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { patientId, appointmentId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // Build the query filter
    const filter = { patientId };
    if (appointmentId) filter.appointmentId = appointmentId;

    const total = await Note.countDocuments(filter);
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .select('-__v'); // hide the internal mongo version field

    // Truncate content to 200 chars for the list view
    // Full content is available at GET /api/notes/:noteId
    const noteSummaries = notes.map((note) => ({
      noteId: note._id,
      patientId: note.patientId,
      appointmentId: note.appointmentId,
      clinicianId: note.clinicianId,
      noteType: note.noteType,
      contentPreview: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
      isEditable: note.checkEditWindow(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        notes: noteSummaries,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching notes.',
    });
  }
};

// ── GET /api/notes/:noteId ───────────────────────────────────────────────────
// Returns the full content of a single note.
const getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId).select('-__v');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        noteId: note._id,
        patientId: note.patientId,
        appointmentId: note.appointmentId,
        clinicianId: note.clinicianId,
        content: note.content,
        noteType: note.noteType,
        aiSummaryId: note.aiSummaryId,
        isEditable: note.checkEditWindow(),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (err) {
    console.error('Error fetching note:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the note.',
    });
  }
};

module.exports = { createNote, listNotes, getNote };
