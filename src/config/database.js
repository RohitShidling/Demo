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
            connectionLimit: 20,
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
        // Table 1: Business Users (Admin/Business-level login)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role ENUM('admin') DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_login DATETIME(3),
                refresh_token TEXT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 2: Operator Users (Operator-level login)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS operator_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                role ENUM('operator') DEFAULT 'operator',
                is_active BOOLEAN DEFAULT TRUE,
                last_login DATETIME(3),
                refresh_token TEXT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 3: Machines (Configuration)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machines (
                machine_id VARCHAR(50) PRIMARY KEY,
                machine_name VARCHAR(100) NOT NULL,
                machine_image LONGBLOB,
                ingest_path VARCHAR(100) UNIQUE NOT NULL,
                status ENUM('RUNNING', 'MAINTENANCE', 'NOT_STARTED') DEFAULT 'NOT_STARTED',
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // Add status column if not exists (for existing tables)
        try {
            await pool.query(`ALTER TABLE machines ADD COLUMN status ENUM('RUNNING', 'MAINTENANCE', 'NOT_STARTED') DEFAULT 'NOT_STARTED' AFTER ingest_path`);
        } catch (e) {
            // Column likely already exists, ignore
        }
        try {
            await pool.query(`ALTER TABLE machines ADD COLUMN updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`);
        } catch (e) {
            // Column likely already exists, ignore
        }

        // ─────────────────────────────────────────────────
        // Table 4: Machine Runs (Sessions)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_runs (
                run_id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                start_time DATETIME(3) NOT NULL,
                end_time DATETIME(3),
                status ENUM('RUNNING', 'STOPPED') DEFAULT 'RUNNING',
                total_count INT DEFAULT 0,
                accepted_count INT DEFAULT 0,
                rejected_count INT DEFAULT 0,
                last_activity_time DATETIME(3),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // Add accepted/rejected columns if not exists
        try {
            await pool.query(`ALTER TABLE machine_runs ADD COLUMN accepted_count INT DEFAULT 0 AFTER total_count`);
        } catch (e) { /* ignore */ }
        try {
            await pool.query(`ALTER TABLE machine_runs ADD COLUMN rejected_count INT DEFAULT 0 AFTER accepted_count`);
        } catch (e) { /* ignore */ }

        // ─────────────────────────────────────────────────
        // Table 5: Hourly Production (Buckets)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hourly_production (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                run_id INT NOT NULL,
                hour_start_time DATETIME(3) NOT NULL,
                hour_end_time DATETIME(3) NOT NULL,
                product_count INT DEFAULT 0,
                accepted_count INT DEFAULT 0,
                rejected_count INT DEFAULT 0,
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
                FOREIGN KEY (run_id) REFERENCES machine_runs(run_id) ON DELETE CASCADE
            )
        `);

        // Add accepted/rejected columns if not exists
        try {
            await pool.query(`ALTER TABLE hourly_production ADD COLUMN accepted_count INT DEFAULT 0 AFTER product_count`);
        } catch (e) { /* ignore */ }
        try {
            await pool.query(`ALTER TABLE hourly_production ADD COLUMN rejected_count INT DEFAULT 0 AFTER accepted_count`);
        } catch (e) { /* ignore */ }

        // ─────────────────────────────────────────────────
        // Table 6: Work Orders
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS work_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id VARCHAR(50) UNIQUE NOT NULL,
                work_order_name VARCHAR(200) NOT NULL,
                target INT NOT NULL DEFAULT 0,
                description TEXT,
                status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
                total_produced INT DEFAULT 0,
                total_accepted INT DEFAULT 0,
                total_rejected INT DEFAULT 0,
                created_by INT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 7: Work Order <-> Machine Junction
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS work_order_machines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id VARCHAR(50) NOT NULL,
                machine_id VARCHAR(50) NOT NULL,
                assigned_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                UNIQUE KEY unique_wo_machine (work_order_id, machine_id),
                FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 8: Part Rejections
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS part_rejections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                work_order_id VARCHAR(50),
                operator_id INT NOT NULL,
                rejection_reason TEXT NOT NULL,
                part_image LONGBLOB,
                rejected_count INT DEFAULT 1,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 9: Workflow Steps (for work orders)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_steps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id VARCHAR(50) NOT NULL,
                step_order INT NOT NULL,
                step_name VARCHAR(200) NOT NULL,
                step_description TEXT,
                status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED') DEFAULT 'PENDING',
                started_at DATETIME(3),
                completed_at DATETIME(3),
                assigned_machine_id VARCHAR(50),
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 10: Operator Skills
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS operator_skills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                operator_id INT NOT NULL,
                operator_name VARCHAR(100) NOT NULL,
                skill_set TEXT NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                FOREIGN KEY (operator_id) REFERENCES operator_users(id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 11: Machine-Operator Assignment
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_operators (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                operator_id INT NOT NULL,
                mentor_name VARCHAR(100),
                assigned_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                is_active BOOLEAN DEFAULT TRUE,
                UNIQUE KEY unique_machine_operator (machine_id, operator_id),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
                FOREIGN KEY (operator_id) REFERENCES operator_users(id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 12: Machine Breakdowns
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_breakdowns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                operator_id INT NOT NULL,
                problem_description TEXT NOT NULL,
                severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
                status ENUM('REPORTED', 'ACKNOWLEDGED', 'IN_REPAIR', 'RESOLVED') DEFAULT 'REPORTED',
                reported_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                resolved_at DATETIME(3),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
                FOREIGN KEY (operator_id) REFERENCES operator_users(id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 13: Daily Production Summary
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_production (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                production_date DATE NOT NULL,
                total_count INT DEFAULT 0,
                accepted_count INT DEFAULT 0,
                rejected_count INT DEFAULT 0,
                run_time_minutes INT DEFAULT 0,
                start_time DATETIME(3),
                end_time DATETIME(3),
                UNIQUE KEY unique_machine_date (machine_id, production_date),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        logger.info('Database tables initialized: business_users, operator_users, machines, machine_runs, hourly_production, work_orders, work_order_machines, part_rejections, workflow_steps, operator_skills, machine_operators, machine_breakdowns, daily_production');
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
