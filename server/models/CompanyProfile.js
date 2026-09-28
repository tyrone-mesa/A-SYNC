const mongoose = require('mongoose');

const CompanyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    website: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    logoUrl: { type: String, default: '' }, // Auto-fetched from Clearbit
    companyUploadedLogo: { type: String, default: '' }, // Company's own uploaded logo
    isVerified: { type: Boolean, default: false }, // approved by admin
    verificationNote: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyProfile', CompanyProfileSchema);
