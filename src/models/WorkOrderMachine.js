const { getPool } = require('../config/database');

class WorkOrderMachineModel {
    static async assign(work_order_id, machine_id) {
        const pool = getPool();
        const query = `
            INSERT INTO work_order_machines (work_order_id, machine_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP(3)
        `;
        await pool.execute(query, [work_order_id, machine_id]);
    }

    static async unassign(work_order_id, machine_id) {
        const pool = getPool();
        const query = `DELETE FROM work_order_machines WHERE work_order_id = ? AND machine_id = ?`;
        await pool.execute(query, [work_order_id, machine_id]);
    }

    static async getMachinesByWorkOrder(work_order_id) {
        const pool = getPool();
        const query = `
            SELECT m.*, wom.assigned_at,
                   COALESCE(m.status, 'NOT_STARTED') as machine_status
            FROM work_order_machines wom
            JOIN machines m ON wom.machine_id = m.machine_id
            WHERE wom.work_order_id = ?
            ORDER BY wom.assigned_at DESC
        `;
        const [rows] = await pool.execute(query, [work_order_id]);
        return rows;
    }

    static async getWorkOrdersByMachine(machine_id) {
        const pool = getPool();
        const query = `
            SELECT wo.*, wom.assigned_at
            FROM work_order_machines wom
            JOIN work_orders wo ON wom.work_order_id = wo.work_order_id
            WHERE wom.machine_id = ?
            ORDER BY wom.assigned_at DESC
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
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
}

module.exports = WorkOrderMachineModel;
