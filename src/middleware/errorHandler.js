const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const config = require('../config/env');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        // Add field info if available (Multer errors)
        field: err.field,
        code: err.code
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));

        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            errorResponse('Validation failed', HTTP_STATUS.BAD_REQUEST, errors)
        );
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(HTTP_STATUS.CONFLICT).json(
            errorResponse(
                `${field} already exists`,
                HTTP_STATUS.CONFLICT
            )
        );
    }

    // Mongoose cast error
    if (err.name === 'CastError') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            errorResponse('Invalid data format', HTTP_STATUS.BAD_REQUEST)
        );
    }

    // Multer file upload errors
    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                errorResponse(ERROR_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST)
            );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                errorResponse(`Unexpected field: ${err.field || 'unknown'}. Expected 'machine_image'.`, HTTP_STATUS.BAD_REQUEST)
            );
        }
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
            errorResponse(`Upload Error: ${err.message}`, HTTP_STATUS.BAD_REQUEST)
        );
    }

    // Custom application errors
    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || ERROR_MESSAGES.INTERNAL_ERROR;

    // Send detailed error in development, generic in production
    const errorDetails = config.nodeEnv === 'development' ? {
        stack: err.stack,
        error: err
    } : null;

    res.status(statusCode).json(
        errorResponse(message, statusCode, errorDetails)
    );
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json(
        errorResponse(
            `Route ${req.method} ${req.path} not found`,
            HTTP_STATUS.NOT_FOUND
        )
    );
};

module.exports = {
    errorHandler,
    notFoundHandler
};
