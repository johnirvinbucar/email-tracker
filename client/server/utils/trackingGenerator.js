const pool = require('../config/database');

class TrackingGenerator {
  static async generateTrackingNumber() {
    try {
      // Get current date in YYMMDD format
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
      const month = String(now.getMonth() + 1).padStart(2, '0'); // Month (01-12)
      const day = String(now.getDate()).padStart(2, '0'); // Day (01-31)
      const datePart = `${year}${month}${day}`;
      
      // Get the highest sequence number for today
      const query = `
        SELECT tracking_number 
        FROM (
          SELECT tracking_number FROM email_logs 
          WHERE tracking_number LIKE $1
          UNION ALL
          SELECT tracking_number FROM document_logs 
          WHERE tracking_number LIKE $1
        ) AS all_tracking
        ORDER BY tracking_number DESC 
        LIMIT 1
      `;
      
      const pattern = `CTS-${datePart}-%`;
      const result = await pool.query(query, [pattern]);
      
      let sequence = 1;
      
      if (result.rows.length > 0) {
        const lastTracking = result.rows[0].tracking_number;
        // Extract the sequence number from the last tracking number
        const lastSequence = parseInt(lastTracking.split('-')[2]);
        sequence = lastSequence + 1;
      }
      
      // Format sequence as 3 digits (001, 002, etc.)
      const sequencePart = String(sequence).padStart(3, '0');
      
      return `CTS-${datePart}-${sequencePart}`;
    } catch (error) {
      console.error('Error generating tracking number:', error);
      throw error;
    }
  }
}

module.exports = TrackingGenerator;