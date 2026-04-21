const WorkOrderService = require('../services/workOrderService');

const getIO = (req) => {
    const io = req.app.get('io');
    return io ? io.of('/machines') : null;
};

exports.createWorkOrder = async (req, res, next) => {
    try {
        const { work_order_id, work_order_name, target, description, targeted_end_date,
                target_day, target_month, target_year } = req.body;

        if (!work_order_id || !work_order_name || !target) {
            return res.status(400).json({
                success: false,
                message: 'work_order_id, work_order_name and target are required'
            });
        }

        // Build targeted_end_date from parts (day/month/year) or use the direct value
        let endDate = targeted_end_date || null;
        if (!endDate && target_day && target_month && target_year) {
            const day = String(target_day).padStart(2, '0');
            const month = String(target_month).padStart(2, '0');
            endDate = `${target_year}-${month}-${day}`;
        }

        const wo = await WorkOrderService.createWorkOrder({
            work_order_id,
            work_order_name,
            target: parseInt(target),
            description: description || null,
            targeted_end_date: endDate,
            created_by: req.user.id
        });
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
        res.json({ success: true, message: 'Work order deleted and all machine assignments cleared' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:deleted', { work_order_id: req.params.workOrderId, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.assignMachine = async (req, res, next) => {
    try {
        const { machine_id, stage_order } = req.body;
        if (!machine_id) return res.status(400).json({ success: false, message: 'machine_id is required' });
        if (stage_order === undefined || stage_order === null) {
            return res.status(400).json({ success: false, message: 'stage_order is required' });
        }
        await WorkOrderService.assignMachine(req.params.workOrderId, machine_id, parseInt(stage_order, 10));
        res.json({ success: true, message: 'Machine assigned to work order' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:machine_assigned', {
            work_order_id: req.params.workOrderId, machine_id, stage_order,
            timestamp: new Date().toISOString()
        });
    } catch (error) { next(error); }
};

exports.updateMachineStage = async (req, res, next) => {
    try {
        const { stage_order } = req.body;
        if (stage_order === undefined || stage_order === null) {
            return res.status(400).json({ success: false, message: 'stage_order is required' });
        }
        await WorkOrderService.updateMachineStage(req.params.workOrderId, req.params.machineId, parseInt(stage_order));
        res.json({ success: true, message: 'Machine stage updated' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:stage_updated', {
            work_order_id: req.params.workOrderId, machine_id: req.params.machineId,
            stage_order: parseInt(stage_order), timestamp: new Date().toISOString()
        });
    } catch (error) { next(error); }
};

exports.unassignMachine = async (req, res, next) => {
    try {
        await WorkOrderService.unassignMachine(req.params.workOrderId, req.params.machineId);
        res.json({ success: true, message: 'Machine unassigned from work order' });

        const ns = getIO(req);
        if (ns) ns.emit('workorder:machine_unassigned', {
            work_order_id: req.params.workOrderId, machine_id: req.params.machineId,
            timestamp: new Date().toISOString()
        });
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

exports.getWorkOrderRejectionDetails = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getWorkOrderRejectionDetails(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMachineRejectionDetailsForWorkOrder = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getMachineRejectionDetailsForWorkOrder(
            req.params.workOrderId,
            req.params.machineId
        );
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getChecklistOverview = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getChecklistOverview(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMachineRunningStatus = async (req, res, next) => {
    try {
        const data = await WorkOrderService.getMachineRunningStatus(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
