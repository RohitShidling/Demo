const { getPool } = require('../config/database');

class MachineChecklistModel {
    static async create({ machine_id, checkpoint, description, specification, method, image, timing, status, comments, checked_by }) {
        const pool = getPool();
        const query = `
            INSERT INTO machine_checklists (machine_id, checkpoint, description, specification, method, image, timing, status, comments, checked_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            machine_id, checkpoint, description || null, specification || null,
            method || null, image || null, timing || null, status || 'PENDING',
            comments || null, checked_by || null
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
            ORDER BY mc.updated_at DESC
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
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.specification !== undefined) { fields.push('specification = ?'); values.push(updates.specification); }
        if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
        if (updates.image !== undefined) { fields.push('image = ?'); values.push(updates.image); }
        if (updates.timing !== undefined) { fields.push('timing = ?'); values.push(updates.timing); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (updates.comments !== undefined) { fields.push('comments = ?'); values.push(updates.comments); }
        if (updates.checked_by !== undefined) { fields.push('checked_by = ?'); values.push(updates.checked_by); }

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
            ORDER BY mc.updated_at DESC
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
}

module.exports = MachineChecklistModel;
