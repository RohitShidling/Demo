const express = require('express');
const router = express.Router();
const ShiftController = require('../controllers/ShiftController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/shifts - Create shift
router.post('/', ShiftController.createShift);

// GET /api/shifts - Get all shifts
router.get('/', ShiftController.getAllShifts);

// GET /api/shifts/current - Get current active shift
router.get('/current', ShiftController.getCurrentShift);

// POST /api/shifts/assign - Assign operator to shift
router.post('/assign', ShiftController.assignOperator);

// GET /api/shifts/:shiftId/performance - Get shift performance
router.get('/:shiftId/performance', ShiftController.getShiftPerformance);

module.exports = router;
