const WorkOrderService = require('../services/workOrderService');

const getIO = (req) => {
    const io = req.app.get('io');
    return io ? io.of('/machines') : null;
};

exports.createWorkOrder = async (req, res, next) => {
    try {
        const { work_order_name, target, description } = req.body;
        if (!work_order_name || !target) {
            return res.status(400).json({ success: false, message: 'work_order_name and target are required' });
        }
        const wo = await WorkOrderService.createWorkOrder({ work_order_name, target: parseInt(target), description, created_by: req.user.id });
        res.status(201).json({ success: true, data: wo });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:created', { data: wo, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.getAllWorkOrders = async (req, res, next) => {
    try {
        const orders = await WorkOrderService.getAllWorkOrders();
        res.json({ success: true, data: orders });
    } catch (error) { next(error); }
};

exports.getWorkOrderById = async (req, res, next) => {
    try {
        const wo = await WorkOrderService.getWorkOrderById(req.params.workOrderId);
        res.json({ success: true, data: wo });
    } catch (error) { next(error); }
};

exports.updateWorkOrder = async (req, res, next) => {
    try {
        const wo = await WorkOrderService.updateWorkOrder(req.params.workOrderId, req.body);
        res.json({ success: true, data: wo });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:updated', { data: wo, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.deleteWorkOrder = async (req, res, next) => {
    try {
        await WorkOrderService.deleteWorkOrder(req.params.workOrderId);
        res.json({ success: true, message: 'Work order deleted' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:deleted', { work_order_id: req.params.workOrderId, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.assignMachine = async (req, res, next) => {
    try {
        const { machine_id } = req.body;
        if (!machine_id) return res.status(400).json({ success: false, message: 'machine_id is required' });
        await WorkOrderService.assignMachine(req.params.workOrderId, machine_id);
        res.json({ success: true, message: 'Machine assigned to work order' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:machine_assigned', { work_order_id: req.params.workOrderId, machine_id, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.unassignMachine = async (req, res, next) => {
    try {
        await WorkOrderService.unassignMachine(req.params.workOrderId, req.params.machineId);
        res.json({ success: true, message: 'Machine unassigned from work order' });
    } catch (error) { next(error); }
};

exports.getWorkOrderMachines = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getWorkOrderMachines(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getWorkOrderRejections = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getWorkOrderWithRejections(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
