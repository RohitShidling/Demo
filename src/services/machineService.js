const MachineModel = require('../models/Machine');
const MachineRunModel = require('../models/MachineRun');
const HourlyProductionModel = require('../models/HourlyProduction');
const DailyProductionModel = require('../models/DailyProduction');
const PartRejectionModel = require('../models/PartRejection');
const MachineOperatorModel = require('../models/MachineOperator');
const MachineBreakdownModel = require('../models/MachineBreakdown');
const logger = require('../utils/logger');
const crypto = require('crypto');

class MachineService {
    async createMachine({ machine_name, ingest_path }, imageBuffer) {
        const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const machine_id = `MACH-${randomId}`;
        const normalizedPath = ingest_path.startsWith('/') ? ingest_path : `/${ingest_path}`;
        await MachineModel.create({ machine_id, machine_name, machine_image: imageBuffer, ingest_path: normalizedPath });
        logger.info(`Machine created: ${machine_id} with path ${normalizedPath}`);
        return { machine_id, machine_name, ingest_path: normalizedPath };
    }

    async handleIngest(pathStr) {
        const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
        const machine = await MachineModel.findByIngestPath(normalizedPath);
        if (!machine) throw new Error(`Machine not found for path: ${normalizedPath}`);

        const now = new Date();
        let run = await MachineRunModel.findActiveRun(machine.machine_id);
        if (!run) {
            logger.info(`Starting new run for ${machine.machine_id}`);
            const runId = await MachineRunModel.create({ machine_id: machine.machine_id, start_time: now });
            run = { run_id: runId, start_time: now };
            // Auto-set machine status to RUNNING
            await MachineModel.updateStatus(machine.machine_id, 'RUNNING');
        }
        await MachineRunModel.incrementTotalCount(run.run_id, now);
        const bucket = await HourlyProductionModel.getOrCreateBucket(machine.machine_id, run.run_id, now);
        await HourlyProductionModel.incrementCount(bucket.id);

        // Update daily production
        try {
            const today = now.toISOString().split('T')[0];
            await DailyProductionModel.getOrCreate(machine.machine_id, today);
            await DailyProductionModel.incrementCount(machine.machine_id, today);
        } catch (e) { logger.error('Daily production update error:', e.message); }

        return { status: 'success', machine_id: machine.machine_id, run_id: run.run_id, bucket_hour: bucket.hour_start_time };
    }

    async stopMachine(machine_id) {
        const run = await MachineRunModel.findActiveRun(machine_id);
        if (!run) throw new Error('No active run found for machine');
        await MachineRunModel.stopRun(run.run_id, new Date());
        await MachineModel.updateStatus(machine_id, 'NOT_STARTED');
        logger.info(`Run ${run.run_id} stopped for machine ${machine_id}`);
        return { status: 'stopped', run_id: run.run_id };
    }

    async getDashboard(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) throw new Error('Machine not found');
        const activeRun = await MachineRunModel.findActiveRun(machine_id);
        const totalRejected = await PartRejectionModel.getTotalRejectedByMachine(machine_id);

        return {
            machine_id: machine.machine_id, machine_name: machine.machine_name,
            machine_image: machine.machine_image ? machine.machine_image.toString('base64') : null,
            ingest_path: machine.ingest_path,
            status: machine.status || (activeRun ? 'RUNNING' : 'NOT_STARTED'),
            total_rejected: totalRejected,
            current_run: activeRun ? {
                start_time: activeRun.start_time, total_count: activeRun.total_count,
                accepted_count: activeRun.accepted_count || 0, rejected_count: activeRun.rejected_count || 0,
                last_activity: activeRun.last_activity_time
            } : null
        };
    }

    async getHistory(machine_id) {
        const history = await HourlyProductionModel.getHistory(machine_id);
        return history.map(h => ({
            hour_start: h.hour_start_time, hour_end: h.hour_end_time,
            count: h.product_count, accepted: h.accepted_count || 0,
            rejected: h.rejected_count || 0, run_id: h.run_id
        }));
    }

    async getAllMachines() {
        const machines = await MachineModel.findAll();
        const result = await Promise.all(machines.map(async (m) => {
            const activeRun = await MachineRunModel.findActiveRun(m.machine_id);
            let lastRun = activeRun || await MachineRunModel.findLastRun(m.machine_id);
            const totalRejected = await PartRejectionModel.getTotalRejectedByMachine(m.machine_id);

            return {
                machine_id: m.machine_id, machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                ingest_path: m.ingest_path,
                status: m.status || (activeRun ? 'RUNNING' : 'NOT_STARTED'),
                total_rejected: totalRejected,
                current_run: lastRun ? {
                    start_time: lastRun.start_time, total_count: lastRun.total_count,
                    accepted_count: lastRun.accepted_count || 0, rejected_count: lastRun.rejected_count || 0,
                    end_time: lastRun.end_time, last_activity_time: lastRun.last_activity_time
                } : null
            };
        }));
        return result;
    }

    async getMachineDetails(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) throw new Error('Machine not found');
        const activeRun = await MachineRunModel.findActiveRun(machine_id);
        const lastRun = activeRun || await MachineRunModel.findLastRun(machine_id);
        const totalRejected = await PartRejectionModel.getTotalRejectedByMachine(machine_id);
        const operators = await MachineOperatorModel.findByMachine(machine_id);
        const breakdowns = await MachineBreakdownModel.findByMachine(machine_id);

        return {
            machine_id: machine.machine_id, machine_name: machine.machine_name,
            machine_image: machine.machine_image ? machine.machine_image.toString('base64') : null,
            ingest_path: machine.ingest_path,
            status: machine.status || 'NOT_STARTED',
            total_rejected: totalRejected, operators, breakdowns,
            current_run: lastRun ? {
                run_id: lastRun.run_id, start_time: lastRun.start_time,
                end_time: lastRun.end_time, total_count: lastRun.total_count,
                accepted_count: lastRun.accepted_count || 0, rejected_count: lastRun.rejected_count || 0,
                last_activity_time: lastRun.last_activity_time, status: lastRun.status
            } : null
        };
    }

    async getMachineVisualization(machine_id, { filter, start_date, end_date }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) throw new Error('Machine not found');

        let data = {};
        if (filter === 'hourly' || !filter) {
            data.hourly = await HourlyProductionModel.getHistory(machine_id);
        }
        if (filter === 'daily' || !filter) {
            if (start_date && end_date) {
                data.daily = await DailyProductionModel.getByMachineAndDateRange(machine_id, start_date, end_date);
            } else {
                data.daily = await DailyProductionModel.getByMachine(machine_id);
            }
        }
        if (filter === 'calendar' || filter === 'date') {
            if (start_date && end_date) {
                data.calendar = await DailyProductionModel.getByMachineAndDateRange(machine_id, start_date, end_date);
            } else {
                data.calendar = await DailyProductionModel.getByMachine(machine_id);
            }
        }
        return { machine_id, machine_name: machine.machine_name, visualization: data };
    }
}

module.exports = new MachineService();
