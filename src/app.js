const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
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

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
        .swagger-ui .topbar { background-color: #1a1a2e; }
        .swagger-ui .topbar .download-url-wrapper .select-label select { border-color: #e94560; }
        .swagger-ui .info .title { color: #1a1a2e; }
        .swagger-ui .btn.execute { background-color: #e94560; border-color: #e94560; }
        .swagger-ui .btn.execute:hover { background-color: #c73e54; }
        .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #0f3460; }
        .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #16213e; }
    `,
    customSiteTitle: 'MES API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        docExpansion: 'none',
        tagsSorter: 'alpha'
    }
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// API Routes
app.use(config.api.prefix, routes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MES Backend API v4 - Manufacturing Execution System',
        version: '4.0.0',
        api_documentation: '/api-docs',
        endpoints: {
            health: `${config.api.prefix}/health`,
            api_docs: '/api-docs',
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
            checklist: {
                all: `${config.api.prefix}/checklist`,
                summary: `${config.api.prefix}/checklist/summary`,
                by_machine: `${config.api.prefix}/checklist/:machineId`,
                single_item: `${config.api.prefix}/checklist/item/:itemId`,
                create: `${config.api.prefix}/checklist/:machineId [POST]`,
                bulk_create: `${config.api.prefix}/checklist/:machineId/bulk [POST]`,
                reorder: `${config.api.prefix}/checklist/:machineId/reorder [PUT]`,
                update_item: `${config.api.prefix}/checklist/item/:itemId [PUT]`,
                delete_item: `${config.api.prefix}/checklist/item/:itemId [DELETE]`
            },
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
