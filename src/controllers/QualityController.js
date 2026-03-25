const QualityInspectionModel = require('../models/QualityInspection');

// POST /api/quality/inspection
exports.recordInspection = async (req, res, next) => {
    try {
        const { machine_id, work_order_id, parameters, status, remarks } = req.body;
        if (!machine_id) {
            return res.status(400).json({ success: false, message: 'machine_id is required' });
        }
        const id = await QualityInspectionModel.create({
            machine_id, work_order_id, parameters, status, remarks,
            inspected_by: req.user?.id
        });
        const inspection = await QualityInspectionModel.findById(id);
        res.status(201).json({ success: true, data: inspection });
    } catch (error) { next(error); }
};

// GET /api/quality/reports
exports.getReports = async (req, res, next) => {
    try {
        const { work_order_id, machine_id } = req.query;
        let data;
        if (work_order_id) {
            data = await QualityInspectionModel.findByWorkOrder(work_order_id);
        } else if (machine_id) {
            data = await QualityInspectionModel.findByMachine(machine_id);
        } else {
            data = await QualityInspectionModel.findAll();
        }
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
