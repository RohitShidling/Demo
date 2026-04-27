const { getPool } = require('../config/database');

class MachineChecklistModel {
    static async create({ machine_id, operator_name, cell_incharge_name, checkpoint, description, specification, method, image, timing, status, comments, checked_by, sort_order }) {
        const pool = getPool();

        // If sort_order not provided, set to max+1 for this machine
        if (sort_order === undefined || sort_order === null) {
            const [maxRows] = await pool.execute(
                `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM machine_checklists WHERE machine_id = ?`,
                [machine_id]
            );
            sort_order = maxRows[0].next_order;
        }

        const query = `
            INSERT INTO machine_checklists (machine_id, operator_name, cell_incharge_name, checkpoint, description, specification, method, image, timing, status, comments, checked_by, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            machine_id, operator_name || null, cell_incharge_name || null, checkpoint, description || null, specification || null,
            method || null, image || null, timing || null, status || 'PENDING',
            comments || null, checked_by || null, sort_order
        ]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const query = `
            SELECT mc.*, m.machine_name
            FROM machine_checklists mc
            JOIN machines m ON mc.machine_id = m.machine_id
            WHERE mc.id = ?
        `;
        const [rows] = await pool.execute(query, [id]);
        if (rows[0] && rows[0].image) {
            rows[0].image = rows[0].image.toString('base64');
        }
        return rows[0];
    }

    static async findByMachineId(machine_id) {
        const pool = getPool();
        const query = `
            SELECT mc.*, m.machine_name
            FROM machine_checklists mc
            JOIN machines m ON mc.machine_id = m.machine_id
            WHERE mc.machine_id = ?
            ORDER BY mc.sort_order ASC, mc.created_at ASC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows.map(row => {
            if (row.image) {
                row.image = row.image.toString('base64');
            }
            return row;
        });
    }

    static async update(id, updates) {
        const pool = getPool();
        const fields = [];
        const values = [];

        if (updates.checkpoint !== undefined) { fields.push('checkpoint = ?'); values.push(updates.checkpoint); }
        if (updates.operator_name !== undefined) { fields.push('operator_name = ?'); values.push(updates.operator_name); }
        if (updates.cell_incharge_name !== undefined) { fields.push('cell_incharge_name = ?'); values.push(updates.cell_incharge_name); }
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.specification !== undefined) { fields.push('specification = ?'); values.push(updates.specification); }
        if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
        if (updates.image !== undefined) { fields.push('image = ?'); values.push(updates.image); }
        if (updates.timing !== undefined) { fields.push('timing = ?'); values.push(updates.timing); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (updates.comments !== undefined) { fields.push('comments = ?'); values.push(updates.comments); }
        if (updates.checked_by !== undefined) { fields.push('checked_by = ?'); values.push(updates.checked_by); }
        if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }

        if (fields.length === 0) return;

        values.push(id);
        const query = `UPDATE machine_checklists SET ${fields.join(', ')} WHERE id = ?`;
        await pool.execute(query, values);
    }

    static async delete(id) {
        const pool = getPool();
        const query = `DELETE FROM machine_checklists WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT mc.*, m.machine_name
            FROM machine_checklists mc
            JOIN machines m ON mc.machine_id = m.machine_id
            ORDER BY mc.machine_id, mc.sort_order ASC, mc.created_at ASC
        `;
        const [rows] = await pool.execute(query);
        return rows.map(row => {
            if (row.image) {
                row.image = row.image.toString('base64');
            }
            return row;
        });
    }

    static async getLastSavedOn(machine_id) {
        const pool = getPool();
        const query = `SELECT MAX(updated_at) as last_saved_on FROM machine_checklists WHERE machine_id = ?`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0]?.last_saved_on || null;
    }

    static async reorder(machine_id, orderedIds) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            for (let i = 0; i < orderedIds.length; i++) {
                await connection.execute(
                    `UPDATE machine_checklists SET sort_order = ? WHERE id = ? AND machine_id = ?`,
                    [i + 1, orderedIds[i], machine_id]
                );
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getChecklistSummaryByMachine() {
        const pool = getPool();
        const query = `
            SELECT 
                m.machine_id,
                m.machine_name,
                COUNT(mc.id) AS total_items,
                SUM(CASE WHEN mc.status IS NOT NULL AND mc.status <> 'PENDING' THEN 1 ELSE 0 END) AS completed_items,
                SUM(CASE WHEN mc.status IN ('PENDING') THEN 1 ELSE 0 END) AS pending_items,
                SUM(CASE WHEN mc.status IN ('NOT_OK', 'NOT_DONE') THEN 1 ELSE 0 END) AS not_ok_items,
                MAX(mc.updated_at) AS last_updated,
                MIN(mc.created_at) AS created_at
            FROM machines m
            LEFT JOIN machine_checklists mc ON m.machine_id = mc.machine_id
            GROUP BY m.machine_id, m.machine_name
            ORDER BY m.machine_name
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }
}

module.exports = MachineChecklistModel;
