const pool = require('../config/database');
const TrackingGenerator = require('../utils/trackingGenerator');

class DocumentLog {
  static async create(logData) {
    try {
      // Generate tracking number
      const trackingNumber = await TrackingGenerator.generateTrackingNumber();
      
      const {
        sender_name,
        doc_type,
        document_subject,
        direction,
        remarks,
        attachment_count = 0,
        attachment_names = [],
        attachment_paths = [],
        ip_address,
        user_agent
      } = logData;

      const query = `
        INSERT INTO document_logs 
        (tracking_number, sender_name, doc_type, document_subject, direction, remarks, attachment_count, attachment_names, attachment_paths, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        trackingNumber,
        sender_name,
        doc_type,
        document_subject,
        direction,
        remarks,
        attachment_count,
        attachment_names,
        attachment_paths,
        ip_address,
        user_agent
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in DocumentLog.create:', error);
      throw error;
    }
  }

  // Update findAll to include tracking_number
  static async findAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT *, tracking_number as trackingNumber FROM document_logs 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = 'SELECT COUNT(*) FROM document_logs';
      
      const [result, countResult] = await Promise.all([
        pool.query(query, [limit, offset]),
        pool.query(countQuery)
      ]);
      
      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      };
    } catch (error) {
      console.error('Error in DocumentLog.findAll:', error);
      throw error;
    }
  }

  // Add method to find by tracking number
  static async findByTrackingNumber(trackingNumber) {
    try {
      const query = 'SELECT * FROM document_logs WHERE tracking_number = $1';
      const result = await pool.query(query, [trackingNumber]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in DocumentLog.findByTrackingNumber:', error);
      throw error;
    }
  }

  static async updateStatus(documentId, statusData) {
  try {
    const {
      status,
      direction,
      remarks,
      updated_by
    } = statusData;

    const query = `
      UPDATE document_logs 
      SET 
        current_status = $1,
        current_direction = $2,
        current_status_remarks = $3,
        status_updated_at = NOW(),
        status_updated_by = $4
      WHERE id = $5
      RETURNING *
    `;

    const values = [
      status,
      direction,
      remarks,
      updated_by,
      documentId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error in DocumentLog.updateStatus:', error);
    throw error;
  }
}

static async findById(id) {
  try {
    const query = 'SELECT * FROM document_logs WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in DocumentLog.findById:', error);
    throw error;
  }
}

}

module.exports = DocumentLog;