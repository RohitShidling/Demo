const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const config = require('../config/env');
const logger = require('../utils/logger');

class AuthService {
    /**
     * Generate access token
     */
    generateAccessToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(user) {
        return jwt.sign(
            { id: user.id },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiresIn }
        );
    }

    /**
     * Register a new user
     */
    async register({ username, email, password, full_name, role }) {
        // Check if username already exists
        const existingUsername = await UserModel.findByUsername(username);
        if (existingUsername) {
            const error = new Error('Username already exists');
            error.statusCode = 409;
            throw error;
        }

        // Check if email already exists
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            const error = new Error('Email already exists');
            error.statusCode = 409;
            throw error;
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userId = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            full_name,
            role: role || 'operator'
        });

        // Get created user (without password)
        const user = await UserModel.findById(userId);

        logger.info(`User registered: ${username} (role: ${user.role})`);

        return {
            user,
            message: 'User registered successfully'
        };
    }

    /**
     * Login user
     */
    async login({ username, password }) {
        // Find user by username
        const user = await UserModel.findByUsername(username);
        if (!user) {
            const error = new Error('Invalid username or password');
            error.statusCode = 401;
            throw error;
        }

        // Check if account is active
        if (!user.is_active) {
            const error = new Error('Account is deactivated. Contact admin.');
            error.statusCode = 403;
            throw error;
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('Invalid username or password');
            error.statusCode = 401;
            throw error;
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Store refresh token in DB
        await UserModel.updateRefreshToken(user.id, refreshToken);

        // Update last login
        await UserModel.updateLastLogin(user.id);

        logger.info(`User logged in: ${username}`);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            accessToken,
            refreshToken
        };
    }

    /**
     * Logout user
     */
    async logout(userId) {
        await UserModel.clearRefreshToken(userId);
        logger.info(`User logged out: ID ${userId}`);
        return { message: 'Logged out successfully' };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        if (!refreshToken) {
            const error = new Error('Refresh token is required');
            error.statusCode = 400;
            throw error;
        }

        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

            // Find user with this refresh token
            const user = await UserModel.findByRefreshToken(refreshToken);
            if (!user || user.id !== decoded.id) {
                const error = new Error('Invalid refresh token');
                error.statusCode = 401;
                throw error;
            }

            // Generate new access token
            const newAccessToken = this.generateAccessToken(user);

            // Generate new refresh token (rotation)
            const newRefreshToken = this.generateRefreshToken(user);
            await UserModel.updateRefreshToken(user.id, newRefreshToken);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
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

    /**
     * Get current user profile
     */
    async getProfile(userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        return user;
    }
}

module.exports = new AuthService();
