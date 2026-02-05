const { getPool } = require('../config/database');

class ProductionLogModel {
    static async create({ machine_id, machine_name, machine_image, start_time }) {
        const pool = getPool();
        const query = `
            INSERT INTO production_logs (machine_id, machine_name, machine_image, start_time)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [machine_id, machine_name, machine_image, start_time]);
        return result.insertId;
    }

    static async updateCount(id, count) {
        const pool = getPool();
        const query = `
            UPDATE production_logs 
            SET production_count = ? 
            WHERE id = ?
        `;
        await pool.execute(query, [count, id]);
    }

    static async updateEndTime(id, end_time) {
        const pool = getPool();
        const query = `
            UPDATE production_logs 
            SET end_time = ? 
            WHERE id = ?
        `;
        await pool.execute(query, [end_time, id]);
    }

    static async getActiveLog(machine_id) {
        const pool = getPool();
        const query = `
            SELECT * FROM production_logs 
            WHERE machine_id = ? AND end_time IS NULL 
            ORDER BY start_time DESC 
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows[0];
    }

    static async getById(id) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async getByMachineId(machine_id) {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE machine_id = ? ORDER BY start_time DESC`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    // Helper to close previous hour's log if needed (for rotation service)
    static async closeLogAndCreateNew(prevId, endTime, newLogData) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Close old log
            await connection.execute(
                `UPDATE production_logs SET end_time = ? WHERE id = ?`,
                [endTime, prevId]
            );

            // Create new log
            const [result] = await connection.execute(
                `INSERT INTO production_logs (machine_id, machine_name, machine_image, start_time) VALUES (?, ?, ?, ?)`,
                [newLogData.machine_id, newLogData.machine_name, newLogData.machine_image, newLogData.start_time]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getAllActive() {
        const pool = getPool();
        const query = `SELECT * FROM production_logs WHERE end_time IS NULL`;
        const [rows] = await pool.execute(query);
        return rows;
    }
}

module.exports = ProductionLogModel;
