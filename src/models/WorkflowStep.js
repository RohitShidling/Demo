const { getPool } = require('../config/database');

class WorkflowStepModel {
    static async create({ work_order_id, step_order, step_name, step_description, assigned_machine_id }) {
        const pool = getPool();
        const query = `
            INSERT INTO workflow_steps (work_order_id, step_order, step_name, step_description, assigned_machine_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [work_order_id, step_order, step_name, step_description, assigned_machine_id || null]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const query = `SELECT * FROM workflow_steps WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async findByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT ws.*, m.machine_name
            FROM workflow_steps ws
            LEFT JOIN machines m ON ws.assigned_machine_id = m.machine_id
            WHERE ws.work_order_id = ?
            ORDER BY ws.step_order ASC
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    static async updateStatus(id, status) {
        const pool = getPool();
        let query;
        if (status === 'IN_PROGRESS') {
            query = `UPDATE workflow_steps SET status = ?, started_at = CURRENT_TIMESTAMP(3) WHERE id = ?`;
        } else if (status === 'COMPLETED') {
            query = `UPDATE workflow_steps SET status = ?, completed_at = CURRENT_TIMESTAMP(3) WHERE id = ?`;
        } else {
            query = `UPDATE workflow_steps SET status = ? WHERE id = ?`;
        }
        await pool.execute(query, [status, id]);
    }

    static async update(id, updates) {
        const pool = getPool();
        const fields = [];
        const values = [];

        if (updates.step_name !== undefined) { fields.push('step_name = ?'); values.push(updates.step_name); }
        if (updates.step_description !== undefined) { fields.push('step_description = ?'); values.push(updates.step_description); }
        if (updates.step_order !== undefined) { fields.push('step_order = ?'); values.push(updates.step_order); }
        if (updates.assigned_machine_id !== undefined) { fields.push('assigned_machine_id = ?'); values.push(updates.assigned_machine_id); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

        if (fields.length === 0) return;

        values.push(id);
        const query = `UPDATE workflow_steps SET ${fields.join(', ')} WHERE id = ?`;
        await pool.execute(query, values);
    }

    static async delete(id) {
        const pool = getPool();
        const query = `DELETE FROM workflow_steps WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    static async deleteByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `DELETE FROM workflow_steps WHERE work_order_id = ?`;
        await pool.execute(query, [work_order_id]);
    }

    static async bulkCreate(work_order_id, steps) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const ids = [];
            for (const step of steps) {
                const [result] = await connection.execute(
                    `INSERT INTO workflow_steps (work_order_id, step_order, step_name, step_description, assigned_machine_id) VALUES (?, ?, ?, ?, ?)`,
                    [work_order_id, step.step_order, step.step_name, step.step_description || null, step.assigned_machine_id || null]
                );
                ids.push(result.insertId);
            }
            await connection.commit();
            return ids;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = WorkflowStepModel;
