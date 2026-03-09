const WorkOrderModel = require('../models/WorkOrder');
const WorkOrderMachineModel = require('../models/WorkOrderMachine');
const PartRejectionModel = require('../models/PartRejection');
const MachineRunModel = require('../models/MachineRun');
const MachineModel = require('../models/Machine');
const logger = require('../utils/logger');
const crypto = require('crypto');

class WorkOrderService {
    async createWorkOrder({ work_order_name, target, description, created_by }) {
        const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const work_order_id = `WO-${randomId}`;
        await WorkOrderModel.create({ work_order_id, work_order_name, target, description, created_by });
        const wo = await WorkOrderModel.findById(work_order_id);
        logger.info(`Work order created: ${work_order_id}`);
        return wo;
    }

    async getAllWorkOrders() {
        const orders = await WorkOrderModel.findAll();
        return orders;
    }

    async getWorkOrderById(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        return wo;
    }

    async updateWorkOrder(work_order_id, updates) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        await WorkOrderModel.update(work_order_id, updates);
        return await WorkOrderModel.findById(work_order_id);
    }

    async deleteWorkOrder(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        await WorkOrderModel.delete(work_order_id);
        logger.info(`Work order deleted: ${work_order_id}`);
    }

    async assignMachine(work_order_id, machine_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        await WorkOrderMachineModel.assign(work_order_id, machine_id);
        logger.info(`Machine ${machine_id} assigned to work order ${work_order_id}`);
    }

    async unassignMachine(work_order_id, machine_id) {
        await WorkOrderMachineModel.unassign(work_order_id, machine_id);
    }

    async getWorkOrderMachines(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const enriched = await Promise.all(machines.map(async (m) => {
            const activeRun = await MachineRunModel.findActiveRun(m.machine_id);
            const lastRun = activeRun || await MachineRunModel.findLastRun(m.machine_id);
            const rejections = await PartRejectionModel.getTotalRejectedByMachine(m.machine_id);

            return {
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                ingest_path: m.ingest_path,
                status: m.status || (activeRun ? 'RUNNING' : 'NOT_STARTED'),
                assigned_at: m.assigned_at,
                total_rejected: rejections,
                current_run: lastRun ? {
                    start_time: lastRun.start_time,
                    end_time: lastRun.end_time,
                    total_count: lastRun.total_count,
                    accepted_count: lastRun.accepted_count || 0,
                    rejected_count: lastRun.rejected_count || 0,
                    last_activity_time: lastRun.last_activity_time
                } : null
            };
        }));

        return { work_order: wo, machines: enriched };
    }

    async getWorkOrderWithRejections(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const rejectionsByMachine = await PartRejectionModel.getRejectionsByMachineGrouped(work_order_id);
        return { work_order: wo, rejections_by_machine: rejectionsByMachine };
    }
}

module.exports = new WorkOrderService();
