const AuthService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * POST /api/auth/register
 * Register a new user
 */
exports.register = async (req, res, next) => {
    try {
        const { username, email, password, full_name, role } = req.body;

        // Validation
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'username, email, password, and full_name are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const result = await AuthService.register({ username, email, password, full_name, role });

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Login user and return JWT tokens
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'username and password are required'
            });
        }

        const result = await AuthService.login({ username, password });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
exports.logout = async (req, res, next) => {
    try {
        // req.user is set by the authenticate middleware
        const result = await AuthService.logout(req.user.id);

        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'refreshToken is required'
            });
        }

        const result = await AuthService.refreshToken(refreshToken);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await AuthService.getProfile(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};
