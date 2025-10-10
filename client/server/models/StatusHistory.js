const pool = require('../config/database');

class StatusHistory {
  static async create(statusData) {
    try {
      const {
        record_id,
        record_type,
        status,
        direction,
        remarks,
        created_by
      } = statusData;

      const query = `
        INSERT INTO status_history 
        (record_id, record_type, status, direction, remarks, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        record_id,
        record_type,
        status,
        direction,
        remarks,
        created_by
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in StatusHistory.create:', error);
      throw error;
    }
  }

  static async findByRecord(recordId, recordType) {
    try {
      const query = `
        SELECT * FROM status_history 
        WHERE record_id = $1 AND record_type = $2 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [recordId, recordType]);
      return result.rows;
    } catch (error) {
      console.error('Error in StatusHistory.findByRecord:', error);
      throw error;
    }
  }

  static async getStatusCounts(recordType = null) {
    try {
      let query = `
        SELECT status, COUNT(*) as count 
        FROM status_history 
        WHERE id IN (
          SELECT MAX(id) 
          FROM status_history 
          GROUP BY record_id, record_type
        )
      `;
      
      let values = [];
      if (recordType) {
        query += ' AND record_type = $1';
        values.push(recordType);
      }
      
      query += ' GROUP BY status ORDER BY count DESC';
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error in StatusHistory.getStatusCounts:', error);
      throw error;
    }
  }
}

module.exports = StatusHistory;