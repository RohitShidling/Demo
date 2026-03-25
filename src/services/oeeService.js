const { getPool } = require('../config/database');
const MachineDowntimeModel = require('../models/MachineDowntime');
const logger = require('../utils/logger');

class OEEService {
    // GET /api/machines/:machineId/oee
    async getMachineOEE(machine_id, time_range = 'today') {
        const pool = getPool();

        // Get production data for today
        let dateFilter;
        if (time_range === 'today') {
            dateFilter = `AND DATE(pl.recorded_at) = CURDATE()`;
        } else if (time_range === 'week') {
            dateFilter = `AND pl.recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        } else if (time_range === 'month') {
            dateFilter = `AND pl.recorded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
        } else {
            dateFilter = `AND DATE(pl.recorded_at) = CURDATE()`;
        }

        // Production stats
        const [prodRows] = await pool.execute(`
            SELECT 
                COALESCE(SUM(produced_count), 0) AS total_produced,
                COALESCE(SUM(rejected_count), 0) AS total_rejected
            FROM production_logs pl
            WHERE pl.machine_id = ? ${dateFilter}
        `, [machine_id]);

        const totalProduced = prodRows[0]?.total_produced || 0;
        const totalRejected = prodRows[0]?.total_rejected || 0;
        const totalGood = totalProduced - totalRejected;

        // Downtime analysis
        const downtimeAnalysis = await MachineDowntimeModel.getAnalysis(machine_id);
        const totalDowntimeMinutes = downtimeAnalysis.total_downtime_minutes || 0;

        // Availability: (Planned Production Time - Downtime) / Planned Production Time
        const plannedProductionMinutes = 480; // 8 hours shift
        const availability = plannedProductionMinutes > 0 
            ? Math.min(100, Math.round(((plannedProductionMinutes - Math.min(totalDowntimeMinutes, plannedProductionMinutes)) / plannedProductionMinutes) * 100))
            : 100;

        // Performance: (Ideal Cycle Time × Total Count) / Operating Time
        const idealCycleTimeMinutes = 1; // 1 minute per part assumed
        const operatingTime = plannedProductionMinutes - Math.min(totalDowntimeMinutes, plannedProductionMinutes);
        const performance = operatingTime > 0 
            ? Math.min(100, Math.round(((idealCycleTimeMinutes * totalProduced) / operatingTime) * 100))
            : 0;

        // Quality: Good Count / Total Count
        const quality = totalProduced > 0 
            ? Math.round((totalGood / totalProduced) * 100) 
            : 100;

        // OEE = Availability × Performance × Quality / 10000
        const oee = Math.round((availability * performance * quality) / 10000);

        return {
            availability,
            performance,
            quality,
            oee,
            time_range
        };
    }

    // GET /api/machines/:machineId/oee/history
    async getOEEHistory(machine_id, filter = 'daily') {
        const pool = getPool();

        let groupBy, dateFormat, dateFilter;
        if (filter === 'daily') {
            groupBy = 'DATE(pl.recorded_at)';
            dateFormat = 'DATE(pl.recorded_at)';
            dateFilter = `AND pl.recorded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
        } else if (filter === 'weekly') {
            groupBy = 'YEARWEEK(pl.recorded_at)';
            dateFormat = 'MIN(DATE(pl.recorded_at))';
            dateFilter = `AND pl.recorded_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)`;
        } else {
            groupBy = 'DATE_FORMAT(pl.recorded_at, "%Y-%m")';
            dateFormat = 'DATE_FORMAT(pl.recorded_at, "%Y-%m")';
            dateFilter = `AND pl.recorded_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`;
        }

        const query = `
            SELECT 
                ${dateFormat} AS date,
                COALESCE(SUM(produced_count), 0) AS total_produced,
                COALESCE(SUM(rejected_count), 0) AS total_rejected
            FROM production_logs pl
            WHERE pl.machine_id = ? ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY date ASC
        `;

        const [rows] = await pool.execute(query, [machine_id]);

        return rows.map(row => {
            const totalProduced = row.total_produced || 0;
            const totalRejected = row.total_rejected || 0;
            const totalGood = totalProduced - totalRejected;
            const quality = totalProduced > 0 ? Math.round((totalGood / totalProduced) * 100) : 100;
            // Simplified OEE (quality-based since we don't have per-day downtime granularity)
            const oee = Math.min(100, Math.round(quality * 0.85)); // multiplied by avg availability estimate
            return { date: row.date, oee };
        });
    }
}

module.exports = new OEEService();
