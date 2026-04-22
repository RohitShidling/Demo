const { getPool } = require('../config/database');

class MachineRunModel {
    static async create({ machine_id, start_time }) {
        const pool = getPool();
        const query = `
            INSERT INTO machine_runs (machine_id, start_time, last_activity_time, status, total_count)
            VALUES (?, ?, ?, 'RUNNING', 0)
        `;
        const [result] = await pool.execute(query, [machine_id, start_time, start_time]);
        return result.insertId;
    }

    static async findActiveRun(machine_id) {
        const pool = getPool();
        const query = `
            SELECT * FROM machine_runs 
            WHERE machine_id = ? AND status = 'RUNNING' 
            ORDER BY start_time DESC 
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0];
    }

    static async incrementTotalCount(run_id, timestamp) {
        const pool = getPool();
        const query = `
            UPDATE machine_runs 
            SET total_count = total_count + 1, last_activity_time = ? 
            WHERE run_id = ?
        `;
        await pool.execute(query, [timestamp, run_id]);
    }

    static async stopRun(run_id, end_time) {
        const pool = getPool();
        const query = `
            UPDATE machine_runs 
            SET status = 'STOPPED', end_time = ? 
            WHERE run_id = ?
        `;
        await pool.execute(query, [end_time, run_id]);
    }

    static async getById(run_id) {
        const pool = getPool();
        const query = `SELECT * FROM machine_runs WHERE run_id = ?`;
        const [rows] = await pool.execute(query, [run_id]);
        return rows[0];
    }

    static async findLastRun(machine_id) {
        const pool = getPool();
        const query = `
            SELECT * FROM machine_runs 
            WHERE machine_id = ? 
            ORDER BY start_time DESC 
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0];
    }

    static async resetCounts(machine_id) {
        const pool = getPool();
        const query = `
            UPDATE machine_runs 
            SET total_count = 0, accepted_count = 0, rejected_count = 0 
            WHERE machine_id = ? AND status = 'RUNNING'
        `;
        await pool.execute(query, [machine_id]);
    }
}

module.exports = MachineRunModel;
