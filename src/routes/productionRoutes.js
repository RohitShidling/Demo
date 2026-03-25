const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/ProductionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/production - Record production
router.post('/', ProductionController.recordProduction);

// POST /api/production/ingest - Ingest production data
router.post('/ingest', ProductionController.ingestProduction);

module.exports = router;
