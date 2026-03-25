const ShiftModel = require('../models/Shift');
const logger = require('../utils/logger');

class ShiftService {
    async createShift({ shift_name, start_time, end_time }) {
        const id = await ShiftModel.create({ shift_name, start_time, end_time });
        logger.info(`Shift created: ${shift_name} (${start_time} - ${end_time})`);
        return await ShiftModel.findById(id);
    }

    async assignOperator({ operator_id, shift_id, date }) {
        const shift = await ShiftModel.findById(shift_id);
        if (!shift) { const e = new Error('Shift not found'); e.statusCode = 404; throw e; }
        const id = await ShiftModel.assignOperator({ operator_id, shift_id, date });
        logger.info(`Operator ${operator_id} assigned to shift ${shift_id} on ${date}`);
        return { id, operator_id, shift_id, date };
    }

    async getCurrentShift() {
        return await ShiftModel.getCurrentShift();
    }

    async getAllShifts() {
        return await ShiftModel.findAll();
    }

    async getShiftPerformance(shift_id) {
        const shift = await ShiftModel.findById(shift_id);
        if (!shift) { const e = new Error('Shift not found'); e.statusCode = 404; throw e; }
        return await ShiftModel.getShiftPerformance(shift_id);
    }
}

module.exports = new ShiftService();
