const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/checklist - Get all checklists grouped by machine
router.get('/', ChecklistController.getAllChecklists);

// GET /api/checklist/summary - Get checklist summary for all machines
router.get('/summary', ChecklistController.getChecklistSummary);

// GET /api/checklist/item/:itemId - Get single checklist item by ID
router.get('/item/:itemId', ChecklistController.getChecklistItem);

// GET /api/checklist/:machineId - Get checklist by machine ID
router.get('/:machineId', ChecklistController.getChecklist);

// POST /api/checklist/:machineId - Create checklist item with optional image
router.post('/:machineId', ChecklistController.createChecklistItem);

// POST /api/checklist/:machineId/bulk - Bulk create checklist items
router.post('/:machineId/bulk', ChecklistController.bulkCreateChecklist);

// PUT /api/checklist/:machineId/reorder - Reorder checklist items for a machine
router.put('/:machineId/reorder', ChecklistController.reorderChecklist);

// PUT /api/checklist/item/:itemId - Update checklist item
router.put('/item/:itemId', ChecklistController.updateChecklistItem);

// DELETE /api/checklist/item/:itemId - Delete checklist item
router.delete('/item/:itemId', ChecklistController.deleteChecklistItem);

module.exports = router;
