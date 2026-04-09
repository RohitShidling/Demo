const express = require('express');
const router = express.Router();
const WorkOrderController = require('../controllers/WorkOrderController');
const ProductionController = require('../controllers/ProductionController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ── Work Order CRUD ──
router.post('/', WorkOrderController.createWorkOrder);
router.get('/', WorkOrderController.getAllWorkOrders);
router.get('/:workOrderId', WorkOrderController.getWorkOrderById);
router.put('/:workOrderId', WorkOrderController.updateWorkOrder);
router.delete('/:workOrderId', WorkOrderController.deleteWorkOrder);

// ── Machine assignment & stage management ──
router.post('/:workOrderId/machines', WorkOrderController.assignMachine);
router.put('/:workOrderId/machines/:machineId/stage', WorkOrderController.updateMachineStage);
router.delete('/:workOrderId/machines/:machineId', WorkOrderController.unassignMachine);
router.get('/:workOrderId/machines', WorkOrderController.getWorkOrderMachines);

// ── Machine checklist & running status overview ──
router.get('/:workOrderId/checklist-overview', WorkOrderController.getChecklistOverview);
router.get('/:workOrderId/machine-status', WorkOrderController.getMachineRunningStatus);

// ── Rejections per work order ──
router.get('/:workOrderId/rejections', WorkOrderController.getWorkOrderRejections);
router.get('/:workOrderId/rejections/details', WorkOrderController.getWorkOrderRejectionDetails);
router.get('/:workOrderId/machines/:machineId/rejections', WorkOrderController.getMachineRejectionDetailsForWorkOrder);

// ── Production Summary APIs ──
router.get('/:workOrderId/production-summary', ProductionController.getProductionSummary);
router.get('/:workOrderId/machine-production', ProductionController.getMachineProduction);
router.get('/:workOrderId/summary', ProductionController.getWorkOrderSummary);

module.exports = router;
