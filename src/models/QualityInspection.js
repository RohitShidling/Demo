const { getPool } = require('../config/database');

class QualityInspectionModel {
    static async create({ machine_id, work_order_id, parameters, status, remarks, inspected_by }) {
        const pool = getPool();
        const query = `
            INSERT INTO quality_inspections (machine_id, work_order_id, parameters, status, remarks, inspected_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            machine_id || null, work_order_id || null,
            JSON.stringify(parameters || {}), status || 'PASS',
            remarks || null, inspected_by || null
        ]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM quality_inspections WHERE id = ?`, [id]);
        if (rows[0] && rows[0].parameters && typeof rows[0].parameters === 'string') {
            try { rows[0].parameters = JSON.parse(rows[0].parameters); } catch (e) { /* keep as string */ }
        }
        return rows[0];
    }

    static async findByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `SELECT * FROM quality_inspections WHERE work_order_id = ? ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows.map(row => {
            if (row.parameters && typeof row.parameters === 'string') {
                try { row.parameters = JSON.parse(row.parameters); } catch (e) { /* keep */ }
            }
            return row;
        });
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const query = `SELECT * FROM quality_inspections WHERE machine_id = ? ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows.map(row => {
            if (row.parameters && typeof row.parameters === 'string') {
                try { row.parameters = JSON.parse(row.parameters); } catch (e) { /* keep */ }
            }
            return row;
        });
    }

    static async findAll() {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM quality_inspections ORDER BY created_at DESC`);
        return rows.map(row => {
            if (row.parameters && typeof row.parameters === 'string') {
                try { row.parameters = JSON.parse(row.parameters); } catch (e) { /* keep */ }
            }
            return row;
        });
    }
}

module.exports = QualityInspectionModel;
