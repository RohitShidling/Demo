const WorkflowStepModel = require('../models/WorkflowStep');
const WorkOrderModel = require('../models/WorkOrder');
const logger = require('../utils/logger');

class WorkflowService {
    async getWorkflow(work_order_id) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const steps = await WorkflowStepModel.findByWorkOrder(work_order_id);
        return { work_order: wo, workflow_steps: steps };
    }

    async addStep(work_order_id, { step_order, step_name, step_description, assigned_machine_id }) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        const id = await WorkflowStepModel.create({ work_order_id, step_order, step_name, step_description, assigned_machine_id });
        logger.info(`Workflow step added to ${work_order_id}: ${step_name}`);
        return await WorkflowStepModel.findById(id);
    }

    async addBulkSteps(work_order_id, steps) {
        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) { const e = new Error('Work order not found'); e.statusCode = 404; throw e; }
        await WorkflowStepModel.bulkCreate(work_order_id, steps);
        return await WorkflowStepModel.findByWorkOrder(work_order_id);
    }

    async updateStepStatus(step_id, status) {
        const step = await WorkflowStepModel.findById(step_id);
        if (!step) { const e = new Error('Workflow step not found'); e.statusCode = 404; throw e; }
        await WorkflowStepModel.updateStatus(step_id, status);
        logger.info(`Workflow step ${step_id} status → ${status}`);
        return await WorkflowStepModel.findById(step_id);
    }

    async updateStep(step_id, updates) {
        const step = await WorkflowStepModel.findById(step_id);
        if (!step) { const e = new Error('Workflow step not found'); e.statusCode = 404; throw e; }
        await WorkflowStepModel.update(step_id, updates);
        return await WorkflowStepModel.findById(step_id);
    }

    async deleteStep(step_id) {
        await WorkflowStepModel.delete(step_id);
    }
}

module.exports = new WorkflowService();
