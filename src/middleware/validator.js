const { body, param, validationResult } = require('express-validator');

/**
 * Validation result handler
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Validation rules for creating a machine
 */
const validateCreateMachine = [
    body('machine_id')
        .trim()
        .notEmpty()
        .withMessage('Machine ID is required'),
    body('machine_image')
        .optional(),
    body('start_time')
        .optional(),
    body('count')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Count must be a non-negative integer'),
    body('end_time')
        .optional(),
    handleValidationErrors
];

/**
 * Validation rules for updating a machine
 */
const validateUpdateMachine = [
    body('machine_image')
        .optional(),
    body('start_time')
        .optional(),
    body('count')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Count must be a non-negative integer'),
    body('end_time')
        .optional(),
    handleValidationErrors
];

/**
 * Validation rules for machine ID parameter
 */
const validateMachineId = [
    param('machine_id')
        .trim()
        .notEmpty()
        .withMessage('Machine ID is required'),
    handleValidationErrors
];

module.exports = {
    validateCreateMachine,
    validateUpdateMachine,
    validateMachineId
};
