const express = require('express');
const router = express.Router();
const multer = require('multer');
const MachineController = require('../controllers/MachineController');
const config = require('../config/env');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxFileSize }
});

// Machine Configuration
router.post('/machines', upload.single('machine_image'), MachineController.createMachine);

// Machine Operations
// router.post('/machines/:machineId/stop', MachineController.stopMachine); 
// User asked for "Stop machine API". restful: POST /machines/:id/stop or PUT /machines/:id {status: stopped}
router.post('/machines/:machineId/stop', MachineController.stopMachine);

// Data Retrieval
router.get('/machines/:machineId/dashboard', MachineController.getDashboard);
router.get('/machines/:machineId/history', MachineController.getHistory);

// Ingest API (The event-driven part)
// Route: /ingest/:pathId  -> accepts data for that path
// Example: /ingest/press-01
router.post('/ingest/:pathId', MachineController.handleIngest);

module.exports = router;
