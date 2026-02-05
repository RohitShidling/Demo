const ProductionLog = require('../models/ProductionLog');
const logger = require('../utils/logger');

class ProductionService {
    async startMachine({ machine_id, machine_name, start_time }, imageBuffer) {
        const active = await ProductionLog.getActiveLog(machine_id);
        if (active) {
            await ProductionLog.updateEndTime(active.id, new Date());
        }

        const logId = await ProductionLog.create({
            machine_id,
            machine_name,
            machine_image: imageBuffer,
            start_time: start_time || new Date()
        });

        logger.info(`Machine ${machine_id} started. Log ID: ${logId}`);
        return { id: logId, status: 'started' };
    }

    async updateProduction(machine_id, count) {
        const active = await ProductionLog.getActiveLog(machine_id);
        if (!active) {
            throw new Error('Machine is not running');
        }
        await ProductionLog.updateCount(active.id, count);
        return { id: active.id, count, status: 'updated' };
    }

    async stopMachine(machine_id, end_time) {
        const active = await ProductionLog.getActiveLog(machine_id);
        if (!active) {
            throw new Error('Machine is not running');
        }

        await ProductionLog.updateEndTime(active.id, end_time || new Date());
        logger.info(`Machine ${machine_id} stopped. Log ID: ${active.id}`);
        return { id: active.id, status: 'stopped' };
    }

    formatLogData(log) {
        return {
            machine_id: log.machine_id,
            machine_name: log.machine_name,
            machine_image: log.machine_image ? log.machine_image.toString('base64') : null,
            start_time: log.start_time,
            count: log.production_count,
            end_time: log.end_time,
            createdAt: log.created_at,
            updatedAt: log.updated_at || log.created_at
        };
    }

    async getRealTimeData(machine_id) {
        const active = await ProductionLog.getActiveLog(machine_id);
        if (!active) return null;
        return this.formatLogData(active);
    }

    async getMachineHistory(machine_id) {
        const logs = await ProductionLog.getByMachineId(machine_id);
        return logs.map(log => this.formatLogData(log));
    }

    async rotateHourlyLogs() {
        logger.info('Running hourly log rotation...');
        try {
            const activeLogs = await ProductionLog.getAllActive();
            const now = new Date();

            for (const log of activeLogs) {
                try {
                    await ProductionLog.closeLogAndCreateNew(log.id, now, {
                        machine_id: log.machine_id,
                        machine_name: log.machine_name,
                        machine_image: log.machine_image,
                        start_time: now
                    });
                    logger.info(`Rotated log for machine ${log.machine_id}`);
                } catch (err) {
                    logger.error(`Failed to rotate log for machine ${log.machine_id}:`, err);
                }
            }
        } catch (error) {
            logger.error('Error in rotateHourlyLogs:', error);
        }
    }
}

module.exports = new ProductionService();
