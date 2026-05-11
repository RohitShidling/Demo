const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const BusinessUserModel = require('../models/BusinessUser');
const AuthOtpModel = require('../models/AuthOtp');
const config = require('../config/env');
const logger = require('../utils/logger');
const { sendOtpEmail } = require('../utils/mailer');

class BusinessAuthService {
    buildUsernameFromName(name, email) {
        const source = (name || email?.split('@')[0] || 'business_user')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 24);
        const suffix = Math.random().toString(36).slice(2, 8);
        return `${source || 'business_user'}_${suffix}`;
    }

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

    async requestRegisterOtp({ name, email }) {
        const existingEmail = await BusinessUserModel.findByEmail(email);
        if (existingEmail) {
            const error = new Error('This email is already registered as an admin. Please sign in instead.');
            error.statusCode = 409;
            throw error;
        }

        const { otp, expiresAt } = await AuthOtpModel.create({ email, user_type: 'business', purpose: 'register' });
        await sendOtpEmail({ to: email, otp, purpose: 'register' });
        return { message: 'OTP sent to email for registration', expiresAt };
    }

    async verifyOtp({ email, otp, purpose, userType }) {
        const record = await AuthOtpModel.findLatestValid({ email, user_type: userType, purpose });
        if (!record) {
            const error = new Error('No OTP request found. Please request OTP first.');
            error.statusCode = 400;
            throw error;
        }

        if (new Date(record.expires_at).getTime() < Date.now()) {
            const error = new Error('OTP expired. Please request a new OTP.');
            error.statusCode = 401;
            throw error;
        }

        if (record.attempts >= config.otp.maxAttempts) {
            const error = new Error('Too many OTP attempts. Please request a new OTP.');
            error.statusCode = 429;
            throw error;
        }

        const otpHash = AuthOtpModel.hashOtp(otp);
        if (otpHash !== record.otp_hash) {
            await AuthOtpModel.incrementAttempts(record.id);
            const error = new Error('Invalid OTP');
            error.statusCode = 401;
            throw error;
        }

        await AuthOtpModel.markVerified(record.id);
    }

    async register({ name, email, otp }) {
        await this.verifyOtp({ email, otp, purpose: 'register', userType: 'business' });
        const username = this.buildUsernameFromName(name, email);
        const randomPassword = crypto.randomUUID();
        const userId = await BusinessUserModel.create({
            username,
            email,
            password: randomPassword
        });

        const user = await BusinessUserModel.findById(userId);
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        await BusinessUserModel.updateRefreshToken(user.id, refreshToken);
        await BusinessUserModel.updateLastLogin(user.id);
        logger.info(`Business user registered: ${email} (admin)`);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: 'admin',
                userType: 'business'
            },
            accessToken,
            refreshToken,
            message: 'Admin account created. You are now signed in.'
        };
    }

    async requestLoginOtp({ email }) {
        const user = await BusinessUserModel.findByEmail(email);
        if (!user) {
            const error = new Error('No admin account found for this email. Please register first.');
            error.statusCode = 401;
            throw error;
        }

        if (!user.is_active) {
            const error = new Error('Account is deactivated. Contact admin.');
            error.statusCode = 403;
            throw error;
        }

        const { otp, expiresAt } = await AuthOtpModel.create({ email, user_type: 'business', purpose: 'login' });
        await sendOtpEmail({ to: email, otp, purpose: 'login' });
        return { message: 'OTP sent to email for login', expiresAt };
    }

    async login({ email, otp }) {
        await this.verifyOtp({ email, otp, purpose: 'login', userType: 'business' });
        const user = await BusinessUserModel.findByEmail(email);
        if (!user) {
            const error = new Error('User with this email does not exist');
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
