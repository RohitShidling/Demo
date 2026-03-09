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

router.use(authenticate);

// Machine CRUD
router.post('/machines', upload.any(), MachineController.createMachine);
router.get('/machines', MachineController.getAllMachines);

// Machine Details & Visualization
router.get('/machines/:machineId/details', MachineController.getMachineDetails);
router.get('/machines/:machineId/visualization', MachineController.getMachineVisualization);
router.get('/machines/:machineId/dashboard', MachineController.getDashboard);
router.get('/machines/:machineId/history', MachineController.getHistory);

// Machine Operations
router.post('/machines/:machineId/stop', MachineController.stopMachine);

// Ingest API
router.post('/ingest/:pathId', MachineController.handleIngest);

module.exports = router;
