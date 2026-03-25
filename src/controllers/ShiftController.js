const ShiftService = require('../services/shiftService');

// POST /api/shifts
exports.createShift = async (req, res, next) => {
    try {
        const { shift_name, start_time, end_time } = req.body;
        if (!shift_name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'shift_name, start_time, and end_time are required' });
        }
        const result = await ShiftService.createShift({ shift_name, start_time, end_time });
        res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// POST /api/shifts/assign
exports.assignOperator = async (req, res, next) => {
    try {
        const { operator_id, shift_id, date } = req.body;
        if (!operator_id || !shift_id || !date) {
            return res.status(400).json({ success: false, message: 'operator_id, shift_id, and date are required' });
        }
        const result = await ShiftService.assignOperator({ operator_id: parseInt(operator_id), shift_id: parseInt(shift_id), date });
        res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// GET /api/shifts/current
exports.getCurrentShift = async (req, res, next) => {
    try {
        const data = await ShiftService.getCurrentShift();
        res.json({ success: true, data: data || { message: 'No active shift currently' } });
    } catch (error) { next(error); }
};

// GET /api/shifts
exports.getAllShifts = async (req, res, next) => {
    try {
        const data = await ShiftService.getAllShifts();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/shifts/:shiftId/performance
exports.getShiftPerformance = async (req, res, next) => {
    try {
        const data = await ShiftService.getShiftPerformance(parseInt(req.params.shiftId));
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
