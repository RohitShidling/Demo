const { getPool } = require('../config/database');

class AuditLogModel {
    static async create({ action, entity_type, entity_id, user_id, user_type, details, ip_address }) {
        const pool = getPool();
        const query = `INSERT INTO audit_logs (action, entity_type, entity_id, user_id, user_type, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(query, [
            action, entity_type || null, entity_id || null,
            user_id || null, user_type || null,
            details ? JSON.stringify(details) : null, ip_address || null
        ]);
        return result.insertId;
    }

    static async findAll(limit = 100, offset = 0) {
        const pool = getPool();
        const query = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const [rows] = await pool.execute(query, [limit, offset]);
        return rows.map(row => {
            if (row.details && typeof row.details === 'string') {
                try { row.details = JSON.parse(row.details); } catch (e) { /* keep */ }
            }
            return row;
        });
    }

    static async findByEntity(entity_type, entity_id) {
        const pool = getPool();
        const query = `SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query, [entity_type, entity_id]);
        return rows.map(row => {
            if (row.details && typeof row.details === 'string') {
                try { row.details = JSON.parse(row.details); } catch (e) { /* keep */ }
            }
            return row;
        });
    }

    static async findByUser(user_id) {
        const pool = getPool();
        const query = `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`;
        const [rows] = await pool.execute(query, [user_id]);
        return rows;
    }
}

module.exports = AuditLogModel;
