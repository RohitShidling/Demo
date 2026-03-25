const { getPool } = require('../config/database');

class MachineDowntimeModel {
    static async create({ machine_id, reason, severity, start_time, end_time }) {
        const pool = getPool();
        const query = `INSERT INTO machine_downtime (machine_id, reason, severity, start_time, end_time) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(query, [machine_id, reason || null, severity || 'MEDIUM', start_time, end_time || null]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM machine_downtime WHERE id = ?`, [id]);
        return rows[0];
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM machine_downtime WHERE machine_id = ? ORDER BY start_time DESC`, [machine_id]);
        return rows;
    }

    static async endDowntime(id, end_time) {
        const pool = getPool();
        await pool.execute(`UPDATE machine_downtime SET end_time = ? WHERE id = ?`, [end_time, id]);
    }

    // Downtime analysis: total, planned, unplanned, MTTR, MTBF
    static async getAnalysis(machine_id) {
        const pool = getPool();
        const query = `
            SELECT 
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW()))), 0) AS total_downtime_minutes,
                COALESCE(SUM(CASE WHEN severity IN ('LOW', 'MEDIUM') THEN TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) ELSE 0 END), 0) AS planned_downtime,
                COALESCE(SUM(CASE WHEN severity IN ('HIGH', 'CRITICAL') THEN TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) ELSE 0 END), 0) AS unplanned_downtime,
                COUNT(*) AS downtime_count
            FROM machine_downtime
            WHERE machine_id = ?
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        const result = rows[0] || { total_downtime_minutes: 0, planned_downtime: 0, unplanned_downtime: 0, downtime_count: 0 };

        // MTTR = total_downtime / downtime_count
        const mttr = result.downtime_count > 0 ? Math.round(result.total_downtime_minutes / result.downtime_count) : 0;
        
        // MTBF (rough estimate): assume 24 * 60 mins available per day, calculate based on recent 30 days
        const availableMinutes = 30 * 24 * 60;
        const mtbf = result.downtime_count > 0 
            ? Math.round((availableMinutes - result.total_downtime_minutes) / result.downtime_count) 
            : availableMinutes;

        return {
            total_downtime_minutes: result.total_downtime_minutes,
            planned_downtime: result.planned_downtime,
            unplanned_downtime: result.unplanned_downtime,
            mttr,
            mtbf
        };
    }
}

module.exports = MachineDowntimeModel;
