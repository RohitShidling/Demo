const { getPool } = require('../config/database');

class MachineBreakdownModel {
    static async create({ machine_id, operator_id, problem_description, severity = 'MEDIUM' }) {
        const pool = getPool();
        const query = `
            INSERT INTO machine_breakdowns (machine_id, operator_id, problem_description, severity)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [machine_id, operator_id, problem_description, severity]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const query = `
            SELECT mb.*, m.machine_name, ou.full_name as operator_name
            FROM machine_breakdowns mb
            JOIN machines m ON mb.machine_id = m.machine_id
            JOIN operator_users ou ON mb.operator_id = ou.id
            WHERE mb.id = ?
        `;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT mb.*, ou.full_name as operator_name
            FROM machine_breakdowns mb
            JOIN operator_users ou ON mb.operator_id = ou.id
            WHERE mb.machine_id = ?
            ORDER BY mb.reported_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async findActive() {
        const pool = getPool();
        const query = `
            SELECT mb.*, m.machine_name, m.machine_id, ou.full_name as operator_name
            FROM machine_breakdowns mb
            JOIN machines m ON mb.machine_id = m.machine_id
            JOIN operator_users ou ON mb.operator_id = ou.id
            WHERE mb.status != 'RESOLVED'
            ORDER BY 
                CASE mb.severity 
                    WHEN 'CRITICAL' THEN 1 
                    WHEN 'HIGH' THEN 2 
                    WHEN 'MEDIUM' THEN 3 
                    WHEN 'LOW' THEN 4 
                END,
                mb.reported_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async updateStatus(id, status) {
        const pool = getPool();
        let query;
        if (status === 'RESOLVED') {
            query = `UPDATE machine_breakdowns SET status = ?, resolved_at = CURRENT_TIMESTAMP(3) WHERE id = ?`;
        } else {
            query = `UPDATE machine_breakdowns SET status = ? WHERE id = ?`;
        }
        await pool.execute(query, [status, id]);
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT mb.*, m.machine_name, ou.full_name as operator_name
            FROM machine_breakdowns mb
            JOIN machines m ON mb.machine_id = m.machine_id
            JOIN operator_users ou ON mb.operator_id = ou.id
            ORDER BY mb.reported_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }
}

module.exports = MachineBreakdownModel;
