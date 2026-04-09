const { getPool } = require('../config/database');

class PartRejectionModel {
    static async create({
        machine_id,
        work_order_id,
        operator_id,
        rejection_reason,
        rework_reason,
        part_description,
        supervisor_name,
        part_image,
        rejected_count = 1
    }) {
        const pool = getPool();
        const query = `
            INSERT INTO part_rejections
            (machine_id, work_order_id, operator_id, rejection_reason, rework_reason, part_description, supervisor_name, part_image, rejected_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            machine_id,
            work_order_id,
            operator_id,
            rejection_reason,
            rework_reason || null,
            part_description || null,
            supervisor_name || null,
            part_image,
            rejected_count
        ]);
        return result.insertId;
    }

    static async findById(id) {
        const pool = getPool();
        const query = `SELECT * FROM part_rejections WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async findByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT pr.*, m.machine_name, m.ingest_path, wo.work_order_name, wo.description as work_order_description, ou.username as operator_name
            FROM part_rejections pr
            JOIN machines m ON pr.machine_id = m.machine_id
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.work_order_id
            LEFT JOIN operator_users ou ON pr.operator_id = ou.id
            WHERE pr.machine_id = ? 
            ORDER BY pr.created_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async findByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT pr.*, m.machine_name, m.ingest_path, wo.work_order_name, wo.description as work_order_description, ou.username as operator_name
            FROM part_rejections pr
            JOIN machines m ON pr.machine_id = m.machine_id
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.work_order_id
            LEFT JOIN operator_users ou ON pr.operator_id = ou.id
            WHERE pr.work_order_id = ?
            ORDER BY pr.created_at DESC
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    static async findByMachineAndWorkOrder(machine_id, work_order_id) {
        const pool = getPool();
        const query = `
            SELECT pr.*, m.machine_name, m.ingest_path, wo.work_order_name, wo.description as work_order_description, ou.username as operator_name
            FROM part_rejections pr
            JOIN machines m ON pr.machine_id = m.machine_id
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.work_order_id
            LEFT JOIN operator_users ou ON pr.operator_id = ou.id
            WHERE pr.machine_id = ? AND pr.work_order_id = ?
            ORDER BY pr.created_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id, work_order_id]);
        return rows;
    }

    static async getTotalRejectedByMachine(machine_id) {
        const pool = getPool();
        const query = `SELECT COALESCE(SUM(rejected_count), 0) as total_rejected FROM part_rejections WHERE machine_id = ?`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0].total_rejected;
    }

    static async getTotalRejectedByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `SELECT COALESCE(SUM(rejected_count), 0) as total_rejected FROM part_rejections WHERE work_order_id = ?`;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows[0].total_rejected;
    }

    static async getRejectionsByMachineGrouped(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT pr.machine_id, m.machine_name, 
                   COUNT(*) as rejection_entries,
                   COALESCE(SUM(pr.rejected_count), 0) as total_rejected
            FROM part_rejections pr
            JOIN machines m ON pr.machine_id = m.machine_id
            WHERE pr.work_order_id = ?
            GROUP BY pr.machine_id, m.machine_name
            ORDER BY total_rejected DESC
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT pr.*, m.machine_name, m.ingest_path, wo.work_order_name, wo.description as work_order_description, ou.username as operator_name
            FROM part_rejections pr
            JOIN machines m ON pr.machine_id = m.machine_id
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.work_order_id
            LEFT JOIN operator_users ou ON pr.operator_id = ou.id
            ORDER BY pr.created_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }
}

module.exports = PartRejectionModel;
