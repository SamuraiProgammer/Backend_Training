// routes/user.route.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');   // Adjust path if your model is elsewhere

// Import Controller (we'll create this next if you want)
const {
  registerUser,
  getAllUsers,
  loginAdmin,
  deleteUser,
} = require('../controllers/User.controller.js');
const { requireAdminAuth } = require('../middlewares/adminAuth');

// ====================== ROUTES ======================

// POST - Register a new user
router.post('/register', registerUser);
router.post('/login', loginAdmin);



// GET - Get all users (for admin/dashboard - use with caution in production)
router.get('/', requireAdminAuth, getAllUsers);
router.delete('/:id', requireAdminAuth, deleteUser);

// GET - Get single user by ID
//router.get('/:id', getUserById);

// DELETE - Delete a user (optional - usually protected)
//router.delete('/:id', deleteUser);

module.exports = router;
