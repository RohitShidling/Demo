const ProductionService = require('../services/ProductionService');

exports.startMachine = async (req, res, next) => {
    try {
        const { machine_id, machine_name } = req.body;
        const file = req.file;

        if (!machine_id || !machine_name) {
            return res.status(400).json({ message: 'machine_id and machine_name are required' });
        }
        if (!file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const result = await ProductionService.startMachine(
            { machine_id, machine_name },
            file.buffer
        );
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

exports.updateCount = async (req, res, next) => {
    try {
        const { machine_id, count } = req.body;
        if (!machine_id || count === undefined) {
            return res.status(400).json({ message: 'machine_id and count are required' });
        }

        const result = await ProductionService.updateProduction(machine_id, parseInt(count));
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.stopMachine = async (req, res, next) => {
    try {
        const { machine_id } = req.body;
        if (!machine_id) {
            return res.status(400).json({ message: 'machine_id is required' });
        }

        const result = await ProductionService.stopMachine(machine_id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getRealTime = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const data = await ProductionService.getRealTimeData(machineId);

        if (!data) {
            return res.status(404).json({ message: 'Machine not found or not active' });
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const { machineId } = req.params;
        const data = await ProductionService.getMachineHistory(machineId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};
