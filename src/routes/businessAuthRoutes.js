const express = require('express');
const router = express.Router();
const BusinessAuthController = require('../controllers/BusinessAuthController');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/register', BusinessAuthController.register);
router.post('/login', BusinessAuthController.login);
router.post('/refresh', BusinessAuthController.refreshToken);

// Protected
router.post('/logout', authenticate, BusinessAuthController.logout);
router.get('/me', authenticate, BusinessAuthController.getProfile);

module.exports = router;
