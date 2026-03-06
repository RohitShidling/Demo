const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────────────
// Public Routes (no authentication required)
// ─────────────────────────────────────────────────
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// ─────────────────────────────────────────────────
// Protected Routes (authentication required)
// ─────────────────────────────────────────────────
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getProfile);

module.exports = router;
