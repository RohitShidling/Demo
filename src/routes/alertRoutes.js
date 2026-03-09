const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/AlertController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', AlertController.getAlerts);

module.exports = router;
