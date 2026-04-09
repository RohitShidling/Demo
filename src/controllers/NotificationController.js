const NotificationModel = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
    try {
        let data;
        if (req.query.machine_id) {
            data = await NotificationModel.findByMachine(req.query.machine_id);
        } else if (req.user) {
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

// POST /api/notifications
exports.createNotification = async (req, res, next) => {
    try {
        const { title, message, type, machine_id, user_id, user_type } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'title and message are required' });
        }
        const id = await NotificationModel.create({ title, message, type, machine_id, user_id, user_type });
        const notification = await NotificationModel.findById(id);
        res.status(201).json({ success: true, data: notification });

        // Broadcast via socket
        try {
            const io = req.app.get('io');
            if (io) {
                const ns = io.of('/machines');
                ns.emit('notification:new', { data: notification, timestamp: new Date().toISOString() });
            }
        } catch (e) { /* ignore socket error */ }
    } catch (error) { next(error); }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const notification = await NotificationModel.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        await NotificationModel.delete(id);
        res.json({ success: true, message: 'Notification deleted' });

        // Broadcast deletion via socket
        try {
            const io = req.app.get('io');
            if (io) {
                const ns = io.of('/machines');
                ns.emit('notification:deleted', { id, timestamp: new Date().toISOString() });
            }
        } catch (e) { /* ignore socket error */ }
    } catch (error) { next(error); }
};

// DELETE /api/notifications (delete all)
exports.deleteAllNotifications = async (req, res, next) => {
    try {
        await NotificationModel.deleteAll();
        res.json({ success: true, message: 'All notifications deleted' });

        try {
            const io = req.app.get('io');
            if (io) {
                const ns = io.of('/machines');
                ns.emit('notification:cleared', { timestamp: new Date().toISOString() });
            }
        } catch (e) { /* ignore */ }
    } catch (error) { next(error); }
};
