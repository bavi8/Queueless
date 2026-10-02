const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['hospital', 'bank', 'salon', 'college', 'government', 'other'],
    required: true,
  },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  address: { type: String, default: '' },
  logo: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
