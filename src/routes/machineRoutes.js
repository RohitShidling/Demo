const express = require('express');
const router = express.Router();
const multer = require('multer');
const MachineController = require('../controllers/MachineController');
const { authenticate } = require('../middleware/auth');
const config = require('../config/env');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxFileSize }
});

// ─────────────────────────────────────────────────
// All machine routes require authentication
// ─────────────────────────────────────────────────

// Machine Configuration
router.post('/machines', authenticate, upload.any(), MachineController.createMachine);
router.get('/machines', authenticate, MachineController.getAllMachines);

// Machine Operations
router.post('/machines/:machineId/stop', authenticate, MachineController.stopMachine);

// Data Retrieval
router.get('/machines/:machineId/dashboard', authenticate, MachineController.getDashboard);
router.get('/machines/:machineId/history', authenticate, MachineController.getHistory);

// Ingest API (The event-driven part)
// Note: Ingest is also protected - only authenticated users/systems can push data
router.post('/ingest/:pathId', authenticate, MachineController.handleIngest);

module.exports = router;
