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
        // Only username, email, password (NO full_name)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin') DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_login DATETIME(3),
                refresh_token TEXT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // Drop full_name column if it exists (migration)
        try {
            await pool.query(`ALTER TABLE business_users DROP COLUMN full_name`);
        } catch (e) { /* Column may not exist, ignore */ }

        // ─────────────────────────────────────────────────
        // Table 2: Operator Users (Operator-level login)
        // Only username, email, password (NO full_name)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS operator_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('operator') DEFAULT 'operator',
                is_active BOOLEAN DEFAULT TRUE,
                last_login DATETIME(3),
                refresh_token TEXT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // Drop full_name column if it exists (migration)
        try {
            await pool.query(`ALTER TABLE operator_users DROP COLUMN full_name`);
        } catch (e) { /* Column may not exist, ignore */ }

        // ─────────────────────────────────────────────────
        // Table 3: Machines (Configuration)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machines (
                machine_id VARCHAR(50) PRIMARY KEY,
                machine_name VARCHAR(100) NOT NULL,
                machine_image LONGBLOB,
                ingest_path VARCHAR(100) UNIQUE NOT NULL,
                status ENUM('RUNNING', 'STOPPED', 'MAINTENANCE', 'NOT_STARTED') DEFAULT 'NOT_STARTED',
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // Add STOPPED to enum if needed
        try {
            await pool.query(`ALTER TABLE machines MODIFY COLUMN status ENUM('RUNNING', 'STOPPED', 'MAINTENANCE', 'NOT_STARTED') DEFAULT 'NOT_STARTED'`);
        } catch (e) { /* ignore */ }

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
                status ENUM('CREATED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'CREATED',
                total_produced INT DEFAULT 0,
                total_accepted INT DEFAULT 0,
                total_rejected INT DEFAULT 0,
                created_by INT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // Add CREATED to status enum if needed
        try {
            await pool.query(`ALTER TABLE work_orders MODIFY COLUMN status ENUM('CREATED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'CREATED'`);
        } catch (e) { /* ignore */ }

        // Migration: Add targeted_end_date to work_orders
        try {
            await pool.query(`ALTER TABLE work_orders ADD COLUMN targeted_end_date DATE NULL AFTER description`);
        } catch (e) { /* Column may already exist, ignore */ }

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

        // Migration: Add stage_order and per-machine production counts to work_order_machines
        try { await pool.query(`ALTER TABLE work_order_machines ADD COLUMN stage_order INT NULL`); } catch(e){}
        try { await pool.query(`ALTER TABLE work_order_machines ADD COLUMN production_count INT DEFAULT 0 NOT NULL`); } catch(e){}
        try { await pool.query(`ALTER TABLE work_order_machines ADD COLUMN rejected_count INT DEFAULT 0 NOT NULL`); } catch(e){}
        try { await pool.query(`ALTER TABLE work_order_machines ADD COLUMN accepted_count INT DEFAULT 0 NOT NULL`); } catch(e){}

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
                rework_reason TEXT,
                part_description TEXT,
                supervisor_name VARCHAR(100),
                part_image LONGBLOB,
                rejected_count INT DEFAULT 1,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // Migration: enrich rejection details for reports
        try { await pool.query(`ALTER TABLE part_rejections ADD COLUMN rework_reason TEXT NULL AFTER rejection_reason`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE part_rejections ADD COLUMN part_description TEXT NULL AFTER rework_reason`); } catch (e) { /* ignore */ }
        try { await pool.query(`ALTER TABLE part_rejections ADD COLUMN supervisor_name VARCHAR(100) NULL AFTER part_description`); } catch (e) { /* ignore */ }

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

        // ─────────────────────────────────────────────────
        // Table 14: Production Logs (SINGLE SOURCE OF TRUTH)
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                work_order_id VARCHAR(50),
                produced_count INT DEFAULT 0,
                rejected_count INT DEFAULT 0,
                status ENUM('GOOD', 'REJECTED') DEFAULT 'GOOD',
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_pl_machine (machine_id),
                INDEX idx_pl_work_order (work_order_id),
                INDEX idx_pl_recorded (recorded_at)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 15: Machine Checklist
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_checklists (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                checkpoint VARCHAR(255) NOT NULL,
                description TEXT,
                specification TEXT,
                method TEXT,
                image LONGBLOB,
                timing VARCHAR(100),
                status ENUM('PENDING', 'OK', 'NOT_OK', 'NA') DEFAULT 'PENDING',
                comments TEXT,
                checked_by INT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_mc_machine (machine_id),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 16: Shifts
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                shift_name VARCHAR(50) NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 17: Operator Shifts
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS operator_shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                operator_id INT NOT NULL,
                shift_id INT NOT NULL,
                date DATE NOT NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (operator_id) REFERENCES operator_users(id) ON DELETE CASCADE,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 18: Machine Downtime
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machine_downtime (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50) NOT NULL,
                reason TEXT,
                severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NULL,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                INDEX idx_md_machine (machine_id),
                FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 19: Inventory Materials
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                material_name VARCHAR(200) NOT NULL,
                quantity DECIMAL(10,2) DEFAULT 0,
                unit VARCHAR(50) DEFAULT 'pcs',
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 20: Inventory Consumption
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_consumption (
                id INT AUTO_INCREMENT PRIMARY KEY,
                material_id INT NOT NULL,
                work_order_id VARCHAR(50),
                quantity_used DECIMAL(10,2) NOT NULL,
                consumed_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 21: Quality Inspections
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quality_inspections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_id VARCHAR(50),
                work_order_id VARCHAR(50),
                parameters JSON,
                status ENUM('PASS', 'FAIL') DEFAULT 'PASS',
                remarks TEXT,
                inspected_by INT,
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                INDEX idx_qi_machine (machine_id),
                INDEX idx_qi_work_order (work_order_id)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 22: Production Schedule
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_schedule (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id VARCHAR(50) NOT NULL,
                machine_id VARCHAR(50) NOT NULL,
                start_time DATETIME(3) NOT NULL,
                end_time DATETIME(3) NOT NULL,
                status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                INDEX idx_ps_work_order (work_order_id),
                INDEX idx_ps_machine (machine_id)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 23: Notifications
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('INFO', 'WARNING', 'ERROR', 'SUCCESS') DEFAULT 'INFO',
                is_read BOOLEAN DEFAULT FALSE,
                user_id INT,
                user_type ENUM('business', 'operator'),
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
            )
        `);

        // ─────────────────────────────────────────────────
        // Table 24: Audit Logs
        // ─────────────────────────────────────────────────
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(200) NOT NULL,
                entity_type VARCHAR(100),
                entity_id VARCHAR(100),
                user_id INT,
                user_type VARCHAR(50),
                details JSON,
                ip_address VARCHAR(50),
                created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
                INDEX idx_al_action (action),
                INDEX idx_al_entity (entity_type, entity_id),
                INDEX idx_al_created (created_at)
            )
        `);

        // Migration: Add sort_order column to machine_checklists
        try {
            await pool.query(`ALTER TABLE machine_checklists ADD COLUMN sort_order INT DEFAULT 0 AFTER comments`);
        } catch (e) { /* Column may already exist, ignore */ }

        // Migration: Add machine_id to notifications for machine-specific alerts
        try {
            await pool.query(`ALTER TABLE notifications ADD COLUMN machine_id VARCHAR(50) NULL AFTER type`);
        } catch (e) { /* Column may already exist, ignore */ }

        logger.info('Database tables initialized with all migrations applied successfully.');

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
