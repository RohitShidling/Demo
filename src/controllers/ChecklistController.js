const ChecklistService = require('../services/checklistService');
const multer = require('multer');
const config = require('../config/env');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSize } });

// GET /api/checklist - Get all checklists (grouped by machine)
exports.getAllChecklists = async (req, res, next) => {
    try {
        const data = await ChecklistService.getAllChecklists();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/checklist/summary - Get checklist summary for all machines
exports.getChecklistSummary = async (req, res, next) => {
    try {
        const data = await ChecklistService.getChecklistSummary();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/checklist/item/:itemId - Get single checklist item
exports.getChecklistItem = async (req, res, next) => {
    try {
        const data = await ChecklistService.getChecklistItemById(parseInt(req.params.itemId));
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/checklist/:machineId - Get checklist by machine ID
exports.getChecklist = async (req, res, next) => {
    try {
        const data = await ChecklistService.getChecklistByMachineId(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// POST /api/checklist/:machineId - Create checklist item (with optional image upload)
exports.createChecklistItem = [
    upload.single('image'),
    async (req, res, next) => {
        try {
            const { checkpoint, description, specification, method, timing, status, comments, sort_order } = req.body;
            if (!checkpoint) {
                return res.status(400).json({ success: false, message: 'checkpoint is required' });
            }

            const image = req.file ? req.file.buffer : null;

            const result = await ChecklistService.createChecklistItem({
                machine_id: req.params.machineId,
                checkpoint,
                description,
                specification,
                method,
                image,
                timing,
                status,
                comments,
                checked_by: req.user?.id,
                sort_order: sort_order !== undefined ? parseInt(sort_order) : undefined
            });
            res.status(201).json({ success: true, data: result });
        } catch (error) { next(error); }
    }
];

// PUT /api/checklist/item/:itemId - Update checklist item
exports.updateChecklistItem = [
    upload.single('image'),
    async (req, res, next) => {
        try {
            const updates = { ...req.body };
            if (req.file) {
                updates.image = req.file.buffer;
            }
            updates.checked_by = req.user?.id;
            if (updates.sort_order !== undefined) {
                updates.sort_order = parseInt(updates.sort_order);
            }

            const result = await ChecklistService.updateChecklistItem(parseInt(req.params.itemId), updates);
            res.json({ success: true, data: result });
        } catch (error) { next(error); }
    }
];

// DELETE /api/checklist/item/:itemId - Delete checklist item
exports.deleteChecklistItem = async (req, res, next) => {
    try {
        await ChecklistService.deleteChecklistItem(parseInt(req.params.itemId));
        res.json({ success: true, message: 'Checklist item deleted' });
    } catch (error) { next(error); }
};

// POST /api/checklist/:machineId/bulk - Bulk create checklist items
exports.bulkCreateChecklist = async (req, res, next) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'items array is required' });
        }
        const result = await ChecklistService.bulkCreateChecklist(req.params.machineId, items);
        res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// PUT /api/checklist/:machineId/reorder - Reorder checklist items
exports.reorderChecklist = async (req, res, next) => {
    try {
        const { ordered_ids } = req.body;
        if (!ordered_ids || !Array.isArray(ordered_ids) || ordered_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ordered_ids array is required' });
        }
        const result = await ChecklistService.reorderChecklist(req.params.machineId, ordered_ids);
        res.json({ success: true, message: 'Checklist reordered successfully', data: result });
    } catch (error) { next(error); }
};
