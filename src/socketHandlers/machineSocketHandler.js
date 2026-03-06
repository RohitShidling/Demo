const MachineService = require('../services/machineService');
const { authenticateSocket } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Socket.IO Handler for Machine operations
 * Uses JWT authentication for all connections
 * 
 * Connection: Client must provide JWT token via:
 *   - socket.handshake.auth.token (recommended)
 *   - socket.handshake.query.token (fallback)
 * 
 * Events (Client -> Server):
 *   machine:create       - Create a new machine
 *   machine:getAll       - Get all machines
 *   machine:getDashboard - Get dashboard for a specific machine
 *   machine:getHistory   - Get history for a specific machine
 *   machine:ingest       - Ingest data (trigger production count)
 *   machine:stop         - Stop a machine run
 *   machine:subscribe    - Subscribe to a specific machine's updates
 *   machine:unsubscribe  - Unsubscribe from a specific machine's updates
 * 
 * Events (Server -> Client):
 *   machine:created      - Machine was created successfully
 *   machine:allMachines  - All machines list response
 *   machine:dashboard    - Dashboard data response
 *   machine:history      - History data response
 *   machine:ingested     - Ingest was processed successfully
 *   machine:stopped      - Machine was stopped successfully
 *   machine:update       - Real-time broadcast: machine data changed
 *   machine:error        - Error occurred
 */

