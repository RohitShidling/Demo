const express = require('express');
const router = express.Router();
const WorkflowController = require('../controllers/WorkflowController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:workOrderId', WorkflowController.getWorkflow);
router.post('/:workOrderId/steps', WorkflowController.addStep);
router.post('/:workOrderId/steps/bulk', WorkflowController.addBulkSteps);
router.put('/steps/:stepId', WorkflowController.updateStep);
router.patch('/steps/:stepId/status', WorkflowController.updateStepStatus);
router.delete('/steps/:stepId', WorkflowController.deleteStep);

module.exports = router;
