const MachineDowntimeModel = require('../models/MachineDowntime');

// GET /api/machines/:machineId/downtime-analysis
exports.getDowntimeAnalysis = async (req, res, next) => {
    try {
        const data = await MachineDowntimeModel.getAnalysis(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/downtime
exports.getDowntimeHistory = async (req, res, next) => {
    try {
        const data = await MachineDowntimeModel.findByMachine(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// POST /api/machines/:machineId/downtime
exports.recordDowntime = async (req, res, next) => {
    try {
        const { reason, severity, start_time, end_time } = req.body;
        if (!start_time) {
            return res.status(400).json({ success: false, message: 'start_time is required' });
        }
        const id = await MachineDowntimeModel.create({
            machine_id: req.params.machineId,
            reason, severity, start_time, end_time
        });
        const record = await MachineDowntimeModel.findById(id);
        res.status(201).json({ success: true, data: record });
    } catch (error) { next(error); }
};
