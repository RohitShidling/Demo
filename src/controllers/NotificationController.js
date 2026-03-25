const NotificationModel = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
    try {
        let data;
        if (req.user) {
            data = await NotificationModel.findByUser(req.user.id, req.user.userType);
        } else {
            data = await NotificationModel.findAll();
        }
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await NotificationModel.findById(parseInt(req.params.id));
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await NotificationModel.markAsRead(parseInt(req.params.id));
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) { next(error); }
};

// POST /api/notifications (internal/admin)
exports.createNotification = async (req, res, next) => {
    try {
        const { title, message, type, user_id, user_type } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'title and message are required' });
        }
        const id = await NotificationModel.create({ title, message, type, user_id, user_type });
        const notification = await NotificationModel.findById(id);
        res.status(201).json({ success: true, data: notification });
    } catch (error) { next(error); }
};
