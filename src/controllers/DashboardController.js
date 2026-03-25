const { getPool } = require('../config/database');
const WorkOrderModel = require('../models/WorkOrder');
const MachineModel = require('../models/Machine');

// GET /api/dashboard/overview
exports.getOverview = async (req, res, next) => {
    try {
        const pool = getPool();

        // Total work orders
        const [woRows] = await pool.execute(`SELECT COUNT(*) as total FROM work_orders`);
        const totalWorkOrders = woRows[0].total;

        // Active machines
        const [machineRows] = await pool.execute(`SELECT COUNT(*) as total FROM machines WHERE status = 'RUNNING'`);
        const activeMachines = machineRows[0].total;

        // Production totals from production_logs
        const [prodRows] = await pool.execute(`
            SELECT 
                COALESCE(SUM(produced_count), 0) AS total_production,
                COALESCE(SUM(rejected_count), 0) AS total_rejections
            FROM production_logs
        `);

        const totalProduction = prodRows[0].total_production;
        const totalRejections = prodRows[0].total_rejections;

        // Average OEE (simplified: quality-based)
        const quality = totalProduction > 0 
            ? Math.round(((totalProduction - totalRejections) / totalProduction) * 100) 
            : 0;
        const avgOee = Math.round(quality * 0.85); // simplified estimate

        res.json({
            success: true,
            data: {
                total_work_orders: totalWorkOrders,
                active_machines: activeMachines,
                total_production: totalProduction,
                total_rejections: totalRejections,
                avg_oee: avgOee
            }
        });
    } catch (error) { next(error); }
};

// GET /api/dashboard/work-orders
exports.getWorkOrderStatus = async (req, res, next) => {
    try {
        const pool = getPool();
        const query = `
            SELECT 
                wo.*,
                COALESCE(SUM(pl.produced_count), 0) AS current_produced,
                COALESCE(SUM(pl.rejected_count), 0) AS current_rejected,
                ROUND(
                    CASE WHEN wo.target > 0 THEN (COALESCE(SUM(pl.produced_count), 0) / wo.target) * 100 ELSE 0 END,
                    2
                ) AS completion_percentage
            FROM work_orders wo
            LEFT JOIN production_logs pl ON wo.work_order_id = pl.work_order_id
            GROUP BY wo.id
            ORDER BY wo.created_at DESC
        `;
        const [rows] = await pool.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
};
