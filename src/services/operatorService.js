const MachineModel = require('../models/Machine');
const PartRejectionModel = require('../models/PartRejection');
const OperatorSkillModel = require('../models/OperatorSkill');
const MachineOperatorModel = require('../models/MachineOperator');
const MachineBreakdownModel = require('../models/MachineBreakdown');
const WorkOrderModel = require('../models/WorkOrder');
const DailyProductionModel = require('../models/DailyProduction');
const WorkOrderMachineModel = require('../models/WorkOrderMachine');
const ProductionLogModel = require('../models/ProductionLog');
const logger = require('../utils/logger');

const BREAKDOWN_REASONS = [
    'TOOL_CHANGER',
    'MACHINE_BREAKDOWN',
    'MONTHLY_PM',
    'QC_ISSUES',
    'CORRECTION',
    'WAITING_FOR_RM',
    'POWER_CUT',
    'SHIFT_CHANGE',
    'NO_OPERATOR',
    'OTHERS'
];

class OperatorService {
    // ── Machine Status (Checklist) ──
    async updateMachineStatus(machine_id, status) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        const validStatuses = ['RUNNING', 'MAINTENANCE', 'NOT_STARTED'];
        if (!validStatuses.includes(status)) {
            const e = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            e.statusCode = 400; throw e;
        }
        await MachineModel.updateStatus(machine_id, status);
        logger.info(`Machine ${machine_id} status → ${status}`);
        return { machine_id, status };
    }

    async getMachineChecklist() {
        const machines = await MachineModel.findAll();
        return machines.map(m => ({
            machine_id: m.machine_id,
            machine_name: m.machine_name,
            status: m.status || 'NOT_STARTED',
            updated_at: m.updated_at
        }));
    }

    // ── Part Rejection ──
    async reportRejection({
        machine_id,
        work_order_id,
        operator_id,
        rejection_reason,
        rework_reason,
        part_description,
        supervisor_name,
        part_image,
        rejected_count
    }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const id = await PartRejectionModel.create({
            machine_id,
            work_order_id,
            operator_id,
            rejection_reason,
            rework_reason,
            part_description,
            supervisor_name,
            part_image,
            rejected_count: rejected_count || 1
        });

        // Update work order rejection count if work_order_id provided
        if (work_order_id) {
            try { await WorkOrderModel.incrementRejected(work_order_id, rejected_count || 1); } catch (e) { /* ignore */ }
        }

        // Keep work_order_machines and production_logs in sync for machine/work-order reports
        try {
            const targetWO = work_order_id
                ? { work_order_id }
                : await WorkOrderMachineModel.getActiveWorkOrderForMachine(machine_id);

            if (targetWO?.work_order_id) {
                await WorkOrderMachineModel.incrementRejectedCount(targetWO.work_order_id, machine_id, rejected_count || 1);
                await ProductionLogModel.create({
                    machine_id,
                    work_order_id: targetWO.work_order_id,
                    produced_count: 0,
                    rejected_count: rejected_count || 1
                });
            }
        } catch (_) { /* ignore */ }

        // Update daily production rejection
        try {
            const today = new Date().toISOString().split('T')[0];
            await DailyProductionModel.getOrCreate(machine_id, today);
            await DailyProductionModel.incrementRejected(machine_id, today, rejected_count || 1);
        } catch (e) { /* ignore */ }

        logger.info(`Part rejection reported on machine ${machine_id} by operator ${operator_id}`);
        return await PartRejectionModel.findById(id);
    }

    async getRejectionsByMachine(machine_id) {
        return await PartRejectionModel.findByMachine(machine_id);
    }

    async getAllRejections() {
        return await PartRejectionModel.findAll();
    }

    // ── Operator Skills ──
    async updateSkills({ operator_id, operator_name, skill_set }) {
        const id = await OperatorSkillModel.createOrUpdate({ operator_id, operator_name, skill_set });
        logger.info(`Skills updated for operator ${operator_id}`);
        return await OperatorSkillModel.findByOperator(operator_id);
    }

    async getSkills(operator_id) {
        return await OperatorSkillModel.findByOperator(operator_id);
    }

    async getAllSkills() {
        return await OperatorSkillModel.findAll();
    }

    // ── Machine-Operator Assignment ──
    async assignToMachine({ machine_id, operator_id, mentor_name }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        await MachineOperatorModel.assign({ machine_id, operator_id, mentor_name });
        logger.info(`Operator ${operator_id} assigned to machine ${machine_id}`);
        return await MachineOperatorModel.findByMachine(machine_id);
    }

    async unassignFromMachine(machine_id, operator_id) {
        await MachineOperatorModel.unassign(machine_id, operator_id);
    }

    async getMachineOperators(machine_id) {
        return await MachineOperatorModel.findByMachine(machine_id);
    }

    async getOperatorMachines(operator_id) {
        return await MachineOperatorModel.findByOperator(operator_id);
    }

    async getAllAssignments() {
        return await MachineOperatorModel.findAll();
    }

    // ── Machine Breakdown ──
    normalizeBreakdownReason(reason) {
        if (reason === undefined || reason === null || String(reason).trim() === '') {
            const e = new Error('breakdown_reason is required');
            e.statusCode = 400;
            throw e;
        }
        const normalized = String(reason).trim().toUpperCase().replace(/\s+/g, '_');
        if (!BREAKDOWN_REASONS.includes(normalized)) {
            const e = new Error(`Invalid breakdown_reason. Allowed values: ${BREAKDOWN_REASONS.join(', ')}`);
            e.statusCode = 400;
            throw e;
        }
        return normalized;
    }

    async reportBreakdown({ machine_id, operator_id, problem_description, severity, breakdown_reason, start_time, end_time, comment }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const normalizedReason = this.normalizeBreakdownReason(breakdown_reason);
        const normalizedComment = comment !== undefined ? comment : null;
        const reasonAsDescription = problem_description || normalizedReason.replace(/_/g, ' ');

        if (start_time && end_time && new Date(end_time).getTime() < new Date(start_time).getTime()) {
            const e = new Error('end_time cannot be earlier than start_time');
            e.statusCode = 400;
            throw e;
        }

        const id = await MachineBreakdownModel.create({
            machine_id,
            operator_id,
            problem_description: reasonAsDescription,
            severity,
            breakdown_reason: normalizedReason,
            start_time: start_time || null,
            end_time: end_time || null,
            comment: normalizedComment
        });

        // Auto-set machine status to MAINTENANCE when breakdown reported
        await MachineModel.updateStatus(machine_id, 'MAINTENANCE');
        logger.info(`Breakdown reported on machine ${machine_id}: ${normalizedReason}`);
        return await MachineBreakdownModel.findById(id);
    }

    async updateBreakdownStatus(breakdown_id, status) {
        const bd = await MachineBreakdownModel.findById(breakdown_id);
        if (!bd) { const e = new Error('Breakdown not found'); e.statusCode = 404; throw e; }
        await MachineBreakdownModel.updateStatus(breakdown_id, status);
        // If resolved, set machine back to NOT_STARTED
        if (status === 'RESOLVED') {
            await MachineModel.updateStatus(bd.machine_id, 'NOT_STARTED');
        }
        logger.info(`Breakdown ${breakdown_id} status → ${status}`);
        return await MachineBreakdownModel.findById(breakdown_id);
    }

    async getBreakdownsByMachine(machine_id) {
        return await MachineBreakdownModel.findByMachine(machine_id);
    }

    async getActiveBreakdowns() {
        return await MachineBreakdownModel.findActive();
    }

    async getAllBreakdowns() {
        return await MachineBreakdownModel.findAll();
    }

    getBreakdownReasons() {
        return BREAKDOWN_REASONS;
    }
}

module.exports = new OperatorService();
