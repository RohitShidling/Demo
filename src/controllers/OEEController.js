const OEEService = require('../services/oeeService');

// GET /api/machines/:machineId/oee
exports.getMachineOEE = async (req, res, next) => {
    try {
        const { time_range } = req.query;
        const data = await OEEService.getMachineOEE(req.params.machineId, time_range || 'today');
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/oee/history
exports.getOEEHistory = async (req, res, next) => {
    try {
        const { filter } = req.query;
        const data = await OEEService.getOEEHistory(req.params.machineId, filter || 'daily');
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