module.exports = (io) => {
    // Namespace for machine operations
    const machineNamespace = io.of('/machines');

    // ──────────────────────────────────────────────
    // Apply JWT Authentication Middleware
    // ──────────────────────────────────────────────
    machineNamespace.use(authenticateSocket);

    machineNamespace.on('connection', (socket) => {
        logger.info(`[Socket.IO] Client connected: ${socket.id} (user: ${socket.user.username})`);

        // ──────────────────────────────────────────────
        // 1. CREATE MACHINE
        // Mirrors: POST /api/machines
        // Payload: { machine_name: string, ingest_path: string, machine_image?: base64string }
        // ──────────────────────────────────────────────
        socket.on('machine:create', async (data, callback) => {
            try {
                const { machine_name, ingest_path, machine_image } = data || {};

                if (!machine_name || !ingest_path) {
                    const error = { message: 'machine_name and ingest_path are required' };
                    if (typeof callback === 'function') return callback({ success: false, error });
                    return socket.emit('machine:error', error);
                }

                // Convert base64 image to Buffer if provided
                let imageBuffer = null;
                if (machine_image) {
                    imageBuffer = Buffer.from(machine_image, 'base64');
                }

                const result = await MachineService.createMachine(
                    { machine_name, ingest_path },
                    imageBuffer
                );

                const response = { success: true, data: result };

                // Acknowledge to sender
                if (typeof callback === 'function') callback(response);
                socket.emit('machine:created', response);

                // Broadcast to all clients that a new machine was added
                machineNamespace.emit('machine:update', {
                    event: 'machine_created',
                    data: result,
                    timestamp: new Date().toISOString()
                });

                logger.info(`[Socket.IO] Machine created by ${socket.user.username}: ${result.machine_id}`);
            } catch (error) {
                logger.error(`[Socket.IO] Error creating machine: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 2. GET ALL MACHINES
        // Mirrors: GET /api/machines
        // Payload: none
        // ──────────────────────────────────────────────
        socket.on('machine:getAll', async (data, callback) => {
            try {
                const machines = await MachineService.getAllMachines();
                const response = { success: true, data: machines };

                if (typeof callback === 'function') callback(response);
                socket.emit('machine:allMachines', response);

                logger.info(`[Socket.IO] All machines fetched by ${socket.user.username} (${machines.length} machines)`);
            } catch (error) {
                logger.error(`[Socket.IO] Error fetching machines: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 3. GET DASHBOARD
        // Mirrors: GET /api/machines/:machineId/dashboard
        // Payload: { machineId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:getDashboard', async (data, callback) => {
            try {
                const { machineId } = data || {};

                if (!machineId) {
                    const error = { message: 'machineId is required' };
                    if (typeof callback === 'function') return callback({ success: false, error });
                    return socket.emit('machine:error', error);
                }

                const dashboard = await MachineService.getDashboard(machineId);
                const response = { success: true, data: dashboard };

                if (typeof callback === 'function') callback(response);
                socket.emit('machine:dashboard', response);

                logger.info(`[Socket.IO] Dashboard fetched for machine: ${machineId}`);
            } catch (error) {
                logger.error(`[Socket.IO] Error fetching dashboard: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 4. GET HISTORY
        // Mirrors: GET /api/machines/:machineId/history
        // Payload: { machineId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:getHistory', async (data, callback) => {
            try {
                const { machineId } = data || {};

                if (!machineId) {
                    const error = { message: 'machineId is required' };
                    if (typeof callback === 'function') return callback({ success: false, error });
                    return socket.emit('machine:error', error);
                }

                const history = await MachineService.getHistory(machineId);
                const response = { success: true, data: history };

                if (typeof callback === 'function') callback(response);
                socket.emit('machine:history', response);

                logger.info(`[Socket.IO] History fetched for machine: ${machineId}`);
            } catch (error) {
                logger.error(`[Socket.IO] Error fetching history: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 5. INGEST DATA (Trigger production count)
        // Mirrors: POST /api/ingest/:pathId
        // Payload: { pathId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:ingest', async (data, callback) => {
            try {
                const { pathId } = data || {};

                if (!pathId) {
                    const error = { message: 'pathId is required' };
                    if (typeof callback === 'function') return callback({ success: false, error });
                    return socket.emit('machine:error', error);
                }

                const lookupPath = `/${pathId}`;
                const result = await MachineService.handleIngest(lookupPath);
                const response = { success: true, data: { status: 'received', ...result } };

                // Acknowledge to sender
                if (typeof callback === 'function') callback(response);
                socket.emit('machine:ingested', response);

                // ★ REAL-TIME BROADCAST ★
                // After ingest, fetch the latest dashboard data and broadcast to ALL clients
                try {
                    const dashboard = await MachineService.getDashboard(result.machine_id);
                    machineNamespace.emit('machine:update', {
                        event: 'ingest_received',
                        data: {
                            machine_id: result.machine_id,
                            run_id: result.run_id,
                            bucket_hour: result.bucket_hour,
                            dashboard: dashboard
                        },
                        timestamp: new Date().toISOString()
                    });
                } catch (broadcastErr) {
                    logger.error(`[Socket.IO] Broadcast error after ingest: ${broadcastErr.message}`);
                }

                logger.info(`[Socket.IO] Ingest processed by ${socket.user.username} for path: ${lookupPath}`);
            } catch (error) {
                logger.error(`[Socket.IO] Error processing ingest: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 6. STOP MACHINE
        // Mirrors: POST /api/machines/:machineId/stop
        // Payload: { machineId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:stop', async (data, callback) => {
            try {
                const { machineId } = data || {};

                if (!machineId) {
                    const error = { message: 'machineId is required' };
                    if (typeof callback === 'function') return callback({ success: false, error });
                    return socket.emit('machine:error', error);
                }

                const result = await MachineService.stopMachine(machineId);
                const response = { success: true, data: result };

                // Acknowledge to sender
                if (typeof callback === 'function') callback(response);
                socket.emit('machine:stopped', response);

                // ★ REAL-TIME BROADCAST ★
                // Broadcast machine stop event to ALL connected clients
                try {
                    const dashboard = await MachineService.getDashboard(machineId);
                    machineNamespace.emit('machine:update', {
                        event: 'machine_stopped',
                        data: {
                            machine_id: machineId,
                            ...result,
                            dashboard: dashboard
                        },
                        timestamp: new Date().toISOString()
                    });
                } catch (broadcastErr) {
                    logger.error(`[Socket.IO] Broadcast error after stop: ${broadcastErr.message}`);
                }

                logger.info(`[Socket.IO] Machine stopped by ${socket.user.username}: ${machineId}`);
            } catch (error) {
                logger.error(`[Socket.IO] Error stopping machine: ${error.message}`);
                const errResponse = { success: false, error: { message: error.message } };
                if (typeof callback === 'function') return callback(errResponse);
                socket.emit('machine:error', errResponse);
            }
        });

        // ──────────────────────────────────────────────
        // 7. JOIN MACHINE ROOM (for targeted real-time updates)
        // Payload: { machineId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:subscribe', (data) => {
            const { machineId } = data || {};
            if (machineId) {
                socket.join(`machine:${machineId}`);
                logger.info(`[Socket.IO] ${socket.user.username} subscribed to machine: ${machineId}`);
                socket.emit('machine:subscribed', { machineId, message: `Subscribed to updates for machine ${machineId}` });
            }
        });

        // ──────────────────────────────────────────────
        // 8. LEAVE MACHINE ROOM
        // Payload: { machineId: string }
        // ──────────────────────────────────────────────
        socket.on('machine:unsubscribe', (data) => {
            const { machineId } = data || {};
            if (machineId) {
                socket.leave(`machine:${machineId}`);
                logger.info(`[Socket.IO] ${socket.user.username} unsubscribed from machine: ${machineId}`);
                socket.emit('machine:unsubscribed', { machineId, message: `Unsubscribed from updates for machine ${machineId}` });
            }
        });

        // ──────────────────────────────────────────────
        // DISCONNECT
        // ──────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            logger.info(`[Socket.IO] Client disconnected: ${socket.id} (user: ${socket.user.username}), reason: ${reason}`);
        });
    });

    logger.info('[Socket.IO] Machine socket handler initialized on /machines namespace (JWT protected)');
    return machineNamespace;
};
