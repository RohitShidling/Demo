const express = require('express');
const router = express.Router();
const machineRoutes = require('./machineRoutes');

// Mount all machine related routes at root /api (or keep nested?)
// Config says prefix is /api.
// Current routes in machineRoutes:
// POST /machines
// POST /ingest/:pathId
// GET /machines/:id/dashboard...

router.use('/', machineRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API v2',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
