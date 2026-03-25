const AuditLogModel = require('../models/AuditLog');

// GET /api/audit-logs
exports.getLogs = async (req, res, next) => {
    try {
        const { limit, offset, entity_type, entity_id } = req.query;
        let data;
        if (entity_type && entity_id) {
            data = await AuditLogModel.findByEntity(entity_type, entity_id);
        } else {
            data = await AuditLogModel.findAll(parseInt(limit) || 100, parseInt(offset) || 0);
        }
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
