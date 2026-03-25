const express = require('express');
const router = express.Router();
const AuditLogController = require('../controllers/AuditLogController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/audit-logs - Get audit logs
router.get('/', AuditLogController.getLogs);

module.exports = router;
