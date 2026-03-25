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

// Body Parsing – explicitly skip multipart/form-data so multer can handle it
app.use(express.json({ limit: '10mb', type: 'application/json' }));
app.use(express.urlencoded({ extended: true, type: 'application/x-www-form-urlencoded' }));

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
        message: 'MES Backend API v4 - Manufacturing Execution System',
        version: '4.0.0',
        endpoints: {
            health: `${config.api.prefix}/health`,
            business_auth: {
                register: `${config.api.prefix}/business/auth/register  [POST: username, email, password]`,
                login: `${config.api.prefix}/business/auth/login`,
                logout: `${config.api.prefix}/business/auth/logout`,
                profile: `${config.api.prefix}/business/auth/me`
            },
            operator_auth: {
                register: `${config.api.prefix}/operator/auth/register  [POST: username, email, password]`,
                login: `${config.api.prefix}/operator/auth/login`,
                logout: `${config.api.prefix}/operator/auth/logout`,
                profile: `${config.api.prefix}/operator/auth/me`
            },
            machines: `${config.api.prefix}/machines`,
            machine_oee: `${config.api.prefix}/machines/:machineId/oee`,
            machine_oee_history: `${config.api.prefix}/machines/:machineId/oee/history`,
            machine_downtime: `${config.api.prefix}/machines/:machineId/downtime-analysis`,
            work_orders: `${config.api.prefix}/work-orders`,
            production_summary: `${config.api.prefix}/work-orders/:id/production-summary`,
            machine_production: `${config.api.prefix}/work-orders/:id/machine-production`,
            production: {
                record: `${config.api.prefix}/production`,
                ingest: `${config.api.prefix}/production/ingest`
            },
            checklist: `${config.api.prefix}/checklist/:machineId`,
            workflows: `${config.api.prefix}/workflows/:workOrderId`,
            shifts: {
                manage: `${config.api.prefix}/shifts`,
                assign: `${config.api.prefix}/shifts/assign`,
                current: `${config.api.prefix}/shifts/current`,
                performance: `${config.api.prefix}/shifts/:shiftId/performance`
            },
            inventory: {
                materials: `${config.api.prefix}/inventory/materials`,
                consume: `${config.api.prefix}/inventory/consume`
            },
            quality: {
                inspection: `${config.api.prefix}/quality/inspection`,
                reports: `${config.api.prefix}/quality/reports`
            },
            scheduling: {
                plan: `${config.api.prefix}/scheduling/plan`,
                list: `${config.api.prefix}/scheduling`
            },
            dashboard: {
                overview: `${config.api.prefix}/dashboard/overview`,
                work_orders: `${config.api.prefix}/dashboard/work-orders`
            },
            notifications: `${config.api.prefix}/notifications`,
            audit_logs: `${config.api.prefix}/audit-logs`,
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
