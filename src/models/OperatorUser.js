const { getPool } = require('../config/database');

class OperatorUserModel {
    static async create({ username, email, password }) {
        const pool = getPool();
        const query = `
            INSERT INTO operator_users (username, email, password, role)
            VALUES (?, ?, ?, 'operator')
        `;
        const [result] = await pool.execute(query, [username, email, password]);
        return result.insertId;
    }

    static async findByUsername(username) {
        const pool = getPool();
        const query = `SELECT * FROM operator_users WHERE username = ?`;
        const [rows] = await pool.execute(query, [username]);
        return rows[0];
    }

    static async findByEmail(email) {
        const pool = getPool();
        const query = `SELECT * FROM operator_users WHERE email = ?`;
        const [rows] = await pool.execute(query, [email]);
        return rows[0];
    }

    static async findById(id) {
        const pool = getPool();
        const query = `SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM operator_users WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async updateLastLogin(id) {
        const pool = getPool();
        const query = `UPDATE operator_users SET last_login = CURRENT_TIMESTAMP(3) WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    static async updateRefreshToken(id, refreshToken) {
        const pool = getPool();
        const query = `UPDATE operator_users SET refresh_token = ? WHERE id = ?`;
        await pool.execute(query, [refreshToken, id]);
    }

    static async clearRefreshToken(id) {
        const pool = getPool();
        const query = `UPDATE operator_users SET refresh_token = NULL WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    static async findByRefreshToken(refreshToken) {
        const pool = getPool();
        const query = `SELECT * FROM operator_users WHERE refresh_token = ?`;
        const [rows] = await pool.execute(query, [refreshToken]);
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const query = `SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM operator_users ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async count() {
        const pool = getPool();
        const query = `SELECT COUNT(*) as count FROM operator_users`;
        const [rows] = await pool.execute(query);
        return rows[0].count;
    }
}

module.exports = OperatorUserModel;
