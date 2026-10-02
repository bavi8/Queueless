const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'paused', 'closed'], default: 'active' },
  currentServing: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueEntry', default: null },
  avgServiceTime: { type: Number, default: 5 }, // in minutes
  maxCapacity: { type: Number, default: 100 },
  autoCallNext: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Queue', queueSchema);
