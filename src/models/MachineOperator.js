const { getPool } = require('../config/database');

class MachineOperatorModel {
    static async assign({ machine_id, operator_id, mentor_name }) {
        const pool = getPool();
        const query = `
            INSERT INTO machine_operators (machine_id, operator_id, mentor_name)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE mentor_name = VALUES(mentor_name), is_active = TRUE, assigned_at = CURRENT_TIMESTAMP(3)
        `;
        const [result] = await pool.execute(query, [machine_id, operator_id, mentor_name || null]);
        return result.insertId || result.affectedRows;
    }

    static async unassign(machine_id, operator_id) {
        const pool = getPool();
        const query = `UPDATE machine_operators SET is_active = FALSE WHERE machine_id = ? AND operator_id = ?`;
        await pool.execute(query, [machine_id, operator_id]);
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT mo.*, ou.username as operator_name, ou.email as operator_email, ou.username as operator_username
            FROM machine_operators mo
            JOIN operator_users ou ON mo.operator_id = ou.id
            WHERE mo.machine_id = ? AND mo.is_active = TRUE
            ORDER BY mo.assigned_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async findByOperator(operator_id) {
        const pool = getPool();
        const query = `
            SELECT mo.*, m.machine_name, m.machine_id, m.status as machine_status
            FROM machine_operators mo
            JOIN machines m ON mo.machine_id = m.machine_id
            WHERE mo.operator_id = ? AND mo.is_active = TRUE
            ORDER BY mo.assigned_at DESC
        `;
        const [rows] = await pool.execute(query, [operator_id]);
        return rows;
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT mo.*, m.machine_name, ou.username as operator_name, ou.email as operator_email
            FROM machine_operators mo
            JOIN machines m ON mo.machine_id = m.machine_id
            JOIN operator_users ou ON mo.operator_id = ou.id
            WHERE mo.is_active = TRUE
            ORDER BY mo.assigned_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async delete(id) {
        const pool = getPool();
        const query = `DELETE FROM machine_operators WHERE id = ?`;
        await pool.execute(query, [id]);
    }
}

module.exports = MachineOperatorModel;
