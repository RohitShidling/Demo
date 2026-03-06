const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ─────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────────
// CORS Configuration
// ─────────────────────────────────────────────────
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─────────────────────────────────────────────────
// Body Parsing Middleware
// ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────
// HTTP Request Logging
// ─────────────────────────────────────────────────
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ─────────────────────────────────────────────────
// Static File Serving
// ─────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────
app.use(config.api.prefix, routes);

// ─────────────────────────────────────────────────
// Root Endpoint
// ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MES Backend API',
        version: '2.0.0',
        endpoints: {
            health: `${config.api.prefix}/health`,
            auth: {
                register: `${config.api.prefix}/auth/register`,
                login: `${config.api.prefix}/auth/login`,
                logout: `${config.api.prefix}/auth/logout`,
                refresh: `${config.api.prefix}/auth/refresh`,
                profile: `${config.api.prefix}/auth/me`
            },
            machines: `${config.api.prefix}/machines`,
            ingest: `${config.api.prefix}/ingest/:pathId`
        }
    });
});

// ─────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────
app.use(notFoundHandler);

// ─────────────────────────────────────────────────
// Global Error Handler (must be last)
// ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
