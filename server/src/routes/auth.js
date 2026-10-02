const express = require('express');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');

const router = express.Router();

// Register staff + create org
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, orgName, orgType, orgDescription, orgAddress } = req.body;

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) return res.status(400).json({ message: 'Email already registered' });

    // Create org slug
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const org = await Organization.create({
      name: orgName,
      type: orgType,
      slug,
      description: orgDescription || '',
      address: orgAddress || '',
    });

    const staff = new Staff({ name, email, password, organization: org._id, role: 'admin' });
    await staff.save();

    // update org createdBy
    org.createdBy = staff._id;
    await org.save();

    const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        organization: org,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const staff = await Staff.findOne({ email }).populate('organization');
    if (!staff) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        organization: staff.organization,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current staff
router.get('/me', auth, async (req, res) => {
  res.json({
    staff: {
      _id: req.staff._id,
      name: req.staff.name,
      email: req.staff.email,
      role: req.staff.role,
      organization: req.staff.organization,
    },
  });
});

module.exports = router;
