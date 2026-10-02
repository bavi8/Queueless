const express = require('express');
const Organization = require('../models/Organization');
const Queue = require('../models/Queue');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all organizations (public)
router.get('/', async (req, res) => {
  try {
    const orgs = await Organization.find().lean();
    // Attach active queue count
    const orgsWithQueues = await Promise.all(
      orgs.map(async (org) => {
        const queueCount = await Queue.countDocuments({ organization: org._id, status: 'active' });
        return { ...org, activeQueues: queueCount };
      })
    );
    res.json(orgsWithQueues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single organization by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update organization (staff only)
router.put('/:id', auth, async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
