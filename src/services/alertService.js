const MachineModel = require('../models/Machine');
const MachineBreakdownModel = require('../models/MachineBreakdown');
const logger = require('../utils/logger');

class AlertService {
    async getAlerts() {
        const alertMachines = await MachineModel.findAlertMachines();
        const activeBreakdowns = await MachineBreakdownModel.findActive();

        return {
            stopped_and_maintenance_machines: alertMachines.map(m => ({
                machine_id: m.machine_id,
                machine_name: m.machine_name,
                machine_image: m.machine_image ? m.machine_image.toString('base64') : null,
                status: m.status,
                latest_breakdown_reason: m.latest_breakdown_reason,
                breakdown_severity: m.breakdown_severity,
                breakdown_reported_at: m.breakdown_reported_at,
                updated_at: m.updated_at
            })),
            active_breakdowns: activeBreakdowns,
            total_alerts: alertMachines.length + activeBreakdowns.length
        };
    }
}

module.exports = new AlertService();
