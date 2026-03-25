const ProductionLogModel = require('../models/ProductionLog');
const MachineModel = require('../models/Machine');
const WorkOrderModel = require('../models/WorkOrder');
const AuditLogModel = require('../models/AuditLog');
const logger = require('../utils/logger');

class ProductionService {
    // POST /api/production - Record production
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

        // Update work order totals
        if (work_order_id) {
            if (produced_count > 0) await WorkOrderModel.incrementProduced(work_order_id, produced_count);
            if (rejected_count > 0) await WorkOrderModel.incrementRejected(work_order_id, rejected_count);
        }

        // Audit log
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

    // GET /api/work-orders/:id/production-summary
    async getWorkOrderProductionSummary(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const summary = await ProductionLogModel.getWorkOrderSummary(work_order_id);
        if (!summary) {
            return {
                target: wo.target,
                produced: 0,
                rejected: 0,
                remaining: wo.target,
                completion_percentage: 0
            };
        }
        return {
            target: summary.target,
            produced: summary.total_produced,
            rejected: summary.total_rejected,
            remaining: Math.max(0, summary.remaining),
            completion_percentage: parseFloat(summary.completion_percentage) || 0
        };
    }

    // GET /api/work-orders/:id/machine-production
    async getMachineProductionForWorkOrder(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        return await ProductionLogModel.getMachineProductionForWorkOrder(work_order_id);
    }

    // POST /api/production/ingest - New ingest endpoint
    async ingestProduction({ machine_id, work_order_id, produced_count, rejected_count }) {
        return await this.recordProduction({ machine_id, work_order_id, produced_count, rejected_count });
    }

    // GET /api/work-orders/:id/summary
    async getWorkOrderFinalSummary(work_order_id, group_by) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        if (group_by === 'machine') {
            const machineData = await ProductionLogModel.getMachineProductionForWorkOrder(work_order_id);
            return machineData;
        }

        const summary = await ProductionLogModel.getWorkOrderSummary(work_order_id);
        if (!summary) {
            return {
                work_order_id,
                target: wo.target,
                produced: 0,
                rejected: 0,
                remaining: wo.target,
                completion_percentage: 0
            };
        }
        return {
            work_order_id: summary.work_order_id,
            target: summary.target,
            produced: summary.total_produced,
            rejected: summary.total_rejected,
            remaining: Math.max(0, summary.remaining),
            completion_percentage: parseFloat(summary.completion_percentage) || 0
        };
    }
}

module.exports = new ProductionService();
