const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/database');
const config = require('./src/config/env');
const logger = require('./src/utils/logger');
const machineSocketHandler = require('./src/socketHandlers/machineSocketHandler');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        // Connect to MySQL
        await connectDB();

        // Create HTTP server from Express app
        const server = http.createServer(app);

        // ──────────────────────────────────────────────
        // Initialize Socket.IO
        // ──────────────────────────────────────────────
        const io = new Server(server, {
            cors: {
                origin: '*',          // Allow all origins (match Express CORS config)
                methods: ['GET', 'POST'],
                credentials: true
            },
            // Transport configuration
            transports: ['websocket', 'polling'],
            // Ping/pong settings (keep connections alive)
            pingTimeout: 60000,
            pingInterval: 25000
        });

        // Register socket handlers
        machineSocketHandler(io);

        // Make io accessible in Express app (for REST endpoints to emit events if needed)
        app.set('io', io);

        // Log active connections count periodically
        setInterval(() => {
            io.of('/machines').fetchSockets().then(sockets => {
                logger.debug(`[Socket.IO] Active connections on /machines: ${sockets.length}`);
            });
        }, 60000); // Every minute

        // ──────────────────────────────────────────────
        // Start listening
        // ──────────────────────────────────────────────
        server.listen(config.port, '0.0.0.0', () => {
            logger.info(`MES Backend Server started`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`HTTP API:    http://0.0.0.0:${config.port}`);
            logger.info(`Socket.IO:   ws://0.0.0.0:${config.port}/machines`);
            logger.info(`API Prefix:  ${config.api.prefix}`);
            logger.info(`Server is ready to accept HTTP and WebSocket requests`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            // Close all socket connections
            io.of('/machines').disconnectSockets(true);
            logger.info('All Socket.IO connections closed');

            server.close(async () => {
                logger.info('HTTP server closed');

                await disconnectDB();

                logger.info('Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
