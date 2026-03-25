const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/notifications - Get notifications
router.get('/', NotificationController.getNotifications);

// POST /api/notifications - Create notification
router.post('/', NotificationController.createNotification);

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', NotificationController.markAsRead);

module.exports = router;
