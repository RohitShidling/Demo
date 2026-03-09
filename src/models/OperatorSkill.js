const { getPool } = require('../config/database');

class OperatorSkillModel {
    static async createOrUpdate({ operator_id, operator_name, skill_set }) {
        const pool = getPool();
        // Check if exists
        const [existing] = await pool.execute(`SELECT id FROM operator_skills WHERE operator_id = ?`, [operator_id]);

        if (existing.length > 0) {
            const query = `UPDATE operator_skills SET operator_name = ?, skill_set = ? WHERE operator_id = ?`;
            await pool.execute(query, [operator_name, JSON.stringify(skill_set), operator_id]);
            return existing[0].id;
        } else {
            const query = `INSERT INTO operator_skills (operator_id, operator_name, skill_set) VALUES (?, ?, ?)`;
            const [result] = await pool.execute(query, [operator_id, operator_name, JSON.stringify(skill_set)]);
            return result.insertId;
        }
    }

    static async findByOperator(operator_id) {
        const pool = getPool();
        const query = `SELECT * FROM operator_skills WHERE operator_id = ?`;
        const [rows] = await pool.execute(query, [operator_id]);
        if (rows[0] && rows[0].skill_set) {
            try {
                rows[0].skill_set = JSON.parse(rows[0].skill_set);
            } catch (e) {
                // skill_set is already a string
            }
        }
        return rows[0];
    }

    static async findAll() {
        const pool = getPool();
        const query = `
            SELECT os.*, ou.email, ou.username
            FROM operator_skills os
            JOIN operator_users ou ON os.operator_id = ou.id
            ORDER BY os.updated_at DESC
        `;
        const [rows] = await pool.execute(query);
        return rows.map(row => {
            if (row.skill_set) {
                try { row.skill_set = JSON.parse(row.skill_set); } catch (e) { /* keep as string */ }
            }
            return row;
        });
    }

    static async delete(operator_id) {
        const pool = getPool();
        const query = `DELETE FROM operator_skills WHERE operator_id = ?`;
        await pool.execute(query, [operator_id]);
    }
}

module.exports = OperatorSkillModel;
