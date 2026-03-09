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
// Health Check (public, no auth required)
// ─────────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API v3 - Full MES System',
        timestamp: new Date().toISOString(),
        features: [
            'Business Auth (Admin)',
            'Operator Auth',
            'Machine Management',
            'Work Orders',
            'Workflows',
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
