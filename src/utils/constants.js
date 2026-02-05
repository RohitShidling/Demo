/**
 * Machine Status Constants
 */
const MACHINE_STATUS = {
    IDLE: 'idle',
    RUNNING: 'running',
    STOPPED: 'stopped',
    MAINTENANCE: 'maintenance'
};

/**
 * Execution Event Type Constants
 */
const EVENT_TYPE = {
    START: 'start',
    STOP: 'stop'
};

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

/**
 * Error Messages
 */
const ERROR_MESSAGES = {
    MACHINE_NOT_FOUND: 'Machine not found',
    MACHINE_ALREADY_EXISTS: 'Machine with this ID already exists',
    MACHINE_ALREADY_RUNNING: 'Machine is already running',
    MACHINE_NOT_RUNNING: 'Machine is not currently running',
    INVALID_MACHINE_ID: 'Invalid machine ID',
    INVALID_FILE_TYPE: 'Invalid file type. Only images are allowed',
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    INVALID_PRODUCTION_COUNT: 'Invalid production count',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    DATABASE_ERROR: 'Database operation failed',
    INTERNAL_ERROR: 'Internal server error'
};

/**
 * Success Messages
 */
const SUCCESS_MESSAGES = {
    MACHINE_CREATED: 'Machine created successfully',
    MACHINE_UPDATED: 'Machine updated successfully',
    MACHINE_STARTED: 'Machine started successfully',
    MACHINE_STOPPED: 'Machine stopped successfully',
    PRODUCTION_UPDATED: 'Production count updated successfully',
    IMAGE_UPLOADED: 'Machine image uploaded successfully'
};

module.exports = {
    MACHINE_STATUS,
    EVENT_TYPE,
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
};
