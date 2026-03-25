const { getPool } = require('../config/database');

class InventoryModel {
    static async addMaterial({ material_name, quantity, unit }) {
        const pool = getPool();
        const query = `INSERT INTO inventory_materials (material_name, quantity, unit) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(query, [material_name, quantity || 0, unit || 'pcs']);
        return result.insertId;
    }

    static async findMaterialById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM inventory_materials WHERE id = ?`, [id]);
        return rows[0];
    }

    static async findAllMaterials() {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT * FROM inventory_materials ORDER BY material_name ASC`);
        return rows;
    }

    static async updateMaterialQuantity(id, quantity) {
        const pool = getPool();
        await pool.execute(`UPDATE inventory_materials SET quantity = ? WHERE id = ?`, [quantity, id]);
    }

    static async consumeMaterial({ material_id, work_order_id, quantity_used }) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert consumption record
            const [result] = await connection.execute(
                `INSERT INTO inventory_consumption (material_id, work_order_id, quantity_used) VALUES (?, ?, ?)`,
                [material_id, work_order_id || null, quantity_used]
            );

            // Reduce material quantity
            await connection.execute(
                `UPDATE inventory_materials SET quantity = quantity - ? WHERE id = ?`,
                [quantity_used, material_id]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getConsumptionHistory(material_id) {
        const pool = getPool();
        const query = `
            SELECT ic.*, im.material_name, im.unit
            FROM inventory_consumption ic
            JOIN inventory_materials im ON ic.material_id = im.id
            WHERE ic.material_id = ?
            ORDER BY ic.consumed_at DESC
        `;
        const [rows] = await pool.execute(query, [material_id]);
        return rows;
    }
}

module.exports = InventoryModel;
