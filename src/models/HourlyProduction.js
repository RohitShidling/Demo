const { getPool } = require('../config/database');

class HourlyProductionModel {
    static async getOrCreateBucket(machine_id, run_id, timestamp) {
        const pool = getPool();

        // Calculate hour start/end
        const date = new Date(timestamp);
        date.setMinutes(0, 0, 0); // Round down to hour
        const hourStart = date;
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourStart.getHours() + 1);

        // Check exists
        const selectQuery = `
            SELECT * FROM hourly_production 
            WHERE run_id = ? AND hour_start_time = ?
        `;
        // Note: Using precise timestamp matching for hour_start_time might be tricky with float/timezones. 
        // Best to rely on exact generic string or passed date. 
        // MySQL DATETIME matches should be exact.

        const [rows] = await pool.execute(selectQuery, [run_id, hourStart]);

        if (rows.length > 0) {
            return rows[0];
        }

        // Create new
        const insertQuery = `
            INSERT INTO hourly_production (machine_id, run_id, hour_start_time, hour_end_time, product_count)
            VALUES (?, ?, ?, ?, 0)
        `;
        const [result] = await pool.execute(insertQuery, [machine_id, run_id, hourStart, hourEnd]);
        return {
            id: result.insertId,
            machine_id,
            run_id,
            hour_start_time: hourStart,
            hour_end_time: hourEnd,
            product_count: 0
        };
    }

    static async incrementCount(id) {
        const pool = getPool();
        const query = `UPDATE hourly_production SET product_count = product_count + 1 WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    static async getHistory(machine_id) {
        const pool = getPool();
        const query = `
            SELECT * FROM hourly_production 
            WHERE machine_id = ? 
            ORDER BY hour_start_time DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }
}

module.exports = HourlyProductionModel;
