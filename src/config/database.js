const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
    try {
        // First create database if it doesn't exist
        const connection = await mysql.createConnection({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            port: config.mysql.port
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\`;`);
        await connection.end();

        // Create connection pool
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

        // Initialize all tables
        await initTables();

        logger.info(`MySQL Connected: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
    } catch (error) {
        logger.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};

const initTables = async () => {
    try {
        // ─────────────────────────────────────────────────
        // Table 1: Users (Authentication)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
                is_active BOOLEAN DEFAULT TRUE,
                last_login DATETIME(3),
                refresh_token TEXT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 2: Machines (Configuration)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machines (
                machine_id VARCHAR(50) PRIMARY KEY,
                machine_name VARCHAR(100) NOT NULL,
                machine_image LONGBLOB,
                ingest_path VARCHAR(100) UNIQUE NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 3: Machine Runs (Sessions)
        // ─────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────
        // Table 4: Hourly Production (Buckets)
        // ─────────────────────────────────────────────────
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

        logger.info('Database tables initialized: users, machines, machine_runs, hourly_production');
    } catch (error) {
        logger.error('Error initializing tables:', error);
        throw error;
    }
};

const disconnectDB = async () => {
    if (pool) {
        await pool.end();
        logger.info('MySQL connection pool closed');
    }
};

const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return pool;
};

module.exports = { connectDB, disconnectDB, getPool };
