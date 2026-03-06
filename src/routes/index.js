const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const machineRoutes = require('./machineRoutes');

// ─────────────────────────────────────────────────
// Auth Routes: /api/auth/*
// ─────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─────────────────────────────────────────────────
// Machine Routes: /api/machines/*, /api/ingest/*
// ─────────────────────────────────────────────────
router.use('/', machineRoutes);

// ─────────────────────────────────────────────────
// Health Check (public, no auth required)
// ─────────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API v2',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
