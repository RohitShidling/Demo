const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BusinessUserModel = require('../models/BusinessUser');
const config = require('../config/env');
const logger = require('../utils/logger');

class BusinessAuthService {
    generateAccessToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role: 'admin',
                userType: 'business'
            },
            config.businessJwt.secret,
            { expiresIn: config.businessJwt.expiresIn }
        );
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { id: user.id, userType: 'business' },
            config.businessJwt.refreshSecret,
            { expiresIn: config.businessJwt.refreshExpiresIn }
        );
    }

    async register({ username, email, password }) {
        const existingUsername = await BusinessUserModel.findByUsername(username);
        if (existingUsername) {
            const error = new Error('Username already exists');
            error.statusCode = 409;
            throw error;
        }

        const existingEmail = await BusinessUserModel.findByEmail(email);
        if (existingEmail) {
            const error = new Error('Email already exists');
            error.statusCode = 409;
            throw error;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userId = await BusinessUserModel.create({
            username,
            email,
            password: hashedPassword
        });

        const user = await BusinessUserModel.findById(userId);
        logger.info(`Business user registered: ${username} (admin)`);

        return { user, message: 'Business user registered successfully' };
    }

    async login({ email, password }) {
        const user = await BusinessUserModel.findByEmail(email);
        if (!user) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('Account is deactivated. Contact admin.');
            error.statusCode = 403;
            throw error;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            throw error;
        }

        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        await BusinessUserModel.updateRefreshToken(user.id, refreshToken);
        await BusinessUserModel.updateLastLogin(user.id);

        logger.info(`Business user logged in: ${user.email}`);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: 'admin',
                userType: 'business'
            },
            accessToken,
            refreshToken
        };
    }

    async logout(userId) {
        await BusinessUserModel.clearRefreshToken(userId);
        logger.info(`Business user logged out: ID ${userId}`);
        return { message: 'Logged out successfully' };
    }

    async refreshToken(refreshToken) {
        if (!refreshToken) {
            const error = new Error('Refresh token is required');
            error.statusCode = 400;
            throw error;
        }

        try {
            const decoded = jwt.verify(refreshToken, config.businessJwt.refreshSecret);

            if (decoded.userType !== 'business') {
                const error = new Error('Invalid token type for business login');
                error.statusCode = 401;
                throw error;
            }

            const user = await BusinessUserModel.findByRefreshToken(refreshToken);
            if (!user || user.id !== decoded.id) {
                const error = new Error('Invalid refresh token');
                error.statusCode = 401;
                throw error;
            }

            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            await BusinessUserModel.updateRefreshToken(user.id, newRefreshToken);

            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                const err = new Error('Refresh token expired. Please login again.');
                err.statusCode = 401;
                throw err;
            }
            if (error.name === 'JsonWebTokenError') {
                const err = new Error('Invalid refresh token');
                err.statusCode = 401;
                throw err;
            }
            throw error;
        }
    }

    async getProfile(userId) {
        const user = await BusinessUserModel.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        return { ...user, userType: 'business' };
    }
}

module.exports = new BusinessAuthService();
