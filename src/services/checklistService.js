const MachineChecklistModel = require('../models/MachineChecklist');
const MachineModel = require('../models/Machine');
const logger = require('../utils/logger');

class ChecklistService {
    // Get checklist by machine ID (ordered)
    async getChecklistByMachineId(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const checklist = await MachineChecklistModel.findByMachineId(machine_id);
        const lastSavedOn = await MachineChecklistModel.getLastSavedOn(machine_id);

        return {
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            last_saved_on: lastSavedOn,
            total_items: checklist.length,
            completed_items: checklist.filter(i => i.status === 'OK').length,
            pending_items: checklist.filter(i => i.status === 'PENDING').length,
            checklist_items: checklist
        };
    }

    // Get all checklists (grouped by machine)
    async getAllChecklists() {
        const allItems = await MachineChecklistModel.findAll();

        // Group by machine
        const machineMap = {};
        for (const item of allItems) {
            if (!machineMap[item.machine_id]) {
                machineMap[item.machine_id] = {
                    machine_id: item.machine_id,
                    machine_name: item.machine_name,
                    checklist_items: []
                };
            }
            machineMap[item.machine_id].checklist_items.push(item);
        }

        return Object.values(machineMap);
    }

    // Get checklist summary for all machines
    async getChecklistSummary() {
        return await MachineChecklistModel.getChecklistSummaryByMachine();
    }

    // Create checklist item
    async createChecklistItem({ machine_id, checkpoint, description, specification, method, image, timing, status, comments, checked_by, sort_order }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const id = await MachineChecklistModel.create({
            machine_id, checkpoint, description, specification, method,
            image, timing, status, comments, checked_by, sort_order
        });

        logger.info(`Checklist item created for machine ${machine_id}: ${checkpoint}`);
        return await MachineChecklistModel.findById(id);
    }

    // Update checklist item
    async updateChecklistItem(id, updates) {
        const item = await MachineChecklistModel.findById(id);
        if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }

        await MachineChecklistModel.update(id, updates);
        logger.info(`Checklist item ${id} updated`);
        return await MachineChecklistModel.findById(id);
    }

    // Delete checklist item
    async deleteChecklistItem(id) {
        const item = await MachineChecklistModel.findById(id);
        if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }

        await MachineChecklistModel.delete(id);
        logger.info(`Checklist item ${id} deleted`);
    }

    // Bulk create checklist items
    async bulkCreateChecklist(machine_id, items) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const results = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const id = await MachineChecklistModel.create({
                machine_id,
                checkpoint: item.checkpoint,
                description: item.description,
                specification: item.specification,
                method: item.method,
                image: item.image ? Buffer.from(item.image, 'base64') : null,
                timing: item.timing,
                status: item.status || 'PENDING',
                comments: item.comments,
                checked_by: item.checked_by,
                sort_order: item.sort_order !== undefined ? item.sort_order : i + 1
            });
            results.push(id);
        }

        logger.info(`${results.length} checklist items created for machine ${machine_id}`);
        return await MachineChecklistModel.findByMachineId(machine_id);
    }

    // Reorder checklist items for a machine
    async reorderChecklist(machine_id, orderedIds) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
            const e = new Error('orderedIds array is required');
            e.statusCode = 400;
            throw e;
        }

        await MachineChecklistModel.reorder(machine_id, orderedIds);
        logger.info(`Checklist reordered for machine ${machine_id}: [${orderedIds.join(', ')}]`);
        return await MachineChecklistModel.findByMachineId(machine_id);
    }

    // Get single checklist item by ID
    async getChecklistItemById(id) {
        const item = await MachineChecklistModel.findById(id);
        if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }
        return item;
    }
}

module.exports = new ChecklistService();
