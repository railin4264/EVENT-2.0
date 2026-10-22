const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/models/Event.js');
let content = fs.readFileSync(file, 'utf8');

const target = `  isTourOrTrip: { type: Boolean, default: false },
  tourDetails: {
    departurePoint: { type: String, trim: true },
    includes: [{ type: String, trim: true }]
  },`;

const addition = `  isTourOrTrip: { type: Boolean, default: false },
  tourDetails: {
    departurePoint: { type: String, trim: true },
    includes: [{ type: String, trim: true }]
  },
  // --- Módulo Familiar, Niños, Bebés & Maternidad Segura ---
  familyDetails: {
    isFamilyEvent: { type: Boolean, default: false },
    targetAudience: {
      type: String,
      enum: ['babies', 'toddlers', 'kids', 'teens', 'parents', 'all_family'],
      default: 'all_family'
    },
    ageMinMonths: { type: Number, min: 0 },
    ageMaxMonths: { type: Number, min: 0 },
    strollerAccessible: { type: Boolean, default: false },
    nursingRoomAvailable: { type: Boolean, default: false },
    diaperChangingStation: { type: Boolean, default: false },
    supervisionRequired: { type: Boolean, default: true },
    safetyNotes: { type: String, trim: true, maxlength: 300 }
  },
  holidaySeason: {
    type: String,
    enum: ['none', 'mothers_day', 'fathers_day', 'valentines', 'childrens_day', 'easter', 'christmas', 'new_year', 'halloween', 'summer'],
    default: 'none'
  },
  holidayLabel: { type: String, trim: true, maxlength: 60 },

  // --- Módulo Salud Comunitaria & Estudios Científicos Acreditados ---
  healthDetails: {
    isHealthInitiative: { type: Boolean, default: false },
    healthType: {
      type: String,
      enum: ['none', 'community_clinic', 'blood_drive', 'pediatric_care', 'vaccination', 'clinical_trial_info', 'preventive_screening'],
      default: 'none'
    },
    hospitalOrInstitution: { type: String, trim: true, maxlength: 120 },
    clinicalTrialId: { type: String, trim: true, maxlength: 60 },
    ethicsApprovalRef: { type: String, trim: true, maxlength: 120 },
    medicalDisclaimer: {
      type: String,
      trim: true,
      maxlength: 400,
      default: 'Iniciativa de salud o estudio clínico informativo. Toda intervención requiere evaluación médica profesional y consentimiento informado formal conforme a las regulaciones sanitarias.'
    }
  },`;

if (content.includes('isTourOrTrip: { type: Boolean, default: false },')) {
  content = content.replace(target, () => addition);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully added familyDetails, holidaySeason and healthDetails to Event.js');
} else {
  console.error('Target not found in Event.js');
}
