const express = require('express');
const router = express.Router();
const multer = require('multer');
const MachineController = require('../controllers/MachineController');
const DowntimeController = require('../controllers/DowntimeController');
const { authenticate } = require('../middleware/auth');
const config = require('../config/env');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxFileSize }
});

// Smart upload middleware that handles both JSON and multipart/form-data
const handleUpload = (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('multipart/form-data')) return next();
    if (ct.includes('multipart/form-data') && !ct.includes('boundary=')) {
        return res.status(400).json({
            success: false,
            message: 'File upload error.',
            detail: 'Multipart boundary not found. Do NOT manually set Content-Type header in Postman.'
        });
    }
    upload.single('machine_image')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: 'File upload error.', detail: err.message });
        next();
    });
};

router.use(authenticate);

// ── Machine CRUD ──
router.post('/machines', handleUpload, MachineController.createMachine);
router.get('/machines', MachineController.getAllMachines);

// ── Aggregate Count APIs (must be before /:machineId routes) ──
router.get('/machines/production-count', MachineController.getAllMachinesProductionCount);
router.get('/machines/rejection-count', MachineController.getAllMachinesRejectionCount);

// ── Machine Details & Visualization ──
router.get('/machines/:machineId/details', MachineController.getMachineDetails);
router.get('/machines/:machineId/visualization', MachineController.getMachineVisualization);
router.get('/machines/:machineId/dashboard', MachineController.getDashboard);
router.get('/machines/:machineId/history', MachineController.getHistory);

// ── Production Analytics APIs ──
router.get('/machines/:machineId/production/hourly', MachineController.getHourlyProduction);
router.get('/machines/:machineId/production/daily', MachineController.getDailyProduction);
router.get('/machines/:machineId/production/custom', MachineController.getCustomProduction);

// ── Machine-Specific Count APIs ──
router.get('/machines/:machineId/production-count', MachineController.getMachineProductionCount);
router.get('/machines/:machineId/rejection-count', MachineController.getMachineRejectionCount);

// ── Machine Downtime ──
router.get('/machines/:machineId/downtime-analysis', DowntimeController.getDowntimeAnalysis);
router.get('/machines/:machineId/downtime', DowntimeController.getDowntimeHistory);
router.post('/machines/:machineId/downtime', DowntimeController.recordDowntime);

// ── Machine Operations ──
router.post('/machines/:machineId/stop', MachineController.stopMachine);

// ── Ingest API ──
router.post('/ingest/:pathId', MachineController.handleIngest);

module.exports = router;
