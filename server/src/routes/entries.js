const express = require('express');
const QueueEntry = require('../models/QueueEntry');
const Queue = require('../models/Queue');

const router = express.Router();

// Join a queue (public)
router.post('/join', async (req, res) => {
  try {
    const { queueId, name, phone, guestId } = req.body;

    const queue = await Queue.findById(queueId);
    if (!queue) return res.status(404).json({ message: 'Queue not found' });
    if (queue.status === 'closed') return res.status(400).json({ message: 'Queue is closed' });

    // Check if already in queue
    const existing = await QueueEntry.findOne({
      queue: queueId,
      guestId,
      status: { $in: ['waiting', 'called', 'serving', 'on_hold'] },
    });
    if (existing) return res.json({ entry: existing, alreadyInQueue: true });

    // Get next position
    const lastEntry = await QueueEntry.findOne({
      queue: queueId,
      status: { $nin: ['completed', 'skipped', 'left'] },
    }).sort({ position: -1 });

    const position = lastEntry ? lastEntry.position + 1 : 1;

    const entry = await QueueEntry.create({
      queue: queueId,
      guestId,
      name,
      phone,
      position,
    });

    res.status(201).json({ entry, alreadyInQueue: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get entry status (public - by guestId)
router.get('/status/:queueId/:guestId', async (req, res) => {
  try {
    const { queueId, guestId } = req.params;
    const entry = await QueueEntry.findOne({
      queue: queueId,
      guestId,
      status: { $nin: ['completed', 'skipped', 'left'] },
    }).populate('queue');

    if (!entry) return res.status(404).json({ message: 'Not in queue' });

    // Count people ahead
    const ahead = await QueueEntry.countDocuments({
      queue: queueId,
      position: { $lt: entry.position },
      status: { $in: ['waiting', 'called', 'on_hold'] },
    });

    const queue = await Queue.findById(queueId);
    const eta = ahead * (queue.avgServiceTime || 5);

    res.json({ entry, ahead, eta });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave queue (public)
router.delete('/leave/:entryId', async (req, res) => {
  try {
    const entry = await QueueEntry.findByIdAndUpdate(
      req.params.entryId,
      { status: 'left' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Left queue successfully', entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
