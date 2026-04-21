const ProductionLogModel = require('../models/ProductionLog');
const MachineModel = require('../models/Machine');
const WorkOrderModel = require('../models/WorkOrder');
const WorkOrderMachineModel = require('../models/WorkOrderMachine');
const AuditLogModel = require('../models/AuditLog');
const logger = require('../utils/logger');

class ProductionService {

    // POST /api/production — Record production manually
    async recordProduction({ machine_id, work_order_id, produced_count, rejected_count, timestamp, user_id }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        if (work_order_id) {
            const wo = await WorkOrderModel.findById(work_order_id);
            if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        }

        const productionId = await ProductionLogModel.create({
            machine_id,
            work_order_id,
            produced_count: produced_count || 0,
            rejected_count: rejected_count || 0
        });

        // Keep work_order_machines counters in sync
        if (work_order_id) {
            if (produced_count > 0) await WorkOrderMachineModel.incrementProductionCount(work_order_id, machine_id, produced_count);
            if (rejected_count > 0) await WorkOrderMachineModel.incrementRejectedCount(work_order_id, machine_id, rejected_count);
        }

        await AuditLogModel.create({
            action: 'PRODUCTION_RECORDED',
            entity_type: 'production_log',
            entity_id: String(productionId),
            user_id,
            details: { machine_id, work_order_id, produced_count, rejected_count }
        });

        logger.info(`Production recorded: machine=${machine_id}, wo=${work_order_id}, produced=${produced_count}, rejected=${rejected_count}`);
        return { production_id: productionId };
    }

    // POST /api/production/ingest
    async ingestProduction({ machine_id, work_order_id, produced_count, rejected_count }) {
        return await this.recordProduction({ machine_id, work_order_id, produced_count, rejected_count });
    }

    /**
     * Core aggregate helper — single source of truth for WO production numbers.
     *
     * Business rules:
     *   total_produced = last-stage machine's production_count
     *                    (only parts that completed the ENTIRE pipeline count as "produced")
     *   total_rejected = SUM of every machine's rejected_count
     *                    (any rejection anywhere in the line is a WO rejection)
     *   total_accepted = max(0, total_produced - total_rejected)
     */
    async _computeWorkOrderTotals(work_order_id) {
        const pool = require('../config/database').getPool();

        const [machines] = await pool.execute(
            `SELECT machine_id, stage_order, production_count, rejected_count
             FROM work_order_machines
             WHERE work_order_id = ?
             ORDER BY COALESCE(stage_order, 9999) ASC, assigned_at ASC`,
            [work_order_id]
        );

        if (machines.length === 0) {
            return { total_produced: 0, total_rejected: 0, total_accepted: 0, machine_count: 0 };
        }

        // Only the last machine in the pipeline counts as "produced for the work order"
        const lastMachine = machines[machines.length - 1];
        const total_produced = parseInt(lastMachine.production_count) || 0;

        // All machines contribute to work-order rejection
        const total_rejected = machines.reduce(
            (sum, m) => sum + (parseInt(m.rejected_count) || 0), 0
        );

        const total_accepted = Math.max(0, total_produced - total_rejected);

        return { total_produced, total_rejected, total_accepted, machine_count: machines.length };
    }

    // GET /api/work-orders/:id/production-summary
    async getWorkOrderProductionSummary(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const target = wo.target || 0;
        const { total_produced, total_rejected, total_accepted } = await this._computeWorkOrderTotals(work_order_id);

        const remaining = Math.max(0, target - total_produced);
        const completion_percentage = target > 0
            ? parseFloat((total_produced / target * 100).toFixed(2))
            : 0;

        return {
            work_order_id,
            work_order_name: wo.work_order_name,
            target,
            produced: total_produced,
            accepted: total_accepted,
            rejected: total_rejected,
            remaining,
            completion_percentage
        };
    }

    // GET /api/work-orders/:id/machine-production
    async getMachineProductionForWorkOrder(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const pool = require('../config/database').getPool();
        const [rows] = await pool.execute(
            `SELECT wom.machine_id,
                    m.machine_name,
                    COALESCE(wom.stage_order, 9999)        AS stage_order,
                    COALESCE(wom.production_count, 0)      AS produced_count,
                    COALESCE(wom.rejected_count, 0)        AS rejected_count,
                    GREATEST(0,
                        COALESCE(wom.production_count, 0) -
                        COALESCE(wom.rejected_count, 0)
                    )                                      AS accepted_count
             FROM work_order_machines wom
             JOIN machines m ON wom.machine_id = m.machine_id
             WHERE wom.work_order_id = ?
             ORDER BY COALESCE(wom.stage_order, 9999) ASC, wom.assigned_at ASC`,
            [work_order_id]
        );

        const machines = rows.map((m, idx) => ({
            machine_id: m.machine_id,
            machine_name: m.machine_name,
            stage_order: m.stage_order === 9999 ? null : m.stage_order,
            is_last_stage: idx === rows.length - 1,
            produced_count: parseInt(m.produced_count) || 0,
            accepted_count: parseInt(m.accepted_count) || 0,
            rejected_count: parseInt(m.rejected_count) || 0
        }));

        return {
            work_order_id,
            work_order_name: wo.work_order_name,
            machines,
            _note: 'WO produced = last-stage machine only. WO rejected = sum of all machines.'
        };
    }

    // GET /api/work-orders/:id/summary
    async getWorkOrderFinalSummary(work_order_id, group_by) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        if (group_by === 'machine') {
            return await this.getMachineProductionForWorkOrder(work_order_id);
        }

        const target = wo.target || 0;
        const { total_produced, total_rejected, total_accepted } = await this._computeWorkOrderTotals(work_order_id);
        const remaining = Math.max(0, target - total_produced);
        const completion_percentage = target > 0
            ? parseFloat((total_produced / target * 100).toFixed(2))
            : 0;

        return {
            work_order_id: wo.work_order_id,
            work_order_name: wo.work_order_name,
            status: wo.status,
            target,
            produced: total_produced,
            accepted: total_accepted,
            rejected: total_rejected,
            remaining,
            completion_percentage,
            targeted_end_date: wo.targeted_end_date || null
        };
    }
}

module.exports = new ProductionService();
