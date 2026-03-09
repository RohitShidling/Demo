const MachineService = require('../services/machineService');
const OperatorService = require('../services/operatorService');
const AlertService = require('../services/alertService');
const WorkOrderService = require('../services/workOrderService');
const WorkflowService = require('../services/workflowService');
const { authenticateSocket } = require('../middleware/auth');
const logger = require('../utils/logger');

module.exports = (io) => {
    const ns = io.of('/machines');
    ns.use(authenticateSocket);

    ns.on('connection', (socket) => {
        logger.info(`[Socket.IO] Connected: ${socket.id} (${socket.user.username}, ${socket.user.userType || socket.user.role})`);

        // ── MACHINE OPERATIONS ──
        socket.on('machine:getAll', async (data, cb) => {
            try {
                const machines = await MachineService.getAllMachines();
                const res = { success: true, data: machines };
                if (typeof cb === 'function') cb(res);
                socket.emit('machine:allMachines', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:getDashboard', async (data, cb) => {
            try {
                const { machineId } = data || {};
                if (!machineId) return emitError(socket, cb, { message: 'machineId required' });
                const dashboard = await MachineService.getDashboard(machineId);
                const res = { success: true, data: dashboard };
                if (typeof cb === 'function') cb(res);
                socket.emit('machine:dashboard', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:getDetails', async (data, cb) => {
            try {
                const { machineId } = data || {};
                if (!machineId) return emitError(socket, cb, { message: 'machineId required' });
                const details = await MachineService.getMachineDetails(machineId);
                const res = { success: true, data: details };
                if (typeof cb === 'function') cb(res);
                socket.emit('machine:details', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:getVisualization', async (data, cb) => {
            try {
                const { machineId, filter, start_date, end_date } = data || {};
                if (!machineId) return emitError(socket, cb, { message: 'machineId required' });
                const viz = await MachineService.getMachineVisualization(machineId, { filter, start_date, end_date });
                const res = { success: true, data: viz };
                if (typeof cb === 'function') cb(res);
                socket.emit('machine:visualization', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:getHistory', async (data, cb) => {
            try {
                const { machineId } = data || {};
                if (!machineId) return emitError(socket, cb, { message: 'machineId required' });
                const history = await MachineService.getHistory(machineId);
                const res = { success: true, data: history };
                if (typeof cb === 'function') cb(res);
                socket.emit('machine:history', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:create', async (data, cb) => {
            try {
                if (socket.user.role !== 'admin') return emitError(socket, cb, { message: 'Access denied' });
                const { machine_name, ingest_path, machine_image } = data || {};
                if (!machine_name || !ingest_path) return emitError(socket, cb, { message: 'machine_name and ingest_path required' });
                let imageBuffer = machine_image ? Buffer.from(machine_image, 'base64') : null;
                const result = await MachineService.createMachine({ machine_name, ingest_path }, imageBuffer);
                const res = { success: true, data: result };
                if (typeof cb === 'function') cb(res);
                ns.emit('machine:update', { event: 'machine_created', data: result, timestamp: new Date().toISOString() });
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:ingest', async (data, cb) => {
            try {
                const { pathId } = data || {};
                if (!pathId) return emitError(socket, cb, { message: 'pathId required' });
                const result = await MachineService.handleIngest(`/${pathId}`);
                const res = { success: true, data: { status: 'received', ...result } };
                if (typeof cb === 'function') cb(res);
                try {
                    const dashboard = await MachineService.getDashboard(result.machine_id);
                    ns.emit('machine:update', { event: 'ingest_received', data: { ...result, dashboard }, timestamp: new Date().toISOString() });
                } catch (e) { logger.error(`Broadcast error: ${e.message}`); }
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('machine:stop', async (data, cb) => {
            try {
                const { machineId } = data || {};
                if (!machineId) return emitError(socket, cb, { message: 'machineId required' });
                const result = await MachineService.stopMachine(machineId);
                if (typeof cb === 'function') cb({ success: true, data: result });
                const dashboard = await MachineService.getDashboard(machineId);
                ns.emit('machine:update', { event: 'machine_stopped', data: { machine_id: machineId, ...result, dashboard }, timestamp: new Date().toISOString() });
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── OPERATOR: Machine Status Update ──
        socket.on('operator:updateStatus', async (data, cb) => {
            try {
                const { machine_id, status } = data || {};
                if (!machine_id || !status) return emitError(socket, cb, { message: 'machine_id and status required' });
                const result = await OperatorService.updateMachineStatus(machine_id, status);
                if (typeof cb === 'function') cb({ success: true, data: result });
                ns.emit('machine:status_changed', { machine_id, status, changed_by: socket.user.username, timestamp: new Date().toISOString() });
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── OPERATOR: Report Rejection ──
        socket.on('operator:reportRejection', async (data, cb) => {
            try {
                const { machine_id, work_order_id, rejection_reason, part_image, rejected_count } = data || {};
                if (!machine_id || !rejection_reason) return emitError(socket, cb, { message: 'machine_id and rejection_reason required' });
                const imgBuf = part_image ? Buffer.from(part_image, 'base64') : null;
                const result = await OperatorService.reportRejection({
                    machine_id, work_order_id, operator_id: socket.user.id,
                    rejection_reason, part_image: imgBuf, rejected_count: rejected_count || 1
                });
                if (typeof cb === 'function') cb({ success: true, data: result });
                ns.emit('rejection:reported', { machine_id, work_order_id, operator: socket.user.username, timestamp: new Date().toISOString() });
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── OPERATOR: Report Breakdown ──
        socket.on('operator:reportBreakdown', async (data, cb) => {
            try {
                const { machine_id, problem_description, severity } = data || {};
                if (!machine_id || !problem_description) return emitError(socket, cb, { message: 'machine_id and problem_description required' });
                const result = await OperatorService.reportBreakdown({ machine_id, operator_id: socket.user.id, problem_description, severity });
                if (typeof cb === 'function') cb({ success: true, data: result });
                ns.emit('breakdown:reported', { data: result, timestamp: new Date().toISOString() });
                // Also emit alert update
                const alerts = await AlertService.getAlerts();
                ns.emit('alerts:updated', { data: alerts, timestamp: new Date().toISOString() });
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── ALERTS ──
        socket.on('alerts:get', async (data, cb) => {
            try {
                const alerts = await AlertService.getAlerts();
                const res = { success: true, data: alerts };
                if (typeof cb === 'function') cb(res);
                socket.emit('alerts:data', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── WORK ORDERS ──
        socket.on('workorder:getAll', async (data, cb) => {
            try {
                const orders = await WorkOrderService.getAllWorkOrders();
                const res = { success: true, data: orders };
                if (typeof cb === 'function') cb(res);
                socket.emit('workorder:allOrders', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        socket.on('workorder:getMachines', async (data, cb) => {
            try {
                const { workOrderId } = data || {};
                if (!workOrderId) return emitError(socket, cb, { message: 'workOrderId required' });
                const result = await WorkOrderService.getWorkOrderMachines(workOrderId);
                const res = { success: true, data: result };
                if (typeof cb === 'function') cb(res);
                socket.emit('workorder:machines', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── WORKFLOW ──
        socket.on('workflow:get', async (data, cb) => {
            try {
                const { workOrderId } = data || {};
                if (!workOrderId) return emitError(socket, cb, { message: 'workOrderId required' });
                const result = await WorkflowService.getWorkflow(workOrderId);
                const res = { success: true, data: result };
                if (typeof cb === 'function') cb(res);
                socket.emit('workflow:data', res);
            } catch (e) { emitError(socket, cb, e); }
        });

        // ── ROOM SUBSCRIPTIONS ──
        socket.on('machine:subscribe', (data) => {
            const { machineId } = data || {};
            if (machineId) {
                socket.join(`machine:${machineId}`);
                socket.emit('machine:subscribed', { machineId });
            }
        });

        socket.on('machine:unsubscribe', (data) => {
            const { machineId } = data || {};
            if (machineId) {
                socket.leave(`machine:${machineId}`);
                socket.emit('machine:unsubscribed', { machineId });
            }
        });

        socket.on('disconnect', (reason) => {
            logger.info(`[Socket.IO] Disconnected: ${socket.id} (${socket.user.username}), reason: ${reason}`);
        });
    });

    logger.info('[Socket.IO] MES socket handler initialized on /machines namespace');
    return ns;
};

function emitError(socket, cb, error) {
    const errRes = { success: false, error: { message: error.message || 'Unknown error' } };
    if (typeof cb === 'function') return cb(errRes);
    socket.emit('machine:error', errRes);
}
