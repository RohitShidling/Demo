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

        const produced = parseInt(produced_count, 10) || 0;
        const rejected = parseInt(rejected_count, 10) || 0;
        let activeWO = null;
        if (produced > 0) {
            activeWO = await WorkOrderMachineModel.getActiveWorkOrderForMachine(machine_id);
            if (!activeWO) {
                const e = new Error('Machine is not assigned to an active work order. Production is not allowed.');
                e.statusCode = 403;
                throw e;
            }
            if (work_order_id && work_order_id !== activeWO.work_order_id) {
                const e = new Error('work_order_id does not match the active assignment for this machine');
                e.statusCode = 400;
                throw e;
            }
        }

        const effectiveWorkOrderId = work_order_id || (activeWO ? activeWO.work_order_id : null);
        if (effectiveWorkOrderId) {
            const wo = await WorkOrderModel.findById(effectiveWorkOrderId);
            if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        }

        const productionId = await ProductionLogModel.create({
            machine_id,
            work_order_id: effectiveWorkOrderId,
            produced_count: produced_count || 0,
            rejected_count: rejected_count || 0
        });

        // Keep work_order_machines counters in sync
        if (effectiveWorkOrderId) {
            if (produced > 0) await WorkOrderMachineModel.incrementProductionCount(effectiveWorkOrderId, machine_id, produced);
            if (rejected > 0) await WorkOrderMachineModel.incrementRejectedCount(effectiveWorkOrderId, machine_id, rejected);
        }

        await AuditLogModel.create({
            action: 'PRODUCTION_RECORDED',
            entity_type: 'production_log',
            entity_id: String(productionId),
            user_id,
            details: { machine_id, work_order_id: effectiveWorkOrderId, produced_count, rejected_count }
        });

        logger.info(`Production recorded: machine=${machine_id}, wo=${effectiveWorkOrderId}, produced=${produced_count}, rejected=${rejected_count}`);
        return { production_id: productionId };
    }

    // POST /api/production/ingest
    async ingestProduction({ machine_id, work_order_id, produced_count, rejected_count }) {
        return await this.recordProduction({ machine_id, work_order_id, produced_count, rejected_count });
    }

    /**
     * Core aggregate helper — single source of truth for WO production numbers.
     *
     * total_produced = SUM(production_count) across assigned machines.
     * total_rejected = SUM(rejected_count) across assigned machines.
     * total_accepted = max(0, total_produced - total_rejected)
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

        // Production = sum of all assigned machines' production_count; rejection = sum of rejected_count.
        const total_produced = machines.reduce((sum, m) => sum + (parseInt(m.production_count, 10) || 0), 0);
        const total_rejected = machines.reduce((sum, m) => sum + (parseInt(m.rejected_count, 10) || 0), 0);
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
            _note: 'WO produced = sum of all machines production_count. WO rejected = sum of all machines rejected_count. WO accepted = produced − rejected.'
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
