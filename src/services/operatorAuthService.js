const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OperatorUserModel = require('../models/OperatorUser');
const config = require('../config/env');
const logger = require('../utils/logger');

class OperatorAuthService {
    generateAccessToken(user) {
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: 'operator', userType: 'operator' },
            config.jwt.secret, { expiresIn: config.jwt.expiresIn }
        );
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { id: user.id, userType: 'operator' },
            config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn }
        );
    }

    async register({ username, email, password, full_name }) {
        const existingUsername = await OperatorUserModel.findByUsername(username);
        if (existingUsername) { const e = new Error('Username already exists'); e.statusCode = 409; throw e; }
        const existingEmail = await OperatorUserModel.findByEmail(email);
        if (existingEmail) { const e = new Error('Email already exists'); e.statusCode = 409; throw e; }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userId = await OperatorUserModel.create({ username, email, password: hashedPassword, full_name });
        const user = await OperatorUserModel.findById(userId);
        logger.info(`Operator registered: ${username}`);
        return { user, message: 'Operator registered successfully' };
    }

    async login({ email, password }) {
        const user = await OperatorUserModel.findByEmail(email);
        if (!user) { const e = new Error('Invalid email or password'); e.statusCode = 401; throw e; }
        if (!user.is_active) { const e = new Error('Account deactivated'); e.statusCode = 403; throw e; }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { const e = new Error('Invalid email or password'); e.statusCode = 401; throw e; }

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        await OperatorUserModel.updateRefreshToken(user.id, refreshToken);
        await OperatorUserModel.updateLastLogin(user.id);
        logger.info(`Operator logged in: ${user.email}`);

        return {
            user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: 'operator', userType: 'operator' },
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
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
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
