const { getPool } = require('../config/database');

class WorkOrderMachineModel {
    static async assign(work_order_id, machine_id, stage_order = null) {
        const pool = getPool();
        // Check if machine is already assigned to any ACTIVE work order
        const [activeAssignments] = await pool.execute(
            `SELECT wom.work_order_id, wo.work_order_name
             FROM work_order_machines wom
             JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
             WHERE wom.machine_id = ? AND wo.status NOT IN ('COMPLETED', 'CANCELLED')`,
            [machine_id]
        );
        if (activeAssignments.length > 0) {
            const conflict = activeAssignments[0];
            let errorMsg = `already assigned machine to work order '${conflict.work_order_id}', please unassign machine, then try to reassign`;
            if (conflict.work_order_id === work_order_id) {
                errorMsg = `already assigned machine to this particular work order, please unassign machine, then try to reassign`;
            }

            const err = new Error(errorMsg);
            err.statusCode = 409;
            err.conflicting_work_order_id = conflict.work_order_id;
            err.conflicting_work_order_name = conflict.work_order_name;
            throw err;
        }

        const query = `
            INSERT INTO work_order_machines (work_order_id, machine_id, stage_order)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP(3), stage_order = VALUES(stage_order)
        `;
        await pool.execute(query, [work_order_id, machine_id, stage_order]);

        // Reset machine production/rejection counters to zero on assignment
        await pool.execute(
            `UPDATE work_order_machines SET production_count = 0, rejected_count = 0, accepted_count = 0
             WHERE work_order_id = ? AND machine_id = ?`,
            [work_order_id, machine_id]
        );
    }

    static async updateStage(work_order_id, machine_id, stage_order) {
        const pool = getPool();
        await pool.execute(
            `UPDATE work_order_machines SET stage_order = ? WHERE work_order_id = ? AND machine_id = ?`,
            [stage_order, work_order_id, machine_id]
        );
    }

    static async unassign(work_order_id, machine_id) {
        const pool = getPool();
        // Zero out all production counts BEFORE removing the row
        // so the machine starts completely fresh in the next assignment
        await pool.execute(
            `UPDATE work_order_machines
             SET production_count = 0, rejected_count = 0, accepted_count = 0
             WHERE work_order_id = ? AND machine_id = ?`,
            [work_order_id, machine_id]
        );
        await pool.execute(
            `DELETE FROM work_order_machines WHERE work_order_id = ? AND machine_id = ?`,
            [work_order_id, machine_id]
        );
    }

    static async unassignAllByWorkOrder(work_order_id) {
        const pool = getPool();
        await pool.execute(`DELETE FROM work_order_machines WHERE work_order_id = ?`, [work_order_id]);
    }

