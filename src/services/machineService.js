const Machine = require('../models/Machine');
const logger = require('../utils/logger');

class MachineService {
    /**
     * Create a new machine
     */
    async createMachine(machineData) {
        try {
            const { machine_id, machine_image, start_time, count, end_time } = machineData;

            // Check if machine already exists
            const existingMachine = await Machine.findOne({ machine_id });
            if (existingMachine) {
                throw new Error('Machine with this ID already exists');
            }

            const machine = new Machine({
                machine_id,
                machine_image: machine_image || null,
                start_time: start_time || null,
                count: count || 0,
                end_time: end_time || null
            });

            await machine.save();
            logger.info(`Machine created: ${machine_id}`);
            return machine;
        } catch (error) {
            logger.error('Error creating machine:', error);
            throw error;
        }
    }

    /**
     * Get machine by ID
     */
    async getMachineById(machine_id) {
        try {
            const machine = await Machine.findOne({ machine_id });
            if (!machine) {
                throw new Error('Machine not found');
            }
            return machine;
        } catch (error) {
            logger.error('Error fetching machine:', error);
            throw error;
        }
    }

    /**
     * Get all machines
     */
    async getAllMachines() {
        try {
            const machines = await Machine.find().sort({ createdAt: -1 });
            return machines;
        } catch (error) {
            logger.error('Error fetching machines:', error);
            throw error;
        }
    }

    /**
     * Update machine
     */
    async updateMachine(machine_id, updateData) {
        try {
            const machine = await Machine.findOne({ machine_id });
            if (!machine) {
                throw new Error('Machine not found');
            }

            // Update fields if provided
            if (updateData.machine_image !== undefined) {
                machine.machine_image = updateData.machine_image;
            }
            if (updateData.start_time !== undefined) {
                machine.start_time = updateData.start_time;
            }
            if (updateData.count !== undefined) {
                machine.count = updateData.count;
            }
            if (updateData.end_time !== undefined) {
                machine.end_time = updateData.end_time;
            }

            await machine.save();
            logger.info(`Machine updated: ${machine_id}`);
            return machine;
        } catch (error) {
            logger.error('Error updating machine:', error);
            throw error;
        }
    }

    /**
     * Update machine image
     */
    async updateMachineImage(machine_id, imagePath) {
        try {
            return await this.updateMachine(machine_id, { machine_image: imagePath });
        } catch (error) {
            logger.error('Error updating machine image:', error);
            throw error;
        }
    }

    /**
     * Delete machine
     */
    async deleteMachine(machine_id) {
        try {
            const machine = await Machine.findOneAndDelete({ machine_id });
            if (!machine) {
                throw new Error('Machine not found');
            }
            logger.info(`Machine deleted: ${machine_id}`);
            return machine;
        } catch (error) {
            logger.error('Error deleting machine:', error);
            throw error;
        }
    }
}

module.exports = new MachineService();
