const InventoryModel = require('../models/Inventory');

// POST /api/inventory/materials
exports.addMaterial = async (req, res, next) => {
    try {
        const { material_name, quantity, unit } = req.body;
        if (!material_name) {
            return res.status(400).json({ success: false, message: 'material_name is required' });
        }
        const id = await InventoryModel.addMaterial({ material_name, quantity: parseFloat(quantity) || 0, unit: unit || 'pcs' });
        const material = await InventoryModel.findMaterialById(id);
        res.status(201).json({ success: true, data: material });
    } catch (error) { next(error); }
};

// POST /api/inventory/consume
exports.consumeMaterial = async (req, res, next) => {
    try {
        const { material_id, work_order_id, quantity_used } = req.body;
        if (!material_id || !quantity_used) {
            return res.status(400).json({ success: false, message: 'material_id and quantity_used are required' });
        }

        const material = await InventoryModel.findMaterialById(material_id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }
        if (material.quantity < quantity_used) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        const id = await InventoryModel.consumeMaterial({
            material_id: parseInt(material_id),
            work_order_id,
            quantity_used: parseFloat(quantity_used)
        });
        res.json({ success: true, message: 'Material consumed', data: { consumption_id: id } });
    } catch (error) { next(error); }
};

// GET /api/inventory/materials
exports.getMaterials = async (req, res, next) => {
    try {
        const data = await InventoryModel.findAllMaterials();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
