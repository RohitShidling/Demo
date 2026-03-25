const ProductionService = require('../services/productionService');

// POST /api/production
exports.recordProduction = async (req, res, next) => {
    try {
        const { machine_id, work_order_id, produced_count, rejected_count, timestamp } = req.body;
        if (!machine_id) {
            return res.status(400).json({ success: false, message: 'machine_id is required' });
        }
        const result = await ProductionService.recordProduction({
            machine_id, work_order_id,
            produced_count: parseInt(produced_count) || 0,
            rejected_count: parseInt(rejected_count) || 0,
            timestamp,
            user_id: req.user?.id
        });
        res.status(201).json({ success: true, message: 'Production recorded', data: result });
    } catch (error) { next(error); }
};

// POST /api/production/ingest
exports.ingestProduction = async (req, res, next) => {
    try {
        const { machine_id, work_order_id, produced_count, rejected_count } = req.body;
        if (!machine_id) {
            return res.status(400).json({ success: false, message: 'machine_id is required' });
        }
        const result = await ProductionService.ingestProduction({
            machine_id, work_order_id,
            produced_count: parseInt(produced_count) || 0,
            rejected_count: parseInt(rejected_count) || 0
        });
        res.status(200).json({ success: true, message: 'Production ingested', data: result });
    } catch (error) { next(error); }
};

// GET /api/work-orders/:workOrderId/production-summary
exports.getProductionSummary = async (req, res, next) => {
    try {
        const data = await ProductionService.getWorkOrderProductionSummary(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/work-orders/:workOrderId/machine-production
exports.getMachineProduction = async (req, res, next) => {
    try {
        const data = await ProductionService.getMachineProductionForWorkOrder(req.params.workOrderId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/work-orders/:workOrderId/summary
exports.getWorkOrderSummary = async (req, res, next) => {
    try {
        const { group_by } = req.query;
        const data = await ProductionService.getWorkOrderFinalSummary(req.params.workOrderId, group_by);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
