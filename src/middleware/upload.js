const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const { ERROR_MESSAGES } = require('../utils/constants');

// Ensure upload directory exists
const uploadDir = config.upload.uploadDir;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const machineId = req.params.machineId || req.body.machineId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${machineId}-${timestamp}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = config.upload.allowedFileTypes;

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.upload.maxFileSize
    },
    fileFilter: fileFilter
});

module.exports = upload;
