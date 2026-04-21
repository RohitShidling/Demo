const MachineModel = require('../models/Machine');
const MachineRunModel = require('../models/MachineRun');
const HourlyProductionModel = require('../models/HourlyProduction');
const DailyProductionModel = require('../models/DailyProduction');
const PartRejectionModel = require('../models/PartRejection');
const MachineOperatorModel = require('../models/MachineOperator');
const MachineBreakdownModel = require('../models/MachineBreakdown');
const WorkOrderMachineModel = require('../models/WorkOrderMachine');
const ProductionLogModel = require('../models/ProductionLog');
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

        // Update work order machine production count
        try {
            const activeWO = await WorkOrderMachineModel.getActiveWorkOrderForMachine(machine.machine_id);
            if (activeWO) {
                await WorkOrderMachineModel.incrementProductionCount(activeWO.work_order_id, machine.machine_id, 1);
                await ProductionLogModel.create({
                    machine_id: machine.machine_id,
                    work_order_id: activeWO.work_order_id,
                    produced_count: 1,
                    rejected_count: 0
                });
            }
        } catch (e) { logger.error('WO production count update error:', e.message); }

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
            const activeWO = await WorkOrderMachineModel.getActiveWorkOrderForMachine(m.machine_id);

            return {
                machine_id: m.machine_id, machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                ingest_path: m.ingest_path,
                status: m.status || (activeRun ? 'RUNNING' : 'NOT_STARTED'),
                total_rejected: totalRejected,
                active_work_order: activeWO ? activeWO.work_order_id : null,
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
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        const activeRun = await MachineRunModel.findActiveRun(machine_id);
        const lastRun = activeRun || await MachineRunModel.findLastRun(machine_id);
        const totalRejected = await PartRejectionModel.getTotalRejectedByMachine(machine_id);
        const operators = await MachineOperatorModel.findByMachine(machine_id);
        const breakdowns = await MachineBreakdownModel.findByMachine(machine_id);

        // Fetch active work order context
        const activeWO = await WorkOrderMachineModel.getActiveWorkOrderForMachine(machine_id);
        let workOrderInfo = null;
        let productionTarget = 0;
        let totalProduced = 0;
        let rejectedCount = 0;
        let acceptedCount = 0;
        let progressPercentage = 0;

        if (activeWO) {
            const WorkOrderModel = require('../models/WorkOrder');
            const wo = await WorkOrderModel.findById(activeWO.work_order_id);
            if (wo) {
                // Get machine-specific counts from work_order_machines
                const womData = await WorkOrderMachineModel.getMachineProductionCount(machine_id);
                productionTarget = wo.target || 0;
                totalProduced = womData ? (womData.total_production_count || 0) : 0;
                rejectedCount = womData ? (womData.total_rejected_count || 0) : 0;
                acceptedCount = Math.max(0, totalProduced - rejectedCount);
                progressPercentage = productionTarget > 0
                    ? Math.min(100, Math.round((totalProduced / productionTarget) * 100))
                    : 0;

                workOrderInfo = {
                    work_order_id: wo.work_order_id,
                    work_order_name: wo.work_order_name,
                    start_date: activeWO.assigned_at,
                    targeted_end_date: wo.targeted_end_date,
                    stage_order: activeWO.stage_order,
                    status: wo.status
                };
            }
        }

        // Build current_run with computed accepted = total - rejected
        const runTotal = lastRun ? (lastRun.total_count || 0) : 0;
        const runRejected = lastRun ? (lastRun.rejected_count || 0) : 0;
        const runAccepted = Math.max(0, runTotal - runRejected);

        return {
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            machine_image: machine.machine_image ? machine.machine_image.toString('base64') : null,
            ingest_path: machine.ingest_path,
            status: machine.status || 'NOT_STARTED',
            work_order: workOrderInfo,
            production_target: productionTarget,
            progress_percentage: progressPercentage,
            last_start: lastRun ? lastRun.start_time : null,
            last_part_produced_at: lastRun ? lastRun.last_activity_time : null,
            total_rejected_all_time: totalRejected,
            operators,
            breakdowns,
            current_run: lastRun ? {
                run_id: lastRun.run_id,
                start_time: lastRun.start_time,
                end_time: lastRun.end_time,
                total_count: runTotal,
                accepted_count: runAccepted,
                rejected_count: runRejected,
                last_activity_time: lastRun.last_activity_time,
                status: lastRun.status
            } : null
        };
    }

    // All machines production count (machine_name + count)
    async getAllMachinesProductionCount() {
        return await WorkOrderMachineModel.getAllMachinesProductionCount();
    }

    // Machine-specific production count
    async getMachineProductionCount(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        const data = await WorkOrderMachineModel.getMachineProductionCount(machine_id);
        return data || { machine_id, machine_name: machine.machine_name, total_production_count: 0, total_rejected_count: 0, total_accepted_count: 0 };
    }

    // All machines rejection count (machine_name + count)
    async getAllMachinesRejectionCount() {
        return await WorkOrderMachineModel.getAllMachinesRejectionCount();
    }

    // Machine-specific rejection count
    async getMachineRejectionCount(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }
        const total = await PartRejectionModel.getTotalRejectedByMachine(machine_id);
        return { machine_id, machine_name: machine.machine_name, total_rejected_count: total };
    }

    async getMachineVisualization(machine_id, { filter, start_date, end_date, date }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        let data = {};

        // Hourly: grouped by 1-hour buckets (for a specific date or latest)
        if (filter === 'hourly' || !filter) {
            const rawHourly = await HourlyProductionModel.getHistory(machine_id);
            // Filter by date if provided
            const targetDate = date || (start_date ? start_date : null);
            const filtered = targetDate
                ? rawHourly.filter(h => {
                    const d = new Date(h.hour_start_time).toISOString().split('T')[0];
                    return d === targetDate;
                })
                : rawHourly;

            data.hourly = filtered.map(h => ({
                hour_label: new Date(h.hour_start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                hour_start: h.hour_start_time,
                hour_end: h.hour_end_time,
                production_count: h.product_count || 0,
                accepted_count: h.accepted_count || 0,
                rejected_count: h.rejected_count || 0,
                run_id: h.run_id
            }));
        }

        // Daily: date as label, bar graph per day
        if (filter === 'daily' || !filter) {
            let dailyRows;
            if (start_date && end_date) {
                dailyRows = await DailyProductionModel.getByMachineAndDateRange(machine_id, start_date, end_date);
            } else {
                dailyRows = await DailyProductionModel.getByMachine(machine_id);
            }
            data.daily = dailyRows.map(d => ({
                date: d.production_date,
                day: new Date(d.production_date).getDate(),
                production_count: d.total_count || 0,
                accepted_count: d.accepted_count || 0,
                rejected_count: d.rejected_count || 0
            }));
        }

        // Calendar navigation support
        if (filter === 'calendar' || filter === 'date') {
            let calRows;
            if (start_date && end_date) {
                calRows = await DailyProductionModel.getByMachineAndDateRange(machine_id, start_date, end_date);
            } else {
                calRows = await DailyProductionModel.getByMachine(machine_id);
            }
            data.calendar = calRows.map(d => ({
                date: d.production_date,
                day: new Date(d.production_date).getDate(),
                production_count: d.total_count || 0,
                accepted_count: d.accepted_count || 0,
                rejected_count: d.rejected_count || 0
            }));
        }

        return { machine_id, machine_name: machine.machine_name, filter: filter || 'all', visualization: data };
    }

    // ─── Hourly Production (last 24 hours, bar per hour) ───────────────────────
    async getHourlyProduction(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const pool = require('../config/database').getPool();

        // Build 24 slots: from 24 hours ago rounded to the hour, up to current hour
        const now = new Date();
        const slotStart = new Date(now);
        slotStart.setMinutes(0, 0, 0);
        slotStart.setHours(slotStart.getHours() - 23); // 24 slots: -23h to now

        const slotEnd = new Date(now);
        slotEnd.setMinutes(59, 59, 999);

        const [rows] = await pool.execute(
            `SELECT hour_start_time, hour_end_time, product_count, accepted_count, rejected_count
             FROM hourly_production
             WHERE machine_id = ?
               AND hour_start_time >= ?
               AND hour_start_time <= ?
             ORDER BY hour_start_time ASC`,
            [machine_id, slotStart, slotEnd]
        );

        // Build a map keyed by ISO hour for fast lookup
        const rowMap = {};
        for (const r of rows) {
            const key = new Date(r.hour_start_time).toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
            const total = r.product_count || 0;
            const rejected = r.rejected_count || 0;
            const accepted = r.accepted_count != null ? r.accepted_count : Math.max(0, total - rejected);
            rowMap[key] = { total, accepted, rejected };
        }

        // Produce exactly 24 slots
        const slots = [];
        for (let i = 0; i < 24; i++) {
            const slotDate = new Date(slotStart);
            slotDate.setHours(slotStart.getHours() + i);
            const key = slotDate.toISOString().slice(0, 13);
            const data = rowMap[key] || { total: 0, accepted: 0, rejected: 0 };
            const slotEndDate = new Date(slotDate);
            slotEndDate.setHours(slotEndDate.getHours() + 1);
            slots.push({
                hour_label: slotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                hour_start: slotDate.toISOString(),
                hour_end: slotEndDate.toISOString(),
                total_count: data.total,
                accepted_count: data.accepted,
                rejected_count: data.rejected
            });
        }

        return {
            machine_id,
            machine_name: machine.machine_name,
            period: 'last_24_hours',
            slots
        };
    }

    // ─── Daily Production (last 31 days, bar per day) ──────────────────────────
    async getDailyProduction(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const pool = require('../config/database').getPool();

        // Last 31 days, today inclusive
        const today = new Date();
        const startDay = new Date(today);
        startDay.setDate(today.getDate() - 30); // 31 days total

        const todayStr = today.toISOString().split('T')[0];
        const startDayStr = startDay.toISOString().split('T')[0];

        const [rows] = await pool.execute(
            `SELECT production_date, total_count, accepted_count, rejected_count
             FROM daily_production
             WHERE machine_id = ?
               AND production_date BETWEEN ? AND ?
             ORDER BY production_date ASC`,
            [machine_id, startDayStr, todayStr]
        );

        // Map keyed by date string
        const rowMap = {};
        for (const r of rows) {
            const dateKey = (r.production_date instanceof Date)
                ? r.production_date.toISOString().split('T')[0]
                : String(r.production_date).split('T')[0];
            const total = r.total_count || 0;
            const rejected = r.rejected_count || 0;
            const accepted = r.accepted_count != null ? r.accepted_count : Math.max(0, total - rejected);
            rowMap[dateKey] = { total, accepted, rejected };
        }

        // Build exactly 31 day slots
        const days = [];
        for (let i = 0; i < 31; i++) {
            const d = new Date(startDay);
            d.setDate(startDay.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const data = rowMap[dateStr] || { total: 0, accepted: 0, rejected: 0 };
            days.push({
                date: dateStr,
                day: d.getDate(),
                month: d.getMonth() + 1,
                year: d.getFullYear(),
                day_label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                total_count: data.total,
                accepted_count: data.accepted,
                rejected_count: data.rejected
            });
        }

        return {
            machine_id,
            machine_name: machine.machine_name,
            period: 'last_31_days',
            start_date: startDayStr,
            end_date: todayStr,
            days
        };
    }

    // ─── Custom Date-Range Production (day-by-day bars) ────────────────────────
    async getCustomProduction(machine_id, start_date, end_date) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        // Validate dates
        if (!start_date || !end_date) {
            const e = new Error('start_date and end_date are required (YYYY-MM-DD)');
            e.statusCode = 400; throw e;
        }
        const startObj = new Date(start_date);
        const endObj = new Date(end_date);
        if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
            const e = new Error('start_date and end_date must be valid dates in YYYY-MM-DD format');
            e.statusCode = 400; throw e;
        }
        if (startObj > endObj) {
            const e = new Error('start_date must not be after end_date');
            e.statusCode = 400; throw e;
        }

        const pool = require('../config/database').getPool();
        const [rows] = await pool.execute(
            `SELECT production_date, total_count, accepted_count, rejected_count
             FROM daily_production
             WHERE machine_id = ?
               AND production_date BETWEEN ? AND ?
             ORDER BY production_date ASC`,
            [machine_id, start_date, end_date]
        );

        // Map keyed by date string for exact-date matching (no data mixing)
        const rowMap = {};
        for (const r of rows) {
            const dateKey = (r.production_date instanceof Date)
                ? r.production_date.toISOString().split('T')[0]
                : String(r.production_date).split('T')[0];
            const total = r.total_count || 0;
            const rejected = r.rejected_count || 0;
            const accepted = r.accepted_count != null ? r.accepted_count : Math.max(0, total - rejected);
            rowMap[dateKey] = { total, accepted, rejected };
        }

        // Enumerate every day in the range
        const days = [];
        const cursor = new Date(startObj);
        while (cursor <= endObj) {
            const dateStr = cursor.toISOString().split('T')[0];
            const data = rowMap[dateStr] || { total: 0, accepted: 0, rejected: 0 };
            days.push({
                date: dateStr,
                day: cursor.getDate(),
                month: cursor.getMonth() + 1,
                year: cursor.getFullYear(),
                day_label: cursor.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                total_count: data.total,
                accepted_count: data.accepted,
                rejected_count: data.rejected
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        return {
            machine_id,
            machine_name: machine.machine_name,
            period: 'custom',
            start_date,
            end_date,
            total_days: days.length,
            days
        };
    }
}

module.exports = new MachineService();
