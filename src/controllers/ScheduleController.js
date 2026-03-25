const ScheduleModel = require('../models/Schedule');
const WorkOrderModel = require('../models/WorkOrder');
const MachineModel = require('../models/Machine');

// POST /api/scheduling/plan
exports.createPlan = async (req, res, next) => {
    try {
        const { work_order_id, machine_id, start_time, end_time } = req.body;
        if (!work_order_id || !machine_id || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'work_order_id, machine_id, start_time, and end_time are required' });
        }

        const wo = await WorkOrderModel.findById(work_order_id);
        if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

        const machine = await MachineModel.findById(machine_id);
        if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });

        const id = await ScheduleModel.create({ work_order_id, machine_id, start_time, end_time });
        const schedule = await ScheduleModel.findById(id);
        res.status(201).json({ success: true, data: schedule });
    } catch (error) { next(error); }
};

// GET /api/scheduling
exports.getSchedule = async (req, res, next) => {
    try {
        const data = await ScheduleModel.findAll();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/scheduling/machine/:machineId
exports.getMachineSchedule = async (req, res, next) => {
    try {
        const data = await ScheduleModel.findByMachine(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
