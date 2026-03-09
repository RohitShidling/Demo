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
        const { filter, start_date, end_date } = req.query;
        const data = await MachineService.getMachineVisualization(req.params.machineId, { filter, start_date, end_date });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
