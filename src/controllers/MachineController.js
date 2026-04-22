const MachineService = require('../services/machineService');
const logger = require('../utils/logger');

const getIO = (req) => {
    const io = req.app.get('io');
    if (io) return io.of('/machines');
    return null;
};

exports.createMachine = async (req, res, next) => {
    try {
        const { machine_name, ingest_path } = req.body;
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (!machine_name || !ingest_path) return res.status(400).json({ message: 'machine_name and ingest_path are required' });

        const result = await MachineService.createMachine({ machine_name, ingest_path }, file ? file.buffer : null);
        res.status(201).json(result);

        const ns = getIO(req);
        if (ns) {
            const allMachines = await MachineService.getAllMachines();
            const newMachine = allMachines.find(m => m.machine_id === result.machine_id);
            ns.emit('machine:update', { event: 'machine_created', data: newMachine || result, timestamp: new Date().toISOString() });
        }
    } catch (error) { next(error); }
};

exports.handleIngest = async (req, res, next) => {
    try {
        const lookupPath = `/${req.params.pathId}`;
        const result = await MachineService.handleIngest(lookupPath);
        res.status(200).json({ status: 'received' });

        const ns = getIO(req);
        if (ns) {
            try {
                const dashboard = await MachineService.getDashboard(result.machine_id);
                ns.emit('machine:update', { event: 'ingest_received', data: { machine_id: result.machine_id, run_id: result.run_id, bucket_hour: result.bucket_hour, dashboard }, timestamp: new Date().toISOString() });
            } catch (e) { logger.error(`Broadcast error: ${e.message}`); }
        }
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ message: error.message });
        next(error);
    }
};

exports.stopMachine = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const result = await MachineService.stopMachine(machineId);
        res.json({ status: 'stopped' });

        const ns = getIO(req);
        if (ns) {
            const dashboard = await MachineService.getDashboard(machineId);
            ns.emit('machine:update', { event: 'machine_stopped', data: { machine_id: machineId, ...result, dashboard }, timestamp: new Date().toISOString() });
        }
    } catch (error) { next(error); }
};

exports.getDashboard = async (req, res, next) => {
    try {
        const data = await MachineService.getDashboard(req.params.machineId);
        res.json(data);
    } catch (error) { next(error); }
};

exports.getHistory = async (req, res, next) => {
    try {
        const data = await MachineService.getHistory(req.params.machineId);
        res.json(data);
    } catch (error) { next(error); }
};

exports.getAllMachines = async (req, res, next) => {
    try {
        const data = await MachineService.getAllMachines();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMachineDetails = async (req, res, next) => {
    try {
        const data = await MachineService.getMachineDetails(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMachineVisualization = async (req, res, next) => {
    try {
        const { filter, start_date, end_date, date } = req.query;
        const data = await MachineService.getMachineVisualization(req.params.machineId, { filter, start_date, end_date, date });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/production-count  — all machines production count
exports.getAllMachinesProductionCount = async (req, res, next) => {
    try {
        const data = await MachineService.getAllMachinesProductionCount();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/production-count  — specific machine production count
exports.getMachineProductionCount = async (req, res, next) => {
    try {
        const data = await MachineService.getMachineProductionCount(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/rejection-count  — all machines rejection count
exports.getAllMachinesRejectionCount = async (req, res, next) => {
    try {
        const data = await MachineService.getAllMachinesRejectionCount();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/rejection-count  — specific machine rejection count
exports.getMachineRejectionCount = async (req, res, next) => {
    try {
        const data = await MachineService.getMachineRejectionCount(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/assignment-status  — check if machine is assigned to a work order
exports.getMachineAssignmentStatus = async (req, res, next) => {
    try {
        const WorkOrderService = require('../services/workOrderService');
        const data = await WorkOrderService.getMachineAssignmentStatus(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/production/hourly  — last 24 hours, one bar per hour
exports.getHourlyProduction = async (req, res, next) => {
    try {
        const data = await MachineService.getHourlyProduction(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/production/daily  — last 31 days, one bar per day
exports.getDailyProduction = async (req, res, next) => {
    try {
        const data = await MachineService.getDailyProduction(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/machines/:machineId/production/custom?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
exports.getCustomProduction = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date and end_date query parameters are required (YYYY-MM-DD)'
            });
        }
        const data = await MachineService.getCustomProduction(req.params.machineId, start_date, end_date);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
