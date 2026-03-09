const express = require('express');
const router = express.Router();
const OperatorAuthController = require('../controllers/OperatorAuthController');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/register', OperatorAuthController.register);
router.post('/login', OperatorAuthController.login);
router.post('/refresh', OperatorAuthController.refreshToken);

// Protected
router.post('/logout', authenticate, OperatorAuthController.logout);
router.get('/me', authenticate, OperatorAuthController.getProfile);

module.exports = router;
