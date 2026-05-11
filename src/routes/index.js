const express = require('express');
const router = express.Router();

// Import all route modules
const businessAuthRoutes = require('./businessAuthRoutes');
const operatorAuthRoutes = require('./operatorAuthRoutes');
const authRoutes = require('./authRoutes');
const machineRoutes = require('./machineRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const alertRoutes = require('./alertRoutes');
const workflowRoutes = require('./workflowRoutes');
const operatorRoutes = require('./operatorRoutes');
const productionRoutes = require('./productionRoutes');
const checklistRoutes = require('./checklistRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');
// Business Auth Routes: /api/business/auth/*
router.use('/business/auth', businessAuthRoutes);

// Operator Auth Routes: /api/operator/auth/*
router.use('/operator/auth', operatorAuthRoutes);

// Generic Auth Routes: /api/auth/*
router.use('/auth', authRoutes);

// Machine Routes: /api/machines/*, /api/ingest/*
router.use('/', machineRoutes);

// Work Order Routes: /api/work-orders/*
router.use('/work-orders', workOrderRoutes);

// Alert Routes: /api/alerts/*
router.use('/alerts', alertRoutes);

// Workflow Routes: /api/workflows/*
router.use('/workflows', workflowRoutes);

// Operator Routes: /api/operator/*
router.use('/operator', operatorRoutes);

// Production Routes: /api/production/*
router.use('/production', productionRoutes);

// Machine Checklist Routes: /api/checklist/*
router.use('/checklist', checklistRoutes);

// Dashboard Routes: /api/dashboard/*
router.use('/dashboard', dashboardRoutes);

// Notification Routes: /api/notifications/*
router.use('/notifications', notificationRoutes);

// Health Check (public, no auth required)
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API v5 - Full MES System',
        timestamp: new Date().toISOString(),
        features: [
            'Business Auth (Admin) — dedicated JWT',
            'Operator Auth — dedicated JWT',
            'Email OTP Registration/Login',
            'Machine Management',
            'Machine Checklist',
            'Work Orders with Targeted End Date',
            'Machine Stage Ordering (Operator-assigned)',
            'Machine Double-Assignment Prevention',
            'Workflows',
            'Production Tracking',
            'Downtime Analytics',
            'Business Dashboard',
            'Notifications (CRUD + Delete)',
            'Part Rejections',
            'Machine Breakdowns → Auto Notifications',
            'Operator Skills',
            'Machine-Operator Assignment',
            'Alerts System',
            'Machine Production & Rejection Count APIs',
            'Machine Checklist Overview API',
            'Machine Running Status API',
            'Bar Graph Visualization (Hourly, Daily & Monthly)',
            'Real-time Socket.IO',
        ]
    });
});

module.exports = router;
