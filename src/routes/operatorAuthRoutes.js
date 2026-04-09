const express = require('express');
const router = express.Router();
const OperatorAuthController = require('../controllers/OperatorAuthController');
const { authenticate, authorizeUserType } = require('../middleware/auth');

// Public
router.post('/register', OperatorAuthController.register);
router.post('/login', OperatorAuthController.login);
router.post('/refresh', OperatorAuthController.refreshToken);

// Protected - explicitly require 'operator' user type
router.post('/logout', authenticate, authorizeUserType('operator'), OperatorAuthController.logout);
router.get('/me', authenticate, authorizeUserType('operator'), OperatorAuthController.getProfile);

module.exports = router;
