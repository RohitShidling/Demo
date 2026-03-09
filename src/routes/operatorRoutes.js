const express = require('express');
const router = express.Router();
const OperatorController = require('../controllers/OperatorController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Machine Status Checklist
router.get('/checklist', OperatorController.getMachineChecklist);
router.post('/checklist/update', OperatorController.updateMachineStatus);

// Part Rejections
router.post('/rejections', OperatorController.uploadRejection);
router.get('/rejections', OperatorController.getAllRejections);
router.get('/rejections/machine/:machineId', OperatorController.getRejectionsByMachine);

// Operator Skills
router.post('/skills', OperatorController.updateSkills);
router.get('/skills/me', OperatorController.getMySkills);
router.get('/skills', OperatorController.getAllSkills);

// Machine-Operator Assignment
router.post('/assign', OperatorController.assignToMachine);
router.delete('/assign/:machineId', OperatorController.unassignFromMachine);
router.get('/my-machines', OperatorController.getMyMachines);
router.get('/machine-operators/:machineId', OperatorController.getMachineOperators);
router.get('/assignments', OperatorController.getAllAssignments);

// Machine Breakdowns
router.post('/breakdowns', OperatorController.reportBreakdown);
router.patch('/breakdowns/:breakdownId/status', OperatorController.updateBreakdownStatus);
router.get('/breakdowns/machine/:machineId', OperatorController.getBreakdownsByMachine);
router.get('/breakdowns/active', OperatorController.getActiveBreakdowns);
router.get('/breakdowns', OperatorController.getAllBreakdowns);

module.exports = router;
