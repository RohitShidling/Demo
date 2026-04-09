const WorkOrderModel = require('../models/WorkOrder');
const WorkOrderMachineModel = require('../models/WorkOrderMachine');
const PartRejectionModel = require('../models/PartRejection');
const MachineRunModel = require('../models/MachineRun');
const MachineModel = require('../models/Machine');
const MachineChecklistModel = require('../models/MachineChecklist');
const logger = require('../utils/logger');
const crypto = require('crypto');

class WorkOrderService {
    formatRejectionEntry(row) {
        return {
            rejection_id: row.id,
            work_order_id: row.work_order_id,
            work_order_name: row.work_order_name || null,
            work_order_description: row.work_order_description || null,
            machine_id: row.machine_id,
            machine_name: row.machine_name || null,
            ingest_path: row.ingest_path || null,
            operator_id: row.operator_id,
            operator_name: row.operator_name || null,
            supervisor_name: row.supervisor_name || null,
            rejected_count: row.rejected_count || 0,
            rejection_reason: row.rejection_reason || null,
            rework_reason: row.rework_reason || null,
            part_description: row.part_description || null,
            part_image: row.part_image ? row.part_image.toString('base64') : null,
            timestamp: row.created_at
        };
    }

    async normalizeMachineStages(work_order_id) {
        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        for (let i = 0; i < machines.length; i++) {
            const desiredStage = i + 1;
            if (machines[i].stage_order !== desiredStage) {
                await WorkOrderMachineModel.updateStage(work_order_id, machines[i].machine_id, desiredStage);
            }
        }
    }

    async enrichWorkOrderTotals(workOrder) {
        if (!workOrder) return workOrder;
        const totals = await WorkOrderMachineModel.getWorkOrderTotals(workOrder.work_order_id);
        return {
            ...workOrder,
            total_produced: totals.total_produced || 0,
            total_rejected: totals.total_rejected || 0,
            total_accepted: totals.total_accepted || 0
        };
    }

    async createWorkOrder({ work_order_name, target, description, targeted_end_date, created_by }) {
        const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const work_order_id = `WO-${randomId}`;
        await WorkOrderModel.create({ work_order_id, work_order_name, target, description, targeted_end_date, created_by });
        const wo = await WorkOrderModel.findById(work_order_id);
        logger.info(`Work order created: ${work_order_id}`);
        return wo;
    }

    async getAllWorkOrders() {
        const orders = await WorkOrderModel.findAll();
        return await Promise.all(orders.map((wo) => this.enrichWorkOrderTotals(wo)));
    }

    async getWorkOrderById(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        return await this.enrichWorkOrderTotals(wo);
    }

