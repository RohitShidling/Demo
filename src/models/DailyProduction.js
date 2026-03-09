const { getPool } = require('../config/database');

class DailyProductionModel {
    static async getOrCreate(machine_id, date) {
        const pool = getPool();
        const productionDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        const [existing] = await pool.execute(
            `SELECT * FROM daily_production WHERE machine_id = ? AND production_date = ?`,
            [machine_id, productionDate]
        );

        if (existing.length > 0) return existing[0];

        const [result] = await pool.execute(
            `INSERT INTO daily_production (machine_id, production_date) VALUES (?, ?)`,
            [machine_id, productionDate]
        );

        return {
            id: result.insertId,
            machine_id,
            production_date: productionDate,
            total_count: 0,
            accepted_count: 0,
            rejected_count: 0,
            run_time_minutes: 0
        };
    }

    static async incrementCount(machine_id, date) {
        const pool = getPool();
        const productionDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        await pool.execute(
            `UPDATE daily_production SET total_count = total_count + 1, accepted_count = accepted_count + 1 WHERE machine_id = ? AND production_date = ?`,
            [machine_id, productionDate]
        );
    }

    static async incrementRejected(machine_id, date, count = 1) {
        const pool = getPool();
        const productionDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        await pool.execute(
            `UPDATE daily_production SET rejected_count = rejected_count + ? WHERE machine_id = ? AND production_date = ?`,
            [count, machine_id, productionDate]
        );
    }

    static async getByMachineAndDateRange(machine_id, startDate, endDate) {
        const pool = getPool();
        const query = `
            SELECT * FROM daily_production 
            WHERE machine_id = ? AND production_date BETWEEN ? AND ?
            ORDER BY production_date ASC
        `;
        const [rows] = await pool.execute(query, [machine_id, startDate, endDate]);
        return rows;
    }

    static async getByMachine(machine_id) {
        const pool = getPool();
        const query = `SELECT * FROM daily_production WHERE machine_id = ? ORDER BY production_date DESC`;
        const [rows] = await pool.execute(query, [machine_id]);
        return rows;
    }

    static async getByDate(date) {
        const pool = getPool();
        const query = `
            SELECT dp.*, m.machine_name 
            FROM daily_production dp
            JOIN machines m ON dp.machine_id = m.machine_id
            WHERE dp.production_date = ?
            ORDER BY dp.total_count DESC
        `;
        const [rows] = await pool.execute(query, [date]);
        return rows;
    }

    static async updateRunTime(machine_id, date, minutes) {
        const pool = getPool();
        const productionDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        await pool.execute(
            `UPDATE daily_production SET run_time_minutes = ? WHERE machine_id = ? AND production_date = ?`,
            [minutes, machine_id, productionDate]
        );
    }

    static async updateStartEndTime(machine_id, date, start_time, end_time) {
        const pool = getPool();
        const productionDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const fields = [];
        const values = [];
        if (start_time) { fields.push('start_time = ?'); values.push(start_time); }
        if (end_time) { fields.push('end_time = ?'); values.push(end_time); }
        if (fields.length === 0) return;
        values.push(machine_id, productionDate);
        await pool.execute(
            `UPDATE daily_production SET ${fields.join(', ')} WHERE machine_id = ? AND production_date = ?`,
            values
        );
    }
}

module.exports = DailyProductionModel;
