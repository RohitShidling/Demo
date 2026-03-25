const express = require('express');
const router = express.Router();
const WorkOrderController = require('../controllers/WorkOrderController');
const ProductionController = require('../controllers/ProductionController');
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

// Production Summary APIs (from production_logs single source of truth)
router.get('/:workOrderId/production-summary', ProductionController.getProductionSummary);
router.get('/:workOrderId/machine-production', ProductionController.getMachineProduction);
router.get('/:workOrderId/summary', ProductionController.getWorkOrderSummary);

module.exports = router;
