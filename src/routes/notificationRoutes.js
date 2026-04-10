const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Notifications are restricted to business/admin users only.
const allowBusinessOnly = (req, res, next) => {
    if (req.user?.userType !== 'business') {
        return res.status(403).json({
            success: false,
            message: 'Unauthorized access. Only business users are allowed for notifications.'
        });
    }
    next();
};
router.use(allowBusinessOnly);

// GET  /api/notifications          - Get notifications (optional ?machine_id=xxx)
router.get('/', NotificationController.getNotifications);

// POST /api/notifications          - Create notification (broadcasts via socket)
router.post('/', NotificationController.createNotification);

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', NotificationController.markAsRead);

// DELETE /api/notifications        - Delete ALL notifications
router.delete('/', NotificationController.deleteAllNotifications);

// DELETE /api/notifications/:id    - Delete specific notification
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;
