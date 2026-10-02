const express = require('express');
const Queue = require('../models/Queue');
const QueueEntry = require('../models/QueueEntry');
const auth = require('../middleware/auth');

const router = express.Router();

// Get queues for an organization (public)
router.get('/org/:orgId', async (req, res) => {
  try {
    const queues = await Queue.find({ organization: req.params.orgId })
      .populate('currentServing')
      .lean();

    // Attach waiting count to each queue
    const queuesWithCount = await Promise.all(
      queues.map(async (queue) => {
        const waitingCount = await QueueEntry.countDocuments({
          queue: queue._id,
          status: { $in: ['waiting', 'called'] },
        });
        return { ...queue, waitingCount };
      })
    );
    res.json(queuesWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single queue with full details (public)
router.get('/:id', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id)
      .populate('organization')
      .populate('currentServing');
    if (!queue) return res.status(404).json({ message: 'Queue not found' });

    const waitingCount = await QueueEntry.countDocuments({
      queue: queue._id,
      status: { $in: ['waiting', 'called'] },
    });

    res.json({ ...queue.toObject(), waitingCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create queue (staff only)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, avgServiceTime, maxCapacity } = req.body;
    const queue = await Queue.create({
      organization: req.staff.organization._id,
      name,
      description,
      avgServiceTime: avgServiceTime || 5,
      maxCapacity: maxCapacity || 100,
    });
    res.status(201).json(queue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update queue (staff only)
router.put('/:id', auth, async (req, res) => {
  try {
    const queue = await Queue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete queue (staff only)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Queue.findByIdAndDelete(req.params.id);
    await QueueEntry.deleteMany({ queue: req.params.id });
    res.json({ message: 'Queue deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get full queue entries (staff only)
router.get('/:id/entries', auth, async (req, res) => {
  try {
    const entries = await QueueEntry.find({
      queue: req.params.id,
      status: { $in: ['waiting', 'called', 'serving', 'on_hold'] },
    }).sort({ position: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
