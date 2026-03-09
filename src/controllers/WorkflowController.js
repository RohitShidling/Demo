const WorkflowService = require('../services/workflowService');

const getIO = (req) => {
    const io = req.app.get('io');
    return io ? io.of('/machines') : null;
};

exports.getWorkflow = async (req, res, next) => {
    try {
        const data = await WorkflowService.getWorkflow(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.addStep = async (req, res, next) => {
    try {
        const { step_order, step_name, step_description, assigned_machine_id } = req.body;
        if (!step_name || step_order === undefined) {
            return res.status(400).json({ success: false, message: 'step_name and step_order are required' });
        }
        const step = await WorkflowService.addStep(req.params.workOrderId, { step_order, step_name, step_description, assigned_machine_id });
        res.status(201).json({ success: true, data: step });

        const ns = getIO(req);
        if (ns) ns.emit('workflow:step_added', { work_order_id: req.params.workOrderId, step, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.addBulkSteps = async (req, res, next) => {
    try {
        const { steps } = req.body;
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ success: false, message: 'steps array is required' });
        }
        const result = await WorkflowService.addBulkSteps(req.params.workOrderId, steps);
        res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
};

exports.updateStepStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'status is required' });
        const step = await WorkflowService.updateStepStatus(parseInt(req.params.stepId), status);
        res.json({ success: true, data: step });

        const ns = getIO(req);
        if (ns) ns.emit('workflow:step_updated', { step, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.updateStep = async (req, res, next) => {
    try {
        const step = await WorkflowService.updateStep(parseInt(req.params.stepId), req.body);
        res.json({ success: true, data: step });
    } catch (error) { next(error); }
};

exports.deleteStep = async (req, res, next) => {
    try {
        await WorkflowService.deleteStep(parseInt(req.params.stepId));
        res.json({ success: true, message: 'Step deleted' });
    } catch (error) { next(error); }
};
