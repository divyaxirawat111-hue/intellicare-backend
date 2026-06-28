const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required.'],
      trim: true,
    },
    appointmentId: {
      type: String,
      required: [true, 'Appointment ID is required.'],
      trim: true,
    },
    clinicianId: {
      type: String,
      required: [true, 'Clinician ID is required.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Note content is required.'],
      maxlength: [20000, 'Note content cannot exceed 20,000 characters.'],
      trim: true,
    },
    noteType: {
      type: String,
      enum: ['soap', 'progress', 'referral', 'discharge'],
      default: 'soap',
    },
    // true for the first 24 hours after creation, then locked
    isEditable: {
      type: Boolean,
      default: true,
    },
    // will be populated once AI summary is generated (future feature)
    aiSummaryId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// After 24 hours, mark the note as no longer editable.
// This is checked in the controller before allowing edits.
noteSchema.methods.checkEditWindow = function () {
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  return hoursSinceCreation <= 24;
};

module.exports = mongoose.model('Note', noteSchema);
