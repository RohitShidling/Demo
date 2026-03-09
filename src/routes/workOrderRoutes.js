const express = require('express');
const router = express.Router();
const WorkOrderController = require('../controllers/WorkOrderController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// CRUD
router.post('/', WorkOrderController.createWorkOrder);
router.get('/', WorkOrderController.getAllWorkOrders);
router.get('/:workOrderId', WorkOrderController.getWorkOrderById);
router.put('/:workOrderId', WorkOrderController.updateWorkOrder);
router.delete('/:workOrderId', WorkOrderController.deleteWorkOrder);

// Machine assignment
router.post('/:workOrderId/machines', WorkOrderController.assignMachine);
router.delete('/:workOrderId/machines/:machineId', WorkOrderController.unassignMachine);
router.get('/:workOrderId/machines', WorkOrderController.getWorkOrderMachines);

// Rejections per work order
router.get('/:workOrderId/rejections', WorkOrderController.getWorkOrderRejections);

module.exports = router;
