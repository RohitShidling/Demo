const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
    try {
        // First connect without DB to check/create it
        const connection = await mysql.createConnection({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            port: config.mysql.port
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\`;`);
        await connection.end();

        // Now connect to the specific database
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

        // Initialize Tables
        await initTables();

        logger.info(`MySQL Connected: ${config.mysql.host}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const initTables = async () => {
    const tableQuery = `
    CREATE TABLE IF NOT EXISTS production_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id VARCHAR(50) NOT NULL,
        machine_name VARCHAR(100) NOT NULL,
        machine_image LONGBLOB,
        start_time BIGINT,
        end_time BIGINT,
        production_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
    // Note: Used BIGINT for timestamps to store milliseconds if needed, or DATETIME. 
    // User requested "timestamp" which usually means UNIX timestamp or Date object. 
    // JS Date.now() is ms (BIGINT). MySQL TIMESTAMP is standard. 
    // Let's use DATETIME or BIGINT. BIGINT is safer for raw JS timestamps.
    // User said "start_time (timestamp when the machine starts)".
    // Let's stick to BIGINT for easy math or DATETIME.
    // Revised: DATETIME is more readable in DB. I'll use DATETIME.
    // Wait, user requirements: "start_time (timestamp when the machine starts)".
    // I will use DATETIME(3) for ms precision.

    const tableQueryUpdated = `
    CREATE TABLE IF NOT EXISTS production_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id VARCHAR(50) NOT NULL,
        machine_name VARCHAR(100) NOT NULL,
        machine_image LONGBLOB,
        start_time DATETIME(3),
        end_time DATETIME(3),
        production_count INT DEFAULT 0,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    );
    `;

    try {
        await pool.query(tableQueryUpdated);
        // Migration helper: Try to add column if it doesn't exist (for existing tables)
        try {
            await pool.query(`ALTER TABLE production_logs ADD COLUMN updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`);
        } catch (e) {
            // Ignore if column already exists
        }
        logger.info('Database tables initialized');
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
