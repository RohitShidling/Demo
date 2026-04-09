const OperatorService = require('../services/operatorService');
const multer = require('multer');
const config = require('../config/env');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSize } });

const getIO = (req) => {
    const io = req.app.get('io');
    return io ? io.of('/machines') : null;
};

// ── Machine Status Checklist ──
exports.getMachineChecklist = async (req, res, next) => {
    try {
        const data = await OperatorService.getMachineChecklist();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.updateMachineStatus = async (req, res, next) => {
    try {
        const { machine_id, status } = req.body;
        if (!machine_id || !status) return res.status(400).json({ success: false, message: 'machine_id and status required' });
        const result = await OperatorService.updateMachineStatus(machine_id, status);
        res.json({ success: true, data: result });

        const ns = getIO(req);
        if (ns) ns.emit('machine:status_changed', { machine_id, status, changed_by: req.user.username, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

// ── Part Rejection ──
exports.uploadRejection = [
    upload.single('part_image'),
    async (req, res, next) => {
        try {
            const { machine_id, work_order_id, rejection_reason, rework_reason, part_description, supervisor_name, rejected_count } = req.body;
            if (!machine_id || !rejection_reason) {
                return res.status(400).json({ success: false, message: 'machine_id and rejection_reason required' });
            }
            const part_image = req.file ? req.file.buffer : null;
            const result = await OperatorService.reportRejection({
                machine_id, work_order_id, operator_id: req.user.id,
                rejection_reason, rework_reason, part_description, supervisor_name,
                part_image, rejected_count: parseInt(rejected_count) || 1
            });
            res.status(201).json({ success: true, data: result });

            const ns = getIO(req);
            if (ns) ns.emit('rejection:reported', { machine_id, work_order_id, operator: req.user.username, timestamp: new Date().toISOString() });
        } catch (error) { next(error); }
    }
];

exports.getRejectionsByMachine = async (req, res, next) => {
    try {
        const data = await OperatorService.getRejectionsByMachine(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getAllRejections = async (req, res, next) => {
    try {
        const data = await OperatorService.getAllRejections();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// ── Operator Skills ──
exports.updateSkills = async (req, res, next) => {
    try {
        const { operator_name, skill_set } = req.body;
        if (!operator_name || !skill_set) return res.status(400).json({ success: false, message: 'operator_name and skill_set required' });
        const data = await OperatorService.updateSkills({ operator_id: req.user.id, operator_name, skill_set });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMySkills = async (req, res, next) => {
    try {
        const data = await OperatorService.getSkills(req.user.id);
        res.json({ success: true, data: data || {} });
    } catch (error) { next(error); }
};

exports.getAllSkills = async (req, res, next) => {
    try {
        const data = await OperatorService.getAllSkills();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// ── Machine-Operator Assignment ──
exports.assignToMachine = async (req, res, next) => {
    try {
        const { machine_id, mentor_name } = req.body;
        if (!machine_id) return res.status(400).json({ success: false, message: 'machine_id required' });
        const data = await OperatorService.assignToMachine({ machine_id, operator_id: req.user.id, mentor_name });
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.unassignFromMachine = async (req, res, next) => {
    try {
        await OperatorService.unassignFromMachine(req.params.machineId, req.user.id);
        res.json({ success: true, message: 'Unassigned from machine' });
    } catch (error) { next(error); }
};

exports.getMyMachines = async (req, res, next) => {
    try {
        const data = await OperatorService.getOperatorMachines(req.user.id);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getMachineOperators = async (req, res, next) => {
    try {
        const data = await OperatorService.getMachineOperators(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getAllAssignments = async (req, res, next) => {
    try {
        const data = await OperatorService.getAllAssignments();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// ── Machine Breakdown ──
exports.reportBreakdown = async (req, res, next) => {
    try {
        const { machine_id, problem_description, severity } = req.body;
        if (!machine_id || !problem_description) {
            return res.status(400).json({ success: false, message: 'machine_id and problem_description required' });
        }
        const data = await OperatorService.reportBreakdown({ machine_id, operator_id: req.user.id, problem_description, severity });
        res.status(201).json({ success: true, data });

        const ns = getIO(req);
        if (ns) ns.emit('breakdown:reported', { data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.updateBreakdownStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'status required' });
        const data = await OperatorService.updateBreakdownStatus(parseInt(req.params.breakdownId), status);
        res.json({ success: true, data });

        const ns = getIO(req);
        if (ns) ns.emit('breakdown:updated', { data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
};

exports.getBreakdownsByMachine = async (req, res, next) => {
    try {
        const data = await OperatorService.getBreakdownsByMachine(req.params.machineId);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getActiveBreakdowns = async (req, res, next) => {
    try {
        const data = await OperatorService.getActiveBreakdowns();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

exports.getAllBreakdowns = async (req, res, next) => {
    try {
        const data = await OperatorService.getAllBreakdowns();
        res.json({ success: true, data });
    } catch (error) { next(error); }
};
