const express = require('express');
const router = express.Router();

// Import all route modules
const businessAuthRoutes = require('./businessAuthRoutes');
const operatorAuthRoutes = require('./operatorAuthRoutes');
const machineRoutes = require('./machineRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const alertRoutes = require('./alertRoutes');
const workflowRoutes = require('./workflowRoutes');
const operatorRoutes = require('./operatorRoutes');
const productionRoutes = require('./productionRoutes');
const checklistRoutes = require('./checklistRoutes');
const shiftRoutes = require('./shiftRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const qualityRoutes = require('./qualityRoutes');
const schedulingRoutes = require('./schedulingRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');
const auditLogRoutes = require('./auditLogRoutes');

// ─────────────────────────────────────────────────
// Business Auth Routes: /api/business/auth/*
// ─────────────────────────────────────────────────
router.use('/business/auth', businessAuthRoutes);

// ─────────────────────────────────────────────────
// Operator Auth Routes: /api/operator/auth/*
// ─────────────────────────────────────────────────
router.use('/operator/auth', operatorAuthRoutes);

// ─────────────────────────────────────────────────
// Machine Routes: /api/machines/*, /api/ingest/*
// ─────────────────────────────────────────────────
router.use('/', machineRoutes);

// ─────────────────────────────────────────────────
// Work Order Routes: /api/work-orders/*
// ─────────────────────────────────────────────────
router.use('/work-orders', workOrderRoutes);

// ─────────────────────────────────────────────────
// Alert Routes: /api/alerts/*
// ─────────────────────────────────────────────────
router.use('/alerts', alertRoutes);

// ─────────────────────────────────────────────────
// Workflow Routes: /api/workflows/*
// ─────────────────────────────────────────────────
router.use('/workflows', workflowRoutes);

// ─────────────────────────────────────────────────
// Operator Routes: /api/operator/*
// ─────────────────────────────────────────────────
router.use('/operator', operatorRoutes);

// ─────────────────────────────────────────────────
// Production Routes: /api/production/*
// ─────────────────────────────────────────────────
router.use('/production', productionRoutes);

// ─────────────────────────────────────────────────
// Machine Checklist Routes: /api/checklist/*
// ─────────────────────────────────────────────────
router.use('/checklist', checklistRoutes);

// ─────────────────────────────────────────────────
// Shift Routes: /api/shifts/*
// ─────────────────────────────────────────────────
router.use('/shifts', shiftRoutes);

// ─────────────────────────────────────────────────
// Inventory Routes: /api/inventory/*
// ─────────────────────────────────────────────────
router.use('/inventory', inventoryRoutes);

// ─────────────────────────────────────────────────
// Quality Routes: /api/quality/*
// ─────────────────────────────────────────────────
router.use('/quality', qualityRoutes);

// ─────────────────────────────────────────────────
// Scheduling Routes: /api/scheduling/*
// ─────────────────────────────────────────────────
router.use('/scheduling', schedulingRoutes);

// ─────────────────────────────────────────────────
// Dashboard Routes: /api/dashboard/*
// ─────────────────────────────────────────────────
router.use('/dashboard', dashboardRoutes);

// ─────────────────────────────────────────────────
// Notification Routes: /api/notifications/*
// ─────────────────────────────────────────────────
router.use('/notifications', notificationRoutes);

// ─────────────────────────────────────────────────
// Audit Log Routes: /api/audit-logs/*
// ─────────────────────────────────────────────────
router.use('/audit-logs', auditLogRoutes);

// ─────────────────────────────────────────────────
// Health Check (public, no auth required)
// ─────────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API v4 - Full MES System',
        timestamp: new Date().toISOString(),
        features: [
            'Business Auth (Admin)',
            'Operator Auth',
            'Machine Management',
            'Machine Checklist',
            'Work Orders',
            'Workflows',
            'Production Tracking (Single Source of Truth)',
            'OEE Monitoring',
            'Shift Management',
            'Downtime Analytics',
            'Inventory Management',
            'Quality Inspections',
            'Production Scheduling',
            'Business Dashboard',
            'Notifications',
            'Audit Logs',
            'Part Rejections',
            'Machine Breakdowns',
            'Operator Skills',
            'Machine-Operator Assignment',
            'Alerts System',
            'Real-time Socket.IO'
        ]
    });
});

module.exports = router;
