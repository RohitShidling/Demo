const MachineChecklistModel = require('../models/MachineChecklist');
const MachineModel = require('../models/Machine');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

const CHECKLIST_ALLOWED_METHODS = ['VISUAL_BY_HAND', 'FUNCTIONAL_TEST', 'MEASUREMENT'];
const CHECKLIST_METHOD_ALIASES = {
    'visual by hand': 'VISUAL_BY_HAND',
    'visually by hand': 'VISUAL_BY_HAND',
    'visual inspection': 'VISUAL_BY_HAND',
    functional_test: 'FUNCTIONAL_TEST',
    'functional test': 'FUNCTIONAL_TEST',
    measurement: 'MEASUREMENT',
    'measurement check': 'MEASUREMENT'
};

const CHECKLIST_ALLOWED_STATUSES = ['PENDING', 'OK', 'NOT_OK', 'NA', 'DONE', 'NOT_DONE'];

class ChecklistService {
    async ensureMachineChecklistSeeded(machine_id) {
        const existing = await MachineChecklistModel.findByMachineId(machine_id);
        if (existing.length > 0) return existing;

        const machines = await MachineModel.findAll();
        const templateCandidates = machines
            .filter((m) => m.machine_id !== machine_id)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        let templateItems = [];
        for (const candidate of templateCandidates) {
            // Use first machine that has checklist template entries.
            // This keeps the checklist structure common across all machines.
            templateItems = await MachineChecklistModel.findByMachineId(candidate.machine_id);
            if (templateItems.length > 0) break;
        }

        if (!templateItems.length) return existing;

        for (const template of templateItems) {
            await MachineChecklistModel.create({
                machine_id,
                operator_name: null,
                cell_incharge_name: null,
                checkpoint: template.checkpoint,
                description: template.description,
                specification: template.specification,
                method: template.method,
                image: template.image ? Buffer.from(template.image, 'base64') : null,
                timing: template.timing,
                status: 'PENDING',
                comments: null,
                checked_by: null,
                sort_order: template.sort_order
            });
        }

        return await MachineChecklistModel.findByMachineId(machine_id);
    }

    async getTemplateMachineId() {
        const allMachines = await MachineModel.findAll();
        if (!allMachines.length) {
            const e = new Error('No machines found. Create at least one machine before configuring generic checklist');
            e.statusCode = 400;
            throw e;
        }

        // Use earliest created machine as checklist template source
        const ordered = [...allMachines].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return ordered[0].machine_id;
    }

    normalizeMethod(method) {
        if (method === undefined || method === null || method === '') return null;
        const raw = String(method).trim();
        const upper = raw.toUpperCase();

        if (CHECKLIST_ALLOWED_METHODS.includes(upper)) return upper;

        const aliasKey = raw.toLowerCase();
        if (CHECKLIST_METHOD_ALIASES[aliasKey]) return CHECKLIST_METHOD_ALIASES[aliasKey];

        const e = new Error(`Invalid method. Allowed methods: ${CHECKLIST_ALLOWED_METHODS.join(', ')}`);
        e.statusCode = 400;
        throw e;
    }

    normalizeStatus(status) {
        if (status === undefined || status === null || status === '') return 'PENDING';
        const normalized = String(status).trim().toUpperCase();
        if (!CHECKLIST_ALLOWED_STATUSES.includes(normalized)) {
            const e = new Error(`Invalid status. Allowed statuses: ${CHECKLIST_ALLOWED_STATUSES.join(', ')}`);
            e.statusCode = 400;
            throw e;
        }
        return normalized;
    }

    isChecklistItemFilled(status) {
        return String(status || '').toUpperCase() !== 'PENDING';
    }

    getCompletedCount(checklistItems) {
        return checklistItems.filter(i => this.isChecklistItemFilled(i.status)).length;
    }

    getChecklistStatus(checklistItems) {
        if (!checklistItems.length) return 'NOT_COMPLETED';
        const completed = this.getCompletedCount(checklistItems);
        return completed === checklistItems.length ? 'COMPLETED' : 'NOT_COMPLETED';
    }

    // Get checklist by machine ID (ordered)
    async getChecklistByMachineId(machine_id) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const checklist = await this.ensureMachineChecklistSeeded(machine_id);
        const lastSavedOn = await MachineChecklistModel.getLastSavedOn(machine_id);
        const checklistLoadedAt = new Date().toISOString();

