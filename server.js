const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/database');
const config = require('./src/config/env');
const logger = require('./src/utils/logger');

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

        // Schedule Hourly Rotation
        const cron = require('node-cron');
        const ProductionService = require('./src/services/ProductionService');

        cron.schedule('0 * * * *', () => {
            logger.info('Executing hourly log rotation job');
            ProductionService.rotateHourlyLogs();
        });

        // Start Express server
        const server = app.listen(config.port, () => {
            logger.info(`MES Backend Server started`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Port: ${config.port}`);
            logger.info(`API Prefix: ${config.api.prefix}`);
            logger.info(`Server is ready to accept requests`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

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
