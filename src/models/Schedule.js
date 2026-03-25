const { getPool } = require('../config/database');

class ScheduleModel {
    static async create({ work_order_id, machine_id, start_time, end_time }) {
        const pool = getPool();
        const query = `INSERT INTO production_schedule (work_order_id, machine_id, start_time, end_time) VALUES (?, ?, ?, ?)`;
        const [result] = await pool.execute(query, [work_order_id, machine_id, start_time, end_time]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM production_schedule WHERE id = ?`, [id]);
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT ps.*, wo.work_order_name, m.machine_name
            FROM production_schedule ps
            JOIN work_orders wo ON ps.work_order_id = wo.work_order_id
            JOIN machines m ON ps.machine_id = m.machine_id
            ORDER BY ps.start_time ASC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT ps.*, wo.work_order_name
            FROM production_schedule ps
            JOIN work_orders wo ON ps.work_order_id = wo.work_order_id
            WHERE ps.machine_id = ?
            ORDER BY ps.start_time ASC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async updateStatus(id, status) {
        const pool = getPool();
        await pool.execute(`UPDATE production_schedule SET status = ? WHERE id = ?`, [status, id]);
    }

    static async delete(id) {
        const pool = getPool();
        await pool.execute(`DELETE FROM production_schedule WHERE id = ?`, [id]);
    }
}

module.exports = ScheduleModel;
