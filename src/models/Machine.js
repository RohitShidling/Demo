const { getPool } = require('../config/database');

class MachineModel {
    static async create({ machine_id, machine_name, machine_image, ingest_path }) {
        const pool = getPool();
        const query = `
            INSERT INTO machines (machine_id, machine_name, machine_image, ingest_path)
            VALUES (?, ?, ?, ?)
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
}

module.exports = MachineModel;
