const pool = require('../config/database');

class EmailLog {
  static async create(logData) {
    try {
      const {
        to_email,
        subject,
        body,
        type = 'Communication',
        sender_name,
        attachment_count = 0,
        attachment_names = [],
        attachment_paths = [],
        ip_address,
        user_agent
      } = logData;

      const query = `
        INSERT INTO email_logs 
        (to_email, subject, body, type, sender_name, attachment_count, attachment_names, attachment_paths, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        to_email,
        subject,
        body,
        type,
        sender_name,
        attachment_count,
        attachment_names,
        attachment_paths,
        ip_address,
        user_agent
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in EmailLog.create:', error);
      throw error;
    }
  }

  static async findAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT * FROM email_logs 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = 'SELECT COUNT(*) FROM email_logs';
      
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
      console.error('Error in EmailLog.findAll:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_emails,
          COUNT(DISTINCT to_email) as unique_recipients,
          COALESCE(AVG(attachment_count), 0) as avg_attachments,
          MAX(created_at) as last_email_date
        FROM email_logs
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error in EmailLog.getStats:', error);
      throw error;
    }
  }
}

module.exports = EmailLog;