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
        forwarded_to, 
        cof,
        attachment_count = 0,
        attachment_names = [],
        attachment_paths = [],
        ip_address,
        user_agent
      } = logData;

      const query = `
        INSERT INTO document_logs 
        (tracking_number, sender_name, doc_type, document_subject, direction, remarks, forwarded_to, cof, attachment_count, attachment_names, attachment_paths, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        trackingNumber,
        sender_name,
        doc_type,
        document_subject,
        direction,
        remarks,
        forwarded_to || '', 
        cof || '', 
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
      forwarded_to,
      cof,
      remarks,
      updated_by,
      attachment
    } = statusData;

    let query;
    let values;

    // If there's an attachment, update the attachment fields
    if (attachment) {
      query = `
        UPDATE document_logs 
        SET 
          current_status = $1,
          current_direction = $2,
          current_forwarded_to = $3,
          current_cof = $4,
          current_status_remarks = $5,
          status_updated_at = NOW(),
          status_updated_by = $6,
          attachment_count = COALESCE(attachment_count, 0) + 1,
          attachment_names = array_append(COALESCE(attachment_names, ARRAY[]::text[]), $7),
          attachment_paths = array_append(COALESCE(attachment_paths, ARRAY[]::text[]), $8)
        WHERE id = $9
        RETURNING *
      `;
      values = [
        status,
        direction,
        forwarded_to || '',
        cof || '',
        remarks,
        updated_by,
        attachment.originalName,
        attachment.filename,
        documentId
      ];
    } else {
      query = `
        UPDATE document_logs 
        SET 
          current_status = $1,
          current_direction = $2,
          current_forwarded_to = $3,
          current_cof = $4,
          current_status_remarks = $5,
          status_updated_at = NOW(),
          status_updated_by = $6
        WHERE id = $7
        RETURNING *
      `;
      values = [
        status,
        direction,
        forwarded_to || '',
        cof || '',
        remarks,
        updated_by,
        documentId
      ];
    }

    console.log('📝 Executing update query with values:', values);

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

  // Add method to get stats
  static async getStats() {
    try {
      // Total documents count
      const totalQuery = 'SELECT COUNT(*) as total FROM document_logs';
      
      // Documents by type
      const byTypeQuery = `
        SELECT doc_type as _id, COUNT(*) as count 
        FROM document_logs 
        GROUP BY doc_type 
        ORDER BY count DESC
      `;
      
      // Documents by direction
      const byDirectionQuery = `
        SELECT direction as _id, COUNT(*) as count 
        FROM document_logs 
        GROUP BY direction 
        ORDER BY count DESC
      `;

      const [totalResult, byTypeResult, byDirectionResult] = await Promise.all([
        pool.query(totalQuery),
        pool.query(byTypeQuery),
        pool.query(byDirectionQuery)
      ]);

      return {
        total: parseInt(totalResult.rows[0].total),
        byType: byTypeResult.rows,
        byDirection: byDirectionResult.rows
      };
    } catch (error) {
      console.error('Error in DocumentLog.getStats:', error);
      throw error;
    }
  }
}

module.exports = DocumentLog;