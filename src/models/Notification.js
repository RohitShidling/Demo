const { getPool } = require('../config/database');

class NotificationModel {
    static async create({ title, message, type, user_id, user_type }) {
        const pool = getPool();
        const query = `INSERT INTO notifications (title, message, type, user_id, user_type) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(query, [title, message, type || 'INFO', user_id || null, user_type || null]);
        return result.insertId;
    }

    static async findAll(limit = 50) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?`, [limit]);
        return rows;
    }

    static async findByUser(user_id, user_type) {
        const pool = getPool();
        const query = `SELECT * FROM notifications WHERE (user_id = ? AND user_type = ?) OR user_id IS NULL ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query, [user_id, user_type]);
        return rows;
    }

    static async markAsRead(id) {
        const pool = getPool();
        await pool.execute(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [id]);
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM notifications WHERE id = ?`, [id]);
        return rows[0];
    }
}

module.exports = NotificationModel;
