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
    secret: process.env.JWT_SECRET || 'default_jwt_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_change_me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2d'
  },

  // Business (Admin) JWT — dedicated secrets
  businessJwt: {
    secret: process.env.BUSINESS_JWT_SECRET || 'mes_business_admin_jwt_2026_xB9kQ3mN7pL2wR5',
    expiresIn: process.env.BUSINESS_JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.BUSINESS_JWT_REFRESH_SECRET || 'mes_business_refresh_2026_zA4vD8nF6jH1cT3',
    refreshExpiresIn: process.env.BUSINESS_JWT_REFRESH_EXPIRES_IN || '2d'
  },

  // Operator JWT — dedicated secrets
  operatorJwt: {
    secret: process.env.OPERATOR_JWT_SECRET || 'mes_operator_jwt_2026_yE5rS2tG9kM4bW7',
    expiresIn: process.env.OPERATOR_JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.OPERATOR_JWT_REFRESH_SECRET || 'mes_operator_refresh_2026_uP6qC1fJ3nX8hV0',
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
  logLevel: process.env.LOG_LEVEL || 'debug'
};
