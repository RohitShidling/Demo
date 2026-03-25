const express = require('express');
const router = express.Router();
const QualityController = require('../controllers/QualityController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/quality/inspection - Record inspection
router.post('/inspection', QualityController.recordInspection);

// GET /api/quality/reports - Get quality reports
router.get('/reports', QualityController.getReports);

module.exports = router;
