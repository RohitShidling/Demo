const MachineModel = require('../models/Machine');
const MachineRunModel = require('../models/MachineRun');
const HourlyProductionModel = require('../models/HourlyProduction');
const logger = require('../utils/logger');
const crypto = require('crypto');

class MachineService {
    async createMachine({ machine_name, ingest_path }, imageBuffer) {
        // Generate unique ID (Format: MACH-XXXX)
        const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const machine_id = `MACH-${randomId}`;

        // Ensure path starts with slash
        const normalizedPath = ingest_path.startsWith('/') ? ingest_path : `/${ingest_path}`;

        await MachineModel.create({
            machine_id,
            machine_name,
            machine_image: imageBuffer,
            ingest_path: normalizedPath
        });

        logger.info(`Machine created: ${machine_id} with path ${normalizedPath}`);
        return { machine_id, machine_name, ingest_path: normalizedPath };
    }

    async handleIngest(pathStr) {
        // Find machine by path
        const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
        const machine = await MachineModel.findByIngestPath(normalizedPath);

        if (!machine) {
            throw new Error(`Machine not found for path: ${normalizedPath}`);
        }

        const now = new Date();

        // Check for active run
        let run = await MachineRunModel.findActiveRun(machine.machine_id);
        let isNewRun = false;

        if (!run) {
            // First hit creates a run -> Status RUNNING
            logger.info(`Starting new run for ${machine.machine_id}`);
            const runId = await MachineRunModel.create({
                machine_id: machine.machine_id,
                start_time: now
            });
            run = { run_id: runId, start_time: now }; // Minimal obj
            isNewRun = true;
        }

        // Increment total run count
        await MachineRunModel.incrementTotalCount(run.run_id, now);

        // Handle Hourly Bucket
        const bucket = await HourlyProductionModel.getOrCreateBucket(machine.machine_id, run.run_id, now);
        await HourlyProductionModel.incrementCount(bucket.id);

        return {
            status: 'success',
            machine_id: machine.machine_id,
            run_id: run.run_id,
            bucket_hour: bucket.hour_start_time
        };
    }

    async stopMachine(machine_id) {
        const run = await MachineRunModel.findActiveRun(machine_id);
        if (!run) {
            throw new Error('No active run found for machine');
        }

        await MachineRunModel.stopRun(run.run_id, new Date());
        logger.info(`Run ${run.run_id} stopped for machine ${machine_id}`);
        return { status: 'stopped', run_id: run.run_id };
    }

    async getDashboard(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) throw new Error('Machine not found');

        const activeRun = await MachineRunModel.findActiveRun(machine_id);

        return {
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            machine_image: machine.machine_image ? machine.machine_image.toString('base64') : null,
            status: activeRun ? 'RUNNING' : 'STOPPED',
            current_run: activeRun ? {
                start_time: activeRun.start_time,
                total_count: activeRun.total_count,
                last_activity: activeRun.last_activity_time
            } : null
        };
    }

    async getHistory(machine_id) {
        const history = await HourlyProductionModel.getHistory(machine_id);
        return history.map(h => ({
            hour_start: h.hour_start_time,
            hour_end: h.hour_end_time,
            count: h.product_count,
            run_id: h.run_id
        }));
    }

    async getAllMachines() {
        // Get all machines
        const machines = await MachineModel.findAll();

        // Enrich with current status (N+1 query is okay for small number of machines, 
        // but for production maybe do a JOIN later. Keeping it simple as requested.)
        const result = await Promise.all(machines.map(async (m) => {
            const activeRun = await MachineRunModel.findActiveRun(m.machine_id);
            return {
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                ingest_path: m.ingest_path,
                // Status info
                status: activeRun ? 'RUNNING' : 'STOPPED',
                current_run: activeRun ? {
                    start_time: activeRun.start_time,
                    total_count: activeRun.total_count,
                    last_activity: activeRun.last_activity_time
                } : null
            };
        }));

        return result;
    }
}

module.exports = new MachineService();
