const express = require('express');
const router = express.Router();
const multer = require('multer');
const MachineController = require('../controllers/MachineController');
const OEEController = require('../controllers/OEEController');
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
    console.log('[handleUpload] Content-Type:', ct);

    if (!ct.includes('multipart/form-data')) {
        console.log('[handleUpload] Not multipart, skipping multer');
        return next();
    }

    if (ct.includes('multipart/form-data') && !ct.includes('boundary=')) {
        console.error('[handleUpload] Missing multipart boundary format in headers');
        return res.status(400).json({
            success: false,
            message: 'File upload error.',
            detail: 'Multipart boundary not found. If using Postman, DO NOT manually set the Content-Type header in the Headers tab. Leave it unchecked so Postman auto-generates the boundary.'
        });
    }

    console.log('[handleUpload] Multipart detected, running multer...');

    upload.single('machine_image')(req, res, (err) => {
        if (err) {
            console.error('[handleUpload] Multer error:', err.message);
            let detailMessage = err.message;
            if (err.message === 'Malformed part header') {
                detailMessage = 'Malformed part header. Solution: 1) Delete this request in Postman. 2) Create a brand new request. 3) Under Body -> form-data, re-type the keys. 4) Do NOT set Content-Type header manually.';
            }
            return res.status(400).json({ success: false, message: 'File upload error.', detail: detailMessage });
        }
        console.log('[handleUpload] Multer success!');
        next();
    });
};

router.use(authenticate);

// Machine CRUD
router.post('/machines', handleUpload, MachineController.createMachine);
router.get('/machines', MachineController.getAllMachines);

// Machine Details & Visualization
router.get('/machines/:machineId/details', MachineController.getMachineDetails);
router.get('/machines/:machineId/visualization', MachineController.getMachineVisualization);
router.get('/machines/:machineId/dashboard', MachineController.getDashboard);
router.get('/machines/:machineId/history', MachineController.getHistory);

// Machine OEE
router.get('/machines/:machineId/oee', OEEController.getMachineOEE);
router.get('/machines/:machineId/oee/history', OEEController.getOEEHistory);

// Machine Downtime
router.get('/machines/:machineId/downtime-analysis', DowntimeController.getDowntimeAnalysis);
router.get('/machines/:machineId/downtime', DowntimeController.getDowntimeHistory);
router.post('/machines/:machineId/downtime', DowntimeController.recordDowntime);

// Machine Operations
router.post('/machines/:machineId/stop', MachineController.stopMachine);

// Ingest API
router.post('/ingest/:pathId', MachineController.handleIngest);

module.exports = router;
