const MachineService = require('../services/machineService');
const logger = require('../utils/logger');

/**
 * Helper: get the Socket.IO /machines namespace from the Express app
 */
const getIO = (req) => {
    const io = req.app.get('io');
    if (io) return io.of('/machines');
    return null;
};

exports.createMachine = async (req, res, next) => {
    try {
        const { machine_name, ingest_path } = req.body;
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

        if (!machine_name || !ingest_path) {
            return res.status(400).json({ message: 'machine_name and ingest_path are required' });
        }

        const result = await MachineService.createMachine(
            { machine_name, ingest_path },
            file ? file.buffer : null
        );

        res.status(201).json(result);

        // ★ Emit Socket.IO real-time broadcast ★
        const ns = getIO(req);
        if (ns) {
            // Fetch the full machine data (with status, image, etc.) for the broadcast
            const allMachines = await MachineService.getAllMachines();
            const newMachine = allMachines.find(m => m.machine_id === result.machine_id);

            ns.emit('machine:update', {
                event: 'machine_created',
                data: newMachine || result,
                timestamp: new Date().toISOString()
            });
            logger.info(`[REST→Socket.IO] Broadcast machine_created: ${result.machine_id}`);
        }
    } catch (error) {
        next(error);
    }
};

exports.handleIngest = async (req, res, next) => {
    try {
        const lookupPath = `/${req.params.pathId}`;
        const result = await MachineService.handleIngest(lookupPath);

        // Return 200 OK fast.
        res.status(200).json({ status: 'received' });

        // ★ Emit Socket.IO real-time broadcast ★
        const ns = getIO(req);
        if (ns) {
            try {
                const dashboard = await MachineService.getDashboard(result.machine_id);
                ns.emit('machine:update', {
                    event: 'ingest_received',
                    data: {
                        machine_id: result.machine_id,
                        run_id: result.run_id,
                        bucket_hour: result.bucket_hour,
                        dashboard: dashboard
                    },
                    timestamp: new Date().toISOString()
                });
                logger.info(`[REST→Socket.IO] Broadcast ingest_received for ${result.machine_id}, count: ${dashboard.current_run?.total_count}`);
            } catch (broadcastErr) {
                logger.error(`[REST→Socket.IO] Broadcast error: ${broadcastErr.message}`);
            }
        }
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

exports.stopMachine = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const result = await MachineService.stopMachine(machineId);
        res.json({ status: 'stopped' });

        // ★ Emit Socket.IO real-time broadcast ★
        const ns = getIO(req);
        if (ns) {
            // Fetch the full updated machine data for the broadcast
            const dashboard = await MachineService.getDashboard(machineId);
            ns.emit('machine:update', {
                event: 'machine_stopped',
                data: {
                    machine_id: machineId,
                    ...result,
                    dashboard: dashboard
                },
                timestamp: new Date().toISOString()
            });
            logger.info(`[REST→Socket.IO] Broadcast machine_stopped: ${machineId}`);
        }
    } catch (error) {
        next(error);
    }
};

exports.getDashboard = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const data = await MachineService.getDashboard(machineId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const data = await MachineService.getHistory(machineId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getAllMachines = async (req, res, next) => {
    try {
        const data = await MachineService.getAllMachines();
        res.json(data);
    } catch (error) {
        next(error);
    }
};
