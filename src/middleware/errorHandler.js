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
    if (err.name === 'MulterError' || err.message === 'Malformed part header' || err.message === 'Multipart: Boundary not found') {
        if (err.message === 'Malformed part header') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                errorResponse('Malformed part header. This is a known Postman issue. Solution: 1) Delete this request in Postman. 2) Create a new request. 3) Under Body -> form-data, re-type keys without spaces. 4) Do NOT manually set Content-Type header.', HTTP_STATUS.BAD_REQUEST)
            );
        }
        if (err.message === 'Multipart: Boundary not found') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                errorResponse('Multipart boundary not found. If using Postman, DO NOT manually set the Content-Type header. Leave it unchecked so Postman auto-generates the boundary.', HTTP_STATUS.BAD_REQUEST)
            );
        }
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

    // For 409 machine-assignment conflicts: include the conflicting WO info
    const conflictMeta = statusCode === 409 && err.conflicting_work_order_id
        ? {
            conflicting_work_order_id: err.conflicting_work_order_id,
            conflicting_work_order_name: err.conflicting_work_order_name,
            action_required: `Unassign machine from work order '${err.conflicting_work_order_id}' first, then reassign.`
          }
        : null;

    const body = { success: false, message, statusCode };
    if (conflictMeta) body.conflict = conflictMeta;
    if (errorDetails) body.debug = errorDetails;

    res.status(statusCode).json(body);
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
