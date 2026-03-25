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
                COALESCE(SUM(pl.produced_count), 0) AS total_produced,
                COALESCE(SUM(pl.rejected_count), 0) AS total_rejected,
                (wo.target - COALESCE(SUM(pl.produced_count), 0)) AS remaining,
                ROUND(
                    (COALESCE(SUM(pl.produced_count), 0) / wo.target) * 100,
                    2
                ) AS completion_percentage
            FROM work_orders wo
            LEFT JOIN production_logs pl ON wo.work_order_id = pl.work_order_id
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
                pl.machine_id,
                COALESCE(SUM(pl.produced_count), 0) AS produced,
                COALESCE(SUM(pl.rejected_count), 0) AS rejected
            FROM production_logs pl
            WHERE pl.work_order_id = ?
            GROUP BY pl.machine_id
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
