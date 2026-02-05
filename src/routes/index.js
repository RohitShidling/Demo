const express = require('express');
const router = express.Router();
const productionRoutes = require('./productionRoutes');

/**
 * Mount route modules
 */
router.use('/production', productionRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MES Backend API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
