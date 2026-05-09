const crypto = require('crypto');
const { getPool } = require('../config/database');
const config = require('../config/env');

class AuthOtpModel {
    static generateOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    static hashOtp(otp) {
        return crypto.createHash('sha256').update(String(otp)).digest('hex');
    }

    static async create({ email, user_type, purpose }) {
        const pool = getPool();
        const otp = this.generateOtp();
        const otpHash = this.hashOtp(otp);
        const expiresAtDate = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

        const invalidateQuery = `
            UPDATE auth_otps
            SET verified = TRUE
            WHERE email = ? AND user_type = ? AND purpose = ? AND verified = FALSE
        `;
        await pool.execute(invalidateQuery, [email, user_type, purpose]);

        const insertQuery = `
            INSERT INTO auth_otps (email, user_type, purpose, otp_hash, attempts, verified, expires_at)
            VALUES (?, ?, ?, ?, 0, FALSE, ?)
        `;
        await pool.execute(insertQuery, [email, user_type, purpose, otpHash, expiresAtDate]);

        return {
            otp,
            expiresAt: expiresAtDate.toISOString()
        };
    }

    static async findLatestValid({ email, user_type, purpose }) {
        const pool = getPool();
        const query = `
            SELECT *
            FROM auth_otps
            WHERE email = ? AND user_type = ? AND purpose = ? AND verified = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const [rows] = await pool.execute(query, [email, user_type, purpose]);
        return rows[0];
    }

    static async incrementAttempts(id) {
        const pool = getPool();
        await pool.execute(`UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?`, [id]);
    }

    static async markVerified(id) {
        const pool = getPool();
        await pool.execute(`UPDATE auth_otps SET verified = TRUE WHERE id = ?`, [id]);
    }
}

module.exports = AuthOtpModel;
