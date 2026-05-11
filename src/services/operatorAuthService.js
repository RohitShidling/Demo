const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const OperatorUserModel = require('../models/OperatorUser');
const AuthOtpModel = require('../models/AuthOtp');
const config = require('../config/env');
const logger = require('../utils/logger');
const { sendOtpEmail } = require('../utils/mailer');

class OperatorAuthService {
    buildUsernameFromName(name, email) {
        const source = (name || email?.split('@')[0] || 'operator')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 24);
        const suffix = Math.random().toString(36).slice(2, 8);
        return `${source || 'operator'}_${suffix}`;
    }

    generateAccessToken(user) {
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: 'operator', userType: 'operator' },
            config.operatorJwt.secret,
            { expiresIn: config.operatorJwt.expiresIn }
        );
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { id: user.id, userType: 'operator' },
            config.operatorJwt.refreshSecret,
            { expiresIn: config.operatorJwt.refreshExpiresIn }
        );
    }

    async requestRegisterOtp({ name, email }) {
        const existingEmail = await OperatorUserModel.findByEmail(email);
        if (existingEmail) {
            const e = new Error('This email is already registered. Please sign in instead.');
            e.statusCode = 409;
            throw e;
        }

        const { otp, expiresAt } = await AuthOtpModel.create({ email, user_type: 'operator', purpose: 'register' });
        await sendOtpEmail({ to: email, otp, purpose: 'register' });
        return { message: 'OTP sent to email for registration', expiresAt };
    }

    async verifyOtp({ email, otp, purpose, userType }) {
        const record = await AuthOtpModel.findLatestValid({ email, user_type: userType, purpose });
        if (!record) { const e = new Error('No OTP request found. Please request OTP first.'); e.statusCode = 400; throw e; }
        if (new Date(record.expires_at).getTime() < Date.now()) { const e = new Error('OTP expired. Please request a new OTP.'); e.statusCode = 401; throw e; }
        if (record.attempts >= config.otp.maxAttempts) { const e = new Error('Too many OTP attempts. Please request a new OTP.'); e.statusCode = 429; throw e; }

        const otpHash = AuthOtpModel.hashOtp(otp);
        if (otpHash !== record.otp_hash) {
            await AuthOtpModel.incrementAttempts(record.id);
            const e = new Error('Invalid OTP'); e.statusCode = 401; throw e;
        }
        await AuthOtpModel.markVerified(record.id);
    }

    async register({ name, email, otp }) {
        await this.verifyOtp({ email, otp, purpose: 'register', userType: 'operator' });
        const username = this.buildUsernameFromName(name, email);
        const randomPassword = crypto.randomUUID();
        const userId = await OperatorUserModel.create({ username, email, password: randomPassword });
        const user = await OperatorUserModel.findById(userId);
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        await OperatorUserModel.updateRefreshToken(user.id, refreshToken);
        await OperatorUserModel.updateLastLogin(user.id);
        logger.info(`Operator registered: ${email}`);
        return {
            user: { id: user.id, username: user.username, email: user.email, role: 'operator', userType: 'operator' },
            accessToken,
            refreshToken,
            message: 'Account created. You are now signed in.'
        };
    }

    async requestLoginOtp({ email }) {
        const user = await OperatorUserModel.findByEmail(email);
        if (!user) {
            const e = new Error('No account found for this email. Please register first.');
            e.statusCode = 401;
            throw e;
        }
        if (!user.is_active) { const e = new Error('Account deactivated'); e.statusCode = 403; throw e; }
        const { otp, expiresAt } = await AuthOtpModel.create({ email, user_type: 'operator', purpose: 'login' });
        await sendOtpEmail({ to: email, otp, purpose: 'login' });
        return { message: 'OTP sent to email for login', expiresAt };
    }

    async login({ email, otp }) {
        await this.verifyOtp({ email, otp, purpose: 'login', userType: 'operator' });
        const user = await OperatorUserModel.findByEmail(email);
        if (!user) { const e = new Error('User with this email does not exist'); e.statusCode = 401; throw e; }

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        await OperatorUserModel.updateRefreshToken(user.id, refreshToken);
        await OperatorUserModel.updateLastLogin(user.id);
        logger.info(`Operator logged in: ${user.email}`);

        return {
            user: { id: user.id, username: user.username, email: user.email, role: 'operator', userType: 'operator' },
            accessToken, refreshToken
        };
    }

    async logout(userId) {
        await OperatorUserModel.clearRefreshToken(userId);
        return { message: 'Logged out successfully' };
    }

    async refreshToken(refreshToken) {
        if (!refreshToken) { const e = new Error('Refresh token required'); e.statusCode = 400; throw e; }
        try {
            const decoded = jwt.verify(refreshToken, config.operatorJwt.refreshSecret);
            if (decoded.userType !== 'operator') { const e = new Error('Invalid token type'); e.statusCode = 401; throw e; }
            const user = await OperatorUserModel.findByRefreshToken(refreshToken);
            if (!user || user.id !== decoded.id) { const e = new Error('Invalid refresh token'); e.statusCode = 401; throw e; }
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            await OperatorUserModel.updateRefreshToken(user.id, newRefreshToken);
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            if (error.name === 'TokenExpiredError') { const e = new Error('Token expired'); e.statusCode = 401; throw e; }
            if (error.name === 'JsonWebTokenError') { const e = new Error('Invalid token'); e.statusCode = 401; throw e; }
            throw error;
        }
    }

    async getProfile(userId) {
        const user = await OperatorUserModel.findById(userId);
        if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
        return { ...user, userType: 'operator' };
    }
}

module.exports = new OperatorAuthService();
