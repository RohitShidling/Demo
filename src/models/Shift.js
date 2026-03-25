const { getPool } = require('../config/database');

class ShiftModel {
    static async create({ shift_name, start_time, end_time }) {
        const pool = getPool();
        const query = `INSERT INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(query, [shift_name, start_time, end_time]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM shifts WHERE id = ?`, [id]);
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM shifts ORDER BY start_time ASC`);
        return rows;
    }

    static async assignOperator({ operator_id, shift_id, date }) {
        const pool = getPool();
        const query = `INSERT INTO operator_shifts (operator_id, shift_id, date) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(query, [operator_id, shift_id, date]);
        return result.insertId;
    }

    static async getCurrentShift() {
        const pool = getPool();
        const query = `SELECT * FROM shifts WHERE start_time <= CURTIME() AND end_time > CURTIME() LIMIT 1`;
        const [rows] = await pool.execute(query);
        return rows[0] || null;
    }

    static async getShiftAssignments(shift_id, date) {
        const pool = getPool();
        const query = `
            SELECT os.*, ou.username, ou.email, s.shift_name
            FROM operator_shifts os
            JOIN operator_users ou ON os.operator_id = ou.id
            JOIN shifts s ON os.shift_id = s.id
            WHERE os.shift_id = ? AND os.date = ?
        `;
        const [rows] = await pool.execute(query, [shift_id, date]);
        return rows;
    }

    static async getShiftPerformance(shift_id) {
        const pool = getPool();
        const query = `
            SELECT 
                COALESCE(SUM(pl.produced_count), 0) AS total_production,
                COALESCE(SUM(pl.rejected_count), 0) AS total_rejections,
                ROUND(
                    CASE 
                        WHEN COALESCE(SUM(pl.produced_count), 0) + COALESCE(SUM(pl.rejected_count), 0) = 0 THEN 0
                        ELSE (COALESCE(SUM(pl.produced_count), 0) / (COALESCE(SUM(pl.produced_count), 0) + COALESCE(SUM(pl.rejected_count), 0))) * 100
                    END,
                    2
                ) AS efficiency
            FROM shifts s
            JOIN operator_shifts os ON s.id = os.shift_id
            JOIN production_logs pl ON pl.recorded_at >= CONCAT(os.date, ' ', s.start_time)
                AND pl.recorded_at < CONCAT(os.date, ' ', s.end_time)
            WHERE s.id = ?
        `;
        const [rows] = await pool.execute(query, [shift_id]);
        return rows[0] || { total_production: 0, total_rejections: 0, efficiency: 0 };
    }
}

module.exports = ShiftModel;