    static async getMachinesByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT m.*, wom.assigned_at, wom.stage_order,
                   wom.production_count, wom.rejected_count, wom.accepted_count,
                   COALESCE(m.status, 'NOT_STARTED') as machine_status
            FROM work_order_machines wom
            JOIN machines m ON wom.machine_id = m.machine_id
            WHERE wom.work_order_id = ?
            ORDER BY COALESCE(wom.stage_order, 9999) ASC, wom.assigned_at ASC
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    static async getWorkOrdersByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT wo.*, wom.assigned_at, wom.stage_order
            FROM work_order_machines wom
            JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
            WHERE wom.machine_id = ?
            ORDER BY wom.assigned_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async getActiveWorkOrderForMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT wo.*, wom.assigned_at, wom.stage_order
            FROM work_order_machines wom
            JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
            WHERE wom.machine_id = ? AND wo.status NOT IN ('COMPLETED', 'CANCELLED')
            ORDER BY wom.assigned_at DESC
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0] || null;
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT wom.*, wo.work_order_name, m.machine_name
            FROM work_order_machines wom
            JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
            JOIN machines m ON wom.machine_id = m.machine_id
            ORDER BY wom.assigned_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async incrementProductionCount(work_order_id, machine_id, count = 1) {
        const pool = getPool();
        await pool.execute(
            `UPDATE work_order_machines SET production_count = production_count + ?, accepted_count = accepted_count + ?
             WHERE work_order_id = ? AND machine_id = ?`,
            [count, count, work_order_id, machine_id]
        );
    }

    static async incrementRejectedCount(work_order_id, machine_id, count = 1) {
        const pool = getPool();
        await pool.execute(
            `UPDATE work_order_machines SET rejected_count = rejected_count + ?,
             accepted_count = GREATEST(0, production_count - (rejected_count + ?))
             WHERE work_order_id = ? AND machine_id = ?`,
            [count, count, work_order_id, machine_id]
        );
    }

    static async resetCounts(work_order_id, machine_id) {
        const pool = getPool();
        await pool.execute(
            `UPDATE work_order_machines SET production_count = 0, rejected_count = 0, accepted_count = 0
             WHERE work_order_id = ? AND machine_id = ?`,
            [work_order_id, machine_id]
        );
    }

    static async getWorkOrderTotals(work_order_id) {
        const pool = getPool();
        const [rows] = await pool.execute(
            `SELECT
                COALESCE(SUM(production_count), 0) AS total_produced,
                COALESCE(SUM(rejected_count), 0) AS total_rejected,
                COALESCE(SUM(accepted_count), 0) AS total_accepted
             FROM work_order_machines
             WHERE work_order_id = ?`,
            [work_order_id]
        );
        return rows[0] || { total_produced: 0, total_rejected: 0, total_accepted: 0 };
    }

    // Get all machines production count across all work orders
    static async getAllMachinesProductionCount() {
        const pool = getPool();
        const query = `
            SELECT m.machine_id, m.machine_name,
                   COALESCE(SUM(wom.production_count), 0) as total_production_count
            FROM machines m
            LEFT JOIN work_order_machines wom ON m.machine_id = wom.machine_id
            GROUP BY m.machine_id, m.machine_name
            ORDER BY total_production_count DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Get machine-specific production count
    static async getMachineProductionCount(machine_id) {
        const pool = getPool();
        const [rows] = await pool.execute(
            `SELECT m.machine_id, m.machine_name,
                    COALESCE(SUM(wom.production_count), 0) as total_production_count,
                    COALESCE(SUM(wom.rejected_count), 0) as total_rejected_count,
                    COALESCE(SUM(wom.accepted_count), 0) as total_accepted_count
             FROM machines m
             LEFT JOIN work_order_machines wom ON m.machine_id = wom.machine_id
             WHERE m.machine_id = ?
             GROUP BY m.machine_id, m.machine_name`,
            [machine_id]
        );
        return rows[0] || null;
    }

    // Get all machines rejection count
    static async getAllMachinesRejectionCount() {
        const pool = getPool();
        const query = `
            SELECT m.machine_id, m.machine_name,
                   COALESCE(SUM(wom.rejected_count), 0) as total_rejected_count
            FROM machines m
            LEFT JOIN work_order_machines wom ON m.machine_id = wom.machine_id
            GROUP BY m.machine_id, m.machine_name
            ORDER BY total_rejected_count DESC
        `;
        const [rows] = await pool.execute(query);
        return rows;
    }

    /**
     * Check current assignment status of a machine.
     * Returns the active work order it is assigned to (if any), or null.
     */
    static async getAssignmentStatus(machine_id) {
        const pool = getPool();
        const [rows] = await pool.execute(
            `SELECT wom.work_order_id,
                    wo.work_order_name,
                    wo.status            AS work_order_status,
                    wom.stage_order,
                    wom.assigned_at,
                    wom.production_count,
                    wom.rejected_count,
                    wom.accepted_count
             FROM work_order_machines wom
             JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
             WHERE wom.machine_id = ?
               AND wo.status NOT IN ('COMPLETED', 'CANCELLED')
             ORDER BY wom.assigned_at DESC
             LIMIT 1`,
            [machine_id]
        );
        return rows[0] || null;
    }
}

module.exports = WorkOrderMachineModel;
