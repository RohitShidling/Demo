const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /api/inventory/materials - Add material
router.post('/materials', InventoryController.addMaterial);

// GET /api/inventory/materials - Get all materials
router.get('/materials', InventoryController.getMaterials);

// POST /api/inventory/consume - Consume material
router.post('/consume', InventoryController.consumeMaterial);

module.exports = router;
