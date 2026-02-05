const MachineService = require('../services/MachineService');

exports.createMachine = async (req, res, next) => {
    try {
        const { machine_name, ingest_path } = req.body;
        const file = req.file;

        if (!machine_name || !ingest_path) {
            return res.status(400).json({ message: 'machine_name and ingest_path are required' });
        }

        // Remove trailing/leading slashes for consistency if needed, but Service handles it.

        const result = await MachineService.createMachine(
            { machine_name, ingest_path },
            file ? file.buffer : null
        );
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

exports.handleIngest = async (req, res, next) => {
    try {
        // Path comes from wildcard param. 
        // Route: /ingest/* -> req.params[0] or similar depending on route definition.
        // Or specific param :ingestId if we use that. 
        // User requested: "Identify the machine using the ingest path".
        // Let's assume the router passes the full path segment.

        const ingestPath = req.params.pathId ? `/ingest/${req.params.pathId}` : req.path;
        // Note: Router determines how we get this. 
        // If Route is `/ingest/:pathId`, then `/ingest/press-01` -> pathId="press-01".
        // Service expects full path or partial. Let's pass what we got.
        // Better: pass the ID part and let service prepend /ingest.
        // Actually Service does `startsWith('/')`.
        // Let's rely on `req.params.pathId`. e.g. "press-01".
        // So path is `/ingest/press-01`.

        // FIX: The DB stores `/press-01` (from creation), but here we were constructing `/ingest/press-01`.
        // We should just look up `/${req.params.pathId}` to match the DB.

        const lookupPath = `/${req.params.pathId}`;

        await MachineService.handleIngest(lookupPath);

        // Return 200 OK fast.
        res.status(200).json({ status: 'received' });
    } catch (error) {
        // If machine not found, 404
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

exports.stopMachine = async (req, res, next) => {
    try {
        const { machineId } = req.params; // Changed to params for cleaner REST
        await MachineService.stopMachine(machineId);
        res.json({ status: 'stopped' });
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
