const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies the access token from Authorization header
 * Sets req.user with decoded token payload
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Expect format: "Bearer <token>"
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format. Use: Bearer <token>'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Token is empty.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Attach user info to request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please refresh your token or login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

/**
 * Role-based Authorization Middleware
 * Must be used AFTER authenticate middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`Authorization failed: User ${req.user.username} (role: ${req.user.role}) tried to access resource requiring roles: [${roles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

/**
 * Socket.IO Authentication Middleware
 * Verifies JWT from socket handshake auth or query
 */
const authenticateSocket = (socket, next) => {
    try {
        // Try to get token from auth object first, then from query params
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            return next(new Error('Authentication required. Provide token in auth.token or query.token'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);

        // Attach user info to socket
        socket.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };

        logger.info(`[Socket.IO] Authenticated user: ${decoded.username} (socket: ${socket.id})`);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Token expired. Please refresh your token.'));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new Error('Invalid token.'));
        }
        logger.error('[Socket.IO] Auth error:', error);
        return next(new Error('Authentication failed.'));
    }
};

module.exports = {
    authenticate,
    authorize,
    authenticateSocket
};
