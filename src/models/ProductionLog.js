const { getPool } = require('../config/database');

class ProductionLogModel {
    // Record production (new single source of truth)
    static async create({ machine_id, work_order_id, produced_count, rejected_count }) {
        const pool = getPool();
        const query = `
            INSERT INTO production_logs (machine_id, work_order_id, produced_count, rejected_count, status)
            VALUES (?, ?, ?, ?, ?)
        `;
        const status = rejected_count > 0 ? 'REJECTED' : 'GOOD';
        const [result] = await pool.execute(query, [machine_id, work_order_id || null, produced_count || 0, rejected_count || 0, status]);
        return result.insertId;
    }

    static async getById(id) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async getByMachineId(machine_id) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE machine_id = ? ORDER BY recorded_at DESC`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async getByWorkOrderId(work_order_id) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE work_order_id = ? ORDER BY recorded_at DESC`;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    // Work Order Production Summary (aggregated from production_logs)
    static async getWorkOrderSummary(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT 
                wo.work_order_id,
                wo.target,
                COALESCE(SUM(wom.production_count), 0) AS total_produced,
                COALESCE(SUM(wom.rejected_count), 0) AS total_rejected,
                (wo.target - COALESCE(SUM(wom.production_count), 0)) AS remaining,
                ROUND(
                    (COALESCE(SUM(wom.production_count), 0) / NULLIF(wo.target, 0)) * 100,
                    2
                ) AS completion_percentage
            FROM work_orders wo
            LEFT JOIN work_order_machines wom ON wo.work_order_id = wom.work_order_id
            WHERE wo.work_order_id = ?
            GROUP BY wo.work_order_id, wo.target
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows[0];
    }

    // Machine-wise breakdown for a work order
    static async getMachineProductionForWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT 
                wom.machine_id,
                m.machine_name,
                COALESCE(wom.stage_order, 9999) AS stage_order,
                COALESCE(wom.production_count, 0) AS produced_count,
                COALESCE(wom.rejected_count, 0) AS rejected_count,
                COALESCE(wom.accepted_count, 0) AS accepted_count
            FROM work_order_machines wom
            JOIN machines m ON wom.machine_id = m.machine_id
            WHERE wom.work_order_id = ?
            ORDER BY COALESCE(wom.stage_order, 9999), wom.assigned_at
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    // Get all logs
    static async findAll(limit = 100) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs ORDER BY recorded_at DESC LIMIT ?`;
        const [rows] = await pool.execute(query, [limit]);
        return rows;
    }
}

module.exports = ProductionLogModel;
