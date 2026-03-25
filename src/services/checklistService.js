const MachineChecklistModel = require('../models/MachineChecklist');
const MachineModel = require('../models/Machine');
const logger = require('../utils/logger');

class ChecklistService {
    // Get checklist by machine ID
    async getChecklistByMachineId(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const checklist = await MachineChecklistModel.findByMachineId(machine_id);
        const lastSavedOn = await MachineChecklistModel.getLastSavedOn(machine_id);

        return {
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            last_saved_on: lastSavedOn,
            checklist_items: checklist
        };
    }

    // Create checklist item
    async createChecklistItem({ machine_id, checkpoint, description, specification, method, image, timing, status, comments, checked_by }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const id = await MachineChecklistModel.create({
            machine_id, checkpoint, description, specification, method,
            image, timing, status, comments, checked_by
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
        for (const item of items) {
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
                checked_by: item.checked_by
            });
            results.push(id);
        }

        logger.info(`${results.length} checklist items created for machine ${machine_id}`);
        return await MachineChecklistModel.findByMachineId(machine_id);
    }
}

module.exports = new ChecklistService();
