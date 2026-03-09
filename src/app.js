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

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Static File Serving
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use(config.api.prefix, routes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MES Backend API v3 - Manufacturing Execution System',
        version: '3.0.0',
        endpoints: {
            health: `${config.api.prefix}/health`,
            business_auth: {
                register: `${config.api.prefix}/business/auth/register`,
                login: `${config.api.prefix}/business/auth/login`,
                logout: `${config.api.prefix}/business/auth/logout`,
                profile: `${config.api.prefix}/business/auth/me`
            },
            operator_auth: {
                register: `${config.api.prefix}/operator/auth/register`,
                login: `${config.api.prefix}/operator/auth/login`,
                logout: `${config.api.prefix}/operator/auth/logout`,
                profile: `${config.api.prefix}/operator/auth/me`
            },
            machines: `${config.api.prefix}/machines`,
            work_orders: `${config.api.prefix}/work-orders`,
            workflows: `${config.api.prefix}/workflows/:workOrderId`,
            alerts: `${config.api.prefix}/alerts`,
            operator: {
                checklist: `${config.api.prefix}/operator/checklist`,
                rejections: `${config.api.prefix}/operator/rejections`,
                skills: `${config.api.prefix}/operator/skills`,
                assignments: `${config.api.prefix}/operator/assignments`,
                breakdowns: `${config.api.prefix}/operator/breakdowns`
            }
        }
    });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
