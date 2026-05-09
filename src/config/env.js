require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MySQL Database
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mes_production',
    port: parseInt(process.env.DB_PORT) || 3306
  },

  // JWT Authentication (shared fallback)
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2d'
  },

  // Business (Admin) JWT — dedicated secrets
  businessJwt: {
    secret: process.env.BUSINESS_JWT_SECRET || '',
    expiresIn: process.env.BUSINESS_JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.BUSINESS_JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.BUSINESS_JWT_REFRESH_EXPIRES_IN || '2d'
  },

  // Operator JWT — dedicated secrets
  operatorJwt: {
    secret: process.env.OPERATOR_JWT_SECRET || '',
    expiresIn: process.env.OPERATOR_JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.OPERATOR_JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.OPERATOR_JWT_REFRESH_EXPIRES_IN || '2d'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  // File Uploads
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/jpg'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads/machine-images'
  },

  // API
  api: {
    prefix: process.env.API_PREFIX || '/api'
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // SMTP / Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10)
  }
};
