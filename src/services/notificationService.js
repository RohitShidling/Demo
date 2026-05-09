const NotificationModel = require('../models/Notification');

class NotificationService {
    async createNotification({ title, message, type, machine_id, user_id, user_type }) {
        if (!title || !message) {
            const error = new Error('title and message are required');
            error.statusCode = 400;
            throw error;
        }

        const id = await NotificationModel.create({
            title,
            message,
            type,
            machine_id,
            user_id,
            user_type
        });
        return NotificationModel.findById(id);
    }

    async createNotificationAndBroadcast(app, payload) {
        const notification = await this.createNotification(payload);

        try {
            const io = app?.get?.('io');
            if (io) {
                const ns = io.of('/machines');
                ns.emit('notification:new', {
                    data: notification,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {
            // Socket broadcast failures should not fail API response.
        }

        return notification;
    }
}

module.exports = new NotificationService();
