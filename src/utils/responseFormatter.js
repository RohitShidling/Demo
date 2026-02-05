const { HTTP_STATUS } = require('./constants');

/**
 * Format success response
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted response
 */
const successResponse = (message, data = null, statusCode = HTTP_STATUS.OK) => {
    const response = {
        success: true,
        message,
        statusCode
    };

    if (data !== null) {
        response.data = data;
    }

    return response;
};

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 * @returns {Object} Formatted error response
 */
const errorResponse = (message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
    const response = {
        success: false,
        message,
        statusCode
    };

    if (errors !== null) {
        response.errors = errors;
    }

    return response;
};

/**
 * Format pagination response
 * @param {Array} data - Data array
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Formatted pagination response
 */
const paginationResponse = (data, page, limit, total) => {
    return {
        success: true,
        data,
        pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit)
        },
        statusCode: HTTP_STATUS.OK
    };
};

module.exports = {
    successResponse,
    errorResponse,
    paginationResponse
};
