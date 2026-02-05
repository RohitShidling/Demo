const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            port: config.mysql.port
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\`;`);
        await connection.end();

        pool = mysql.createPool({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            database: config.mysql.database,
            port: config.mysql.port,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        await initTables();

        logger.info(`MySQL Connected: ${config.mysql.host}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const initTables = async () => {
    try {
        // Table 1: Machines (Configuration)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machines (
                machine_id VARCHAR(50) PRIMARY KEY,
                machine_name VARCHAR(100) NOT NULL,
                machine_image LONGBLOB,
                ingest_path VARCHAR(100) UNIQUE NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
            )
        `);

        // Table 2: Machine Runs (Sessions)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_runs (
                run_id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                start_time DATETIME(3) NOT NULL,
                end_time DATETIME(3),
                status ENUM('RUNNING', 'STOPPED') DEFAULT 'RUNNING',
                total_count INT DEFAULT 0,
                last_activity_time DATETIME(3),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id)
            )
        `);

        // Table 3: Hourly Production (Buckets)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hourly_production (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                run_id INT NOT NULL,
                hour_start_time DATETIME(3) NOT NULL,
                hour_end_time DATETIME(3) NOT NULL,
                product_count INT DEFAULT 0,
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id),
                FOREIGN KEY (run_id) REFERENCES machine_runs(run_id)
            )
        `);

        logger.info('Database tables (machines, runs, hourly_production) initialized');
    } catch (error) {
        logger.error('Error initializing tables:', error);
        throw error;
    }
};

const disconnectDB = async () => {
    if (pool) {
        await pool.end();
        logger.info('MySQL connection closed');
    }
};

const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return pool;
};

module.exports = { connectDB, disconnectDB, getPool };
