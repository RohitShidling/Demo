const { getPool } = require('../config/database');

class UserModel {
    /**
     * Create a new user
     */
    static async create({ username, email, password, full_name, role = 'operator' }) {
        const pool = getPool();
        const query = `
            INSERT INTO users (username, email, password, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [username, email, password, full_name, role]);
        return result.insertId;
    }

    /**
     * Find user by username
     */
    static async findByUsername(username) {
        const pool = getPool();
        const query = `SELECT * FROM users WHERE username = ?`;
        const [rows] = await pool.execute(query, [username]);
        return rows[0];
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const pool = getPool();
        const query = `SELECT * FROM users WHERE email = ?`;
        const [rows] = await pool.execute(query, [email]);
        return rows[0];
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const pool = getPool();
        const query = `SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    /**
     * Update last login time
     */
    static async updateLastLogin(id) {
        const pool = getPool();
        const query = `UPDATE users SET last_login = CURRENT_TIMESTAMP(3) WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    /**
     * Store refresh token
     */
    static async updateRefreshToken(id, refreshToken) {
        const pool = getPool();
        const query = `UPDATE users SET refresh_token = ? WHERE id = ?`;
        await pool.execute(query, [refreshToken, id]);
    }

    /**
     * Clear refresh token (logout)
     */
    static async clearRefreshToken(id) {
        const pool = getPool();
        const query = `UPDATE users SET refresh_token = NULL WHERE id = ?`;
        await pool.execute(query, [id]);
    }

    /**
     * Find user by refresh token
     */
    static async findByRefreshToken(refreshToken) {
        const pool = getPool();
        const query = `SELECT * FROM users WHERE refresh_token = ?`;
        const [rows] = await pool.execute(query, [refreshToken]);
        return rows[0];
    }

    /**
     * Update user password
     */
    static async updatePassword(id, hashedPassword) {
        const pool = getPool();
        const query = `UPDATE users SET password = ? WHERE id = ?`;
        await pool.execute(query, [hashedPassword, id]);
    }

    /**
     * Get all users (admin only) - never return passwords
     */
    static async findAll() {
        const pool = getPool();
        const query = `SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC`;
        const [rows] = await pool.execute(query);
        return rows;
    }

    /**
     * Check if any user exists (for first-time setup)
     */
    static async count() {
        const pool = getPool();
        const query = `SELECT COUNT(*) as count FROM users`;
        const [rows] = await pool.execute(query);
        return rows[0].count;
    }
}

module.exports = UserModel;