        return {
            machine_id: machine.machine_id,
            machine_name: machine.machine_name,
            checklist_loaded_at: checklistLoadedAt,
            last_saved_on: lastSavedOn,
            total_items: checklist.length,
            completed_items: this.getCompletedCount(checklist),
            pending_items: checklist.filter(i => i.status === 'PENDING').length,
            checklist_status: this.getChecklistStatus(checklist),
            checklist_items: checklist
        };
    }

    async saveMachineChecklistProgress(machine_id, payload, checked_by) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const checklist = await this.ensureMachineChecklistSeeded(machine_id);
        if (!checklist.length) {
            const e = new Error('No checklist template found. Create generic checklist items first.');
            e.statusCode = 400;
            throw e;
        }

        const { operator_name, cell_incharge_name, items } = payload || {};
        if (!Array.isArray(items) || items.length === 0) {
            const e = new Error('items array is required');
            e.statusCode = 400;
            throw e;
        }

        const checklistById = new Map(checklist.map((row) => [Number(row.id), row]));
        const checklistByCheckpoint = new Map(
            checklist.map((row) => [String(row.checkpoint || '').trim().toLowerCase(), row])
        );

        const touched = [];
        for (const entry of items) {
            const normalizedCheckpoint = String(entry.checkpoint || '').trim().toLowerCase();
            const target = entry.id !== undefined && entry.id !== null
                ? checklistById.get(Number(entry.id))
                : checklistByCheckpoint.get(normalizedCheckpoint);

            if (!target) continue;

            const updates = {
                checked_by
            };
            if (operator_name !== undefined) updates.operator_name = operator_name;
            if (cell_incharge_name !== undefined) updates.cell_incharge_name = cell_incharge_name;
            if (entry.status !== undefined) updates.status = this.normalizeStatus(entry.status);
            if (entry.comments !== undefined) updates.comments = entry.comments;

            await MachineChecklistModel.update(target.id, updates);
            touched.push(target.id);
        }

        if (!touched.length) {
            const e = new Error('No checklist items matched provided id/checkpoint for this machine');
            e.statusCode = 400;
            throw e;
        }

        logger.info(`Checklist progress saved for machine ${machine_id}. Updated items: ${touched.length}`);
        return await this.getChecklistByMachineId(machine_id);
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
                    checklist_loaded_at: new Date().toISOString(),
                    checklist_items: []
                };
            }
            machineMap[item.machine_id].checklist_items.push(item);
        }
        const grouped = Object.values(machineMap);
        for (const machineChecklist of grouped) {
            machineChecklist.total_items = machineChecklist.checklist_items.length;
            machineChecklist.completed_items = this.getCompletedCount(machineChecklist.checklist_items);
            machineChecklist.pending_items = machineChecklist.checklist_items.filter(i => i.status === 'PENDING').length;
            machineChecklist.checklist_status = this.getChecklistStatus(machineChecklist.checklist_items);
            machineChecklist.last_saved_on = machineChecklist.checklist_items.length
                ? machineChecklist.checklist_items.reduce((acc, item) => {
                    const t = item.updated_at ? new Date(item.updated_at).getTime() : 0;
                    return t > acc ? t : acc;
                }, 0)
                : null;
            if (machineChecklist.last_saved_on) {
                machineChecklist.last_saved_on = new Date(machineChecklist.last_saved_on).toISOString();
            }
        }
        return grouped;
    }

    // Get checklist summary for all machines
    async getChecklistSummary() {
        const rows = await MachineChecklistModel.getChecklistSummaryByMachine();
        return rows.map((row) => {
            const total = Number(row.total_items || 0);
            const completed = Number(row.completed_items || 0);
            return {
                ...row,
                checklist_status: total > 0 && completed === total ? 'COMPLETED' : 'NOT_COMPLETED'
            };
        });
    }

    // Create checklist item
    async createChecklistItem({ machine_id, operator_name, cell_incharge_name, checkpoint, description, specification, method, image, timing, status, comments, checked_by, sort_order }) {
        const machine = await MachineModel.findById(machine_id);
        if (!machine) { const e = new Error('Machine not found'); e.statusCode = 404; throw e; }

        const normalizedMethod = this.normalizeMethod(method);
        const normalizedStatus = this.normalizeStatus(status);

        const id = await MachineChecklistModel.create({
            machine_id, operator_name, cell_incharge_name, checkpoint, description, specification, method: normalizedMethod,
            image, timing, status: normalizedStatus, comments, checked_by, sort_order
        });

        logger.info(`Checklist item created for machine ${machine_id}: ${checkpoint}`);
        return await MachineChecklistModel.findById(id);
    }

    // Create generic checklist item and sync to all machines
    async createGenericChecklistItem({ checkpoint, description, specification, method, image, timing, sort_order, checked_by }) {
        const templateMachineId = await this.getTemplateMachineId();
        const created = await this.createChecklistItem({
            machine_id: templateMachineId,
            operator_name: null,
            cell_incharge_name: null,
            checkpoint,
            description,
            specification,
            method,
            image,
            timing,
            status: 'PENDING',
            comments: null,
            checked_by,
            sort_order
        });

        const syncResult = await this.syncChecklistTemplateAcrossMachines(templateMachineId);
        return {
            template_machine_id: templateMachineId,
            created_item: created,
            sync: syncResult
        };
    }

    // Update checklist item
    async updateChecklistItem(id, updates) {
        const item = await MachineChecklistModel.findById(id);
        if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }

        if (updates.method !== undefined) {
            updates.method = this.normalizeMethod(updates.method);
        }
        if (updates.status !== undefined) {
            updates.status = this.normalizeStatus(updates.status);
        }

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
            const normalizedMethod = this.normalizeMethod(item.method);
            const normalizedStatus = this.normalizeStatus(item.status || 'PENDING');
            const id = await MachineChecklistModel.create({
                machine_id,
                operator_name: item.operator_name,
                cell_incharge_name: item.cell_incharge_name,
                checkpoint: item.checkpoint,
                description: item.description,
                specification: item.specification,
                method: normalizedMethod,
                image: item.image ? Buffer.from(item.image, 'base64') : null,
                timing: item.timing,
                status: normalizedStatus,
                comments: item.comments,
                checked_by: item.checked_by,
                sort_order: item.sort_order !== undefined ? item.sort_order : i + 1
            });
            results.push(id);
        }

        logger.info(`${results.length} checklist items created for machine ${machine_id}`);
        return await MachineChecklistModel.findByMachineId(machine_id);
    }

    // Bulk create generic checklist items and sync to all machines
    async bulkCreateGenericChecklist(items, checked_by) {
        const templateMachineId = await this.getTemplateMachineId();
        await this.bulkCreateChecklist(templateMachineId, items.map((item) => ({
            ...item,
            operator_name: null,
            cell_incharge_name: null,
            status: 'PENDING',
            comments: null,
            checked_by
        })));

        const syncResult = await this.syncChecklistTemplateAcrossMachines(templateMachineId);
        return {
            template_machine_id: templateMachineId,
            checklist_items_created: items.length,
            sync: syncResult
        };
    }

    // Get generic checklist definition
    async getGenericChecklist() {
        const templateMachineId = await this.getTemplateMachineId();
        const templateMachine = await MachineModel.findById(templateMachineId);
        const checklist = await MachineChecklistModel.findByMachineId(templateMachineId);
        return {
            template_machine_id: templateMachineId,
            template_machine_name: templateMachine?.machine_name || null,
            total_items: checklist.length,
            checklist_items: checklist.map((item) => ({
                id: item.id,
                checkpoint: item.checkpoint,
                description: item.description,
                specification: item.specification,
                method: item.method,
                image: item.image,
                timing: item.timing,
                sort_order: item.sort_order,
                created_at: item.created_at,
                updated_at: item.updated_at
            }))
        };
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

    // Sync one machine's checklist structure to all machines
    async syncChecklistTemplateAcrossMachines(source_machine_id) {
        const sourceMachine = await MachineModel.findById(source_machine_id);
        if (!sourceMachine) {
            const e = new Error('Source machine not found');
            e.statusCode = 404;
            throw e;
        }

        const templateItems = await MachineChecklistModel.findByMachineId(source_machine_id);
        if (!templateItems.length) {
            const e = new Error('Source machine checklist is empty');
            e.statusCode = 400;
            throw e;
        }

        const machines = await MachineModel.findAll();
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            for (const machine of machines) {
                const machineId = machine.machine_id;
                const [existing] = await connection.execute(
                    `SELECT * FROM machine_checklists WHERE machine_id = ? ORDER BY sort_order ASC, created_at ASC`,
                    [machineId]
                );

                const existingByCheckpoint = new Map(existing.map((row) => [row.checkpoint, row]));
                const templateCheckpointSet = new Set(templateItems.map((t) => t.checkpoint));

                for (const template of templateItems) {
                    const found = existingByCheckpoint.get(template.checkpoint);
                    if (found) {
                        await connection.execute(
                            `UPDATE machine_checklists
                             SET description = ?, specification = ?, method = ?, image = ?, timing = ?, sort_order = ?
                             WHERE id = ?`,
                            [
                                template.description || null,
                                template.specification || null,
                                template.method || null,
                                template.image ? Buffer.from(template.image, 'base64') : null,
                                template.timing || null,
                                template.sort_order || 0,
                                found.id
                            ]
                        );
                    } else {
                        await connection.execute(
                            `INSERT INTO machine_checklists
                            (machine_id, operator_name, cell_incharge_name, checkpoint, description, specification, method, image, timing, status, comments, checked_by, sort_order)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                machineId,
                                null,
                                null,
                                template.checkpoint,
                                template.description || null,
                                template.specification || null,
                                template.method || null,
                                template.image ? Buffer.from(template.image, 'base64') : null,
                                template.timing || null,
                                'PENDING',
                                null,
                                null,
                                template.sort_order || 0
                            ]
                        );
                    }
                }

                for (const row of existing) {
                    if (!templateCheckpointSet.has(row.checkpoint)) {
                        await connection.execute(
                            `DELETE FROM machine_checklists WHERE id = ?`,
                            [row.id]
                        );
                    }
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        logger.info(`Checklist template from machine ${source_machine_id} synced across all machines`);
        return {
            source_machine_id,
            total_machines_synced: machines.length,
            checklist_items_synced: templateItems.length
        };
    }

    // Get single checklist item by ID
    async getChecklistItemById(id) {
        const item = await MachineChecklistModel.findById(id);
        if (!item) { const e = new Error('Checklist item not found'); e.statusCode = 404; throw e; }
        return item;
    }
}

module.exports = new ChecklistService();