    async updateWorkOrder(work_order_id, updates) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        await WorkOrderModel.update(work_order_id, updates);
        return await this.enrichWorkOrderTotals(await WorkOrderModel.findById(work_order_id));
    }

    async deleteWorkOrder(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        // Get all assigned machines before deleting (cascade will handle DB rows)
        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        // Reset machine statuses to NOT_STARTED
        for (const m of machines) {
            try {
                await MachineModel.updateStatus(m.machine_id, 'NOT_STARTED');
            } catch (e) { logger.error(`Status reset error for ${m.machine_id}: ${e.message}`); }
        }
        await WorkOrderModel.delete(work_order_id);
        logger.info(`Work order deleted: ${work_order_id} (${machines.length} machines unassigned)`);
    }

    async assignMachine(work_order_id, machine_id, stage_order = null) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        if (wo.status === 'COMPLETED' || wo.status === 'CANCELLED') {
            const e = new Error('Cannot assign machine to a completed or cancelled work order'); e.statusCode = 400; throw e;
        }
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const existingMachines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const nextStage = existingMachines.length + 1;
        const requestedStage = stage_order === null || stage_order === undefined
            ? nextStage
            : parseInt(stage_order, 10);

        if (!Number.isInteger(requestedStage) || requestedStage < 1) {
            const e = new Error('stage_order must be a positive integer');
            e.statusCode = 400;
            throw e;
        }

        // Assignment is strictly sequential: next machine must be next stage only.
        if (requestedStage !== nextStage) {
            const e = new Error(
                `Invalid stage_order. Stage ${requestedStage} is not allowed now. Please assign next stage: ${nextStage}`
            );
            e.statusCode = 400;
            throw e;
        }

        // assign() internally checks for duplicate active assignment and throws 409 if found
        await WorkOrderMachineModel.assign(work_order_id, machine_id, requestedStage);
        await this.normalizeMachineStages(work_order_id);
        logger.info(`Machine ${machine_id} assigned to work order ${work_order_id} (stage: ${requestedStage})`);
    }

    async updateMachineStage(work_order_id, machine_id, stage_order) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const currentIndex = machines.findIndex((m) => m.machine_id === machine_id);
        if (currentIndex === -1) {
            const e = new Error('Machine is not assigned to this work order');
            e.statusCode = 404;
            throw e;
        }

        const targetStage = parseInt(stage_order, 10);
        if (!Number.isInteger(targetStage) || targetStage < 1 || targetStage > machines.length) {
            const e = new Error(`stage_order must be between 1 and ${machines.length}`);
            e.statusCode = 400;
            throw e;
        }

        const [currentMachine] = machines.splice(currentIndex, 1);
        machines.splice(targetStage - 1, 0, currentMachine);
        for (let i = 0; i < machines.length; i++) {
            await WorkOrderMachineModel.updateStage(work_order_id, machines[i].machine_id, i + 1);
        }
        logger.info(`Stage updated: machine ${machine_id} → stage ${stage_order} in WO ${work_order_id}`);
    }

    async unassignMachine(work_order_id, machine_id) {
        await WorkOrderMachineModel.unassign(work_order_id, machine_id);
        await this.normalizeMachineStages(work_order_id);
        // Reset machine status when unassigned
        try { await MachineModel.updateStatus(machine_id, 'NOT_STARTED'); } catch (_) {}
    }

    async getWorkOrderMachines(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const enriched = await Promise.all(machines.map(async (m) => {
            const activeRun = await MachineRunModel.findActiveRun(m.machine_id);
            const lastRun = activeRun || await MachineRunModel.findLastRun(m.machine_id);
            const totalRejected = await PartRejectionModel.getTotalRejectedByMachine(m.machine_id);

            const productionTarget = wo.target || 0;
            const totalProduced = m.production_count || 0;
            const rejectedCount = m.rejected_count || 0;
            const acceptedCount = Math.max(0, totalProduced - rejectedCount);
            const progress = productionTarget > 0 ? Math.min(100, Math.round((totalProduced / productionTarget) * 100)) : 0;

            return {
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                ingest_path: m.ingest_path,
                status: m.status || (activeRun ? 'RUNNING' : 'NOT_STARTED'),
                stage_order: m.stage_order,
                assigned_at: m.assigned_at,
                production_target: productionTarget,
                total_produced: totalProduced,
                accepted_count: acceptedCount,
                rejected_count: rejectedCount,
                progress_percentage: progress,
                total_rejected_all_time: totalRejected,
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

    async getWorkOrderRejectionDetails(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const rows = await PartRejectionModel.findByWorkOrder(work_order_id);
        const details = rows.map((r) => this.formatRejectionEntry(r));
        const byMachine = {};
        for (const row of rows) {
            if (!byMachine[row.machine_id]) {
                byMachine[row.machine_id] = {
                    machine_id: row.machine_id,
                    machine_name: row.machine_name || null,
                    ingest_path: row.ingest_path || null,
                    total_rejected: 0
                };
            }
            byMachine[row.machine_id].total_rejected += (row.rejected_count || 0);
        }
        return {
            work_order_id: wo.work_order_id,
            work_order_name: wo.work_order_name,
            part_description: wo.description || null,
            total_rejected: details.reduce((acc, item) => acc + (item.rejected_count || 0), 0),
            machine_wise_summary: Object.values(byMachine),
            rejections: details
        };
    }

    async getMachineRejectionDetailsForWorkOrder(work_order_id, machine_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const rows = await PartRejectionModel.findByMachineAndWorkOrder(machine_id, work_order_id);
        const details = rows.map((r) => this.formatRejectionEntry(r));

        return {
            work_order_id: wo.work_order_id,
            work_order_name: wo.work_order_name,
            part_description: wo.description || null,
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            ingest_path: machine.ingest_path,
            total_rejected: details.reduce((acc, item) => acc + (item.rejected_count || 0), 0),
            rejections: details
        };
    }

    // Checklist overview for all machines in a work order
    async getChecklistOverview(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const overview = await Promise.all(machines.map(async (m) => {
            const pool = require('../config/database').getPool();
            const [items] = await pool.execute(
                `SELECT status FROM machine_checklists WHERE machine_id = ?`,
                [m.machine_id]
            );
            let checklistStatus = 'NOT_STARTED';
            const completedItems = items.filter(i => i.status === 'OK' || i.status === 'NA').length;
            if (items.length > 0) {
                if (completedItems === 0) checklistStatus = 'NOT_STARTED';
                else if (completedItems === items.length) checklistStatus = 'COMPLETED';
                else checklistStatus = 'PENDING';
            }
            return {
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                ingest_path: m.ingest_path,
                checklist_status: checklistStatus,
                stage_order: m.stage_order
            };
        }));

        return { work_order_id, work_order_name: wo.work_order_name, machines: overview };
    }

    // Machine running status for all machines in a work order
    async getMachineRunningStatus(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }

        const machines = await WorkOrderMachineModel.getMachinesByWorkOrder(work_order_id);
        const statuses = machines.map(m => {
            let runningStatus = 'NOT_STARTED';
            const s = (m.status || 'NOT_STARTED').toUpperCase();
            if (s === 'RUNNING') runningStatus = 'RUNNING';
            else if (s === 'STOPPED') runningStatus = 'STOPPED';
            else if (s === 'MAINTENANCE') runningStatus = 'MAINTENANCE';
            else runningStatus = 'NOT_STARTED';
            return {
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                ingest_path: m.ingest_path,
                status: runningStatus,
                stage_order: m.stage_order
            };
        });

        return { work_order_id, work_order_name: wo.work_order_name, machines: statuses };
    }
}

module.exports = new WorkOrderService();
