const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard/overview - Overall dashboard
router.get('/overview', DashboardController.getOverview);

// GET /api/dashboard/work-orders - Work order status
router.get('/work-orders', DashboardController.getWorkOrderStatus);

module.exports = router;
