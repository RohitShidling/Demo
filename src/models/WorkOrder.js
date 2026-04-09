const { getPool } = require('../config/database');

class WorkOrderModel {
    static async create({ work_order_id, work_order_name, target, description, targeted_end_date, created_by }) {
        const pool = getPool();
        const query = `
            INSERT INTO work_orders (work_order_id, work_order_name, target, description, targeted_end_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [work_order_id, work_order_name, target, description, targeted_end_date || null, created_by]);
        return result.insertId;
    }

    static async findById(work_order_id) {
        const pool = getPool();
        const query = `SELECT * FROM work_orders WHERE work_order_id = ?`;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const query = `SELECT * FROM work_orders ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async update(work_order_id, updates) {
        const pool = getPool();
        const fields = [];
        const values = [];

        if (updates.work_order_name !== undefined) { fields.push('work_order_name = ?'); values.push(updates.work_order_name); }
        if (updates.target !== undefined) { fields.push('target = ?'); values.push(updates.target); }
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (updates.targeted_end_date !== undefined) { fields.push('targeted_end_date = ?'); values.push(updates.targeted_end_date); }
        if (updates.total_produced !== undefined) { fields.push('total_produced = ?'); values.push(updates.total_produced); }
        if (updates.total_accepted !== undefined) { fields.push('total_accepted = ?'); values.push(updates.total_accepted); }
        if (updates.total_rejected !== undefined) { fields.push('total_rejected = ?'); values.push(updates.total_rejected); }

        if (fields.length === 0) return;

        values.push(work_order_id);
        const query = `UPDATE work_orders SET ${fields.join(', ')} WHERE work_order_id = ?`;
        await pool.execute(query, values);
    }

    static async delete(work_order_id) {
        const pool = getPool();
        // work_order_machines has ON DELETE CASCADE so assigned machines get auto-removed
        const query = `DELETE FROM work_orders WHERE work_order_id = ?`;
        await pool.execute(query, [work_order_id]);
    }

    static async incrementProduced(work_order_id, count = 1) {
        const pool = getPool();
        const query = `UPDATE work_orders SET total_produced = total_produced + ? WHERE work_order_id = ?`;
        await pool.execute(query, [count, work_order_id]);
    }

    static async incrementAccepted(work_order_id, count = 1) {
        const pool = getPool();
        const query = `UPDATE work_orders SET total_accepted = total_accepted + ? WHERE work_order_id = ?`;
        await pool.execute(query, [count, work_order_id]);
    }

    static async incrementRejected(work_order_id, count = 1) {
        const pool = getPool();
        const query = `UPDATE work_orders SET total_rejected = total_rejected + ? WHERE work_order_id = ?`;
        await pool.execute(query, [count, work_order_id]);
    }
}

module.exports = WorkOrderModel;
