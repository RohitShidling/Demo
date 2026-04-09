const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Try to verify a JWT against both business and operator secrets.
 * Returns decoded payload with userType set, or throws on failure.
 */
function verifyToken(token) {
    // Try business secret first
    try {
        const decoded = jwt.verify(token, config.businessJwt.secret);
        if (decoded.userType === 'business') return decoded;
    } catch (_) { /* not a business token */ }

    // Try operator secret next
    try {
        const decoded = jwt.verify(token, config.operatorJwt.secret);
        if (decoded.userType === 'operator') return decoded;
    } catch (_) { /* not an operator token */ }

    // Fallback: shared secret (backwards-compat during transition)
    return jwt.verify(token, config.jwt.secret);
}

/**
 * JWT Authentication Middleware — supports business and operator user types
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Invalid token format. Use: Bearer <token>' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token is empty.' });
        }

        const decoded = verifyToken(token);
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            userType: decoded.userType || 'business'
        };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        logger.error('Auth error:', error);
        return res.status(500).json({ success: false, message: 'Authentication error.' });
    }
};

/**
 * Role-based Authorization
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

/**
 * User type authorization (business or operator)
 */
const authorizeUserType = (...types) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (!types.includes(req.user.userType)) {
            return res.status(403).json({ success: false, message: `Access denied. Required user type: ${types.join(' or ')}` });
        }
        next();
    };
};

/**
 * Socket.IO Authentication Middleware — tries both secrets
 */
const authenticateSocket = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Authentication required'));

        const decoded = verifyToken(token);
        socket.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            userType: decoded.userType || 'business'
        };
        logger.info(`[Socket.IO] Authenticated: ${decoded.username} (${decoded.userType || 'business'})`);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return next(new Error('Token expired'));
        if (error.name === 'JsonWebTokenError') return next(new Error('Invalid token'));
        return next(new Error('Authentication failed'));
    }
};

module.exports = { authenticate, authorize, authorizeUserType, authenticateSocket };
