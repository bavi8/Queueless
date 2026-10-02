const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
  guestId: { type: String, required: true }, // browser-generated ID for guest users
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  position: { type: Number, required: true },
  status: {
    type: String,
    enum: ['waiting', 'called', 'serving', 'completed', 'skipped', 'on_hold', 'left'],
    default: 'waiting',
  },
  joinedAt: { type: Date, default: Date.now },
  calledAt: { type: Date, default: null },
  servedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  socketId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
