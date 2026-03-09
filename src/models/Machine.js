const { getPool } = require('../config/database');

class MachineModel {
    static async create({ machine_id, machine_name, machine_image, ingest_path }) {
        const pool = getPool();
        const query = `
            INSERT INTO machines (machine_id, machine_name, machine_image, ingest_path, status)
            VALUES (?, ?, ?, ?, 'NOT_STARTED')
        `;
        await pool.execute(query, [machine_id, machine_name, machine_image, ingest_path]);
        return machine_id;
    }

    static async findByIngestPath(path) {
        const pool = getPool();
        const query = `SELECT * FROM machines WHERE ingest_path = ?`;
        const [rows] = await pool.execute(query, [path]);
        return rows[0];
    }

    static async findById(machine_id) {
        const pool = getPool();
        const query = `SELECT * FROM machines WHERE machine_id = ?`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const query = `SELECT * FROM machines ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async updateStatus(machine_id, status) {
        const pool = getPool();
        const query = `UPDATE machines SET status = ? WHERE machine_id = ?`;
        await pool.execute(query, [status, machine_id]);
    }

    static async findByStatus(status) {
        const pool = getPool();
        const query = `SELECT * FROM machines WHERE status = ? ORDER BY updated_at DESC`;
        const [rows] = await pool.execute(query, [status]);
        return rows;
    }

    static async findAlertMachines() {
        const pool = getPool();
        const query = `
            SELECT m.*, 
                   mb.problem_description as latest_breakdown_reason,
                   mb.severity as breakdown_severity,
                   mb.reported_at as breakdown_reported_at
            FROM machines m
            LEFT JOIN (
                SELECT machine_id, problem_description, severity, reported_at,
                       ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY reported_at DESC) as rn
                FROM machine_breakdowns
                WHERE status != 'RESOLVED'
            ) mb ON m.machine_id = mb.machine_id AND mb.rn = 1
            WHERE m.status IN ('MAINTENANCE', 'NOT_STARTED')
            ORDER BY m.updated_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }
}

module.exports = MachineModel;
