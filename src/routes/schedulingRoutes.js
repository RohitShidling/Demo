const express = require('express');
const router = express.Router();
const ScheduleController = require('../controllers/ScheduleController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/scheduling/plan - Create production plan
router.post('/plan', ScheduleController.createPlan);

// GET /api/scheduling - Get full schedule
router.get('/', ScheduleController.getSchedule);

// GET /api/scheduling/machine/:machineId - Get machine schedule
router.get('/machine/:machineId', ScheduleController.getMachineSchedule);

module.exports = router;
