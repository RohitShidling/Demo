const express = require('express');
const router = express.Router();
const multer = require('multer');
const ProductionController = require('../controllers/ProductionController');
const config = require('../config/env');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxFileSize }
});

router.post('/start', upload.single('machine_image'), ProductionController.startMachine);
router.post('/update', ProductionController.updateCount);
router.post('/stop', ProductionController.stopMachine);
router.get('/:machineId/history', ProductionController.getHistory);
router.get('/:machineId', ProductionController.getRealTime);

module.exports = router;
