const express = require('express');
const router = express.Router();
const BusinessAuthController = require('../controllers/BusinessAuthController');
const { authenticate, authorizeUserType } = require('../middleware/auth');

// Public
router.post('/register/request-otp', BusinessAuthController.requestRegisterOtp);
router.post('/register', BusinessAuthController.register);
router.post('/login/request-otp', BusinessAuthController.requestLoginOtp);
router.post('/login', BusinessAuthController.login);
router.post('/refresh', BusinessAuthController.refreshToken);

// Protected - explicitly require 'business' user type
router.post('/logout', authenticate, authorizeUserType('business'), BusinessAuthController.logout);
router.get('/me', authenticate, authorizeUserType('business'), BusinessAuthController.getProfile);

module.exports = router;
