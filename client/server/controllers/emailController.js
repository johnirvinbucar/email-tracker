const EmailLog = require('../models/EmailLog');

const logEmail = async (req, res) => {
  try {
    console.log('📧 Received email log request');
    console.log('Request body:', req.body);
    
    const { to, subject, body, type, senderName, attachments = [] } = req.body; // Add senderName
    
    // Validate required fields
    if (!to || !subject || !body || !senderName) { // Add senderName validation
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, body, senderName'
      });
    }

    const logData = {
      to_email: to,
      subject,
      body,
      type: type || 'Communication',
      sender_name: senderName, // Map to database column name
      attachment_count: attachments.length,
      attachment_names: attachments.map(file => file.name),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent') || 'Unknown'
    };

    console.log('💾 Attempting to save to database:', logData);

    const savedLog = await EmailLog.create(logData);
    
    console.log('✅ Email logged successfully:', savedLog.id);
    
    res.status(201).json({
      success: true,
      message: 'Email logged successfully',
      data: savedLog
    });
  } catch (error) {
    console.error('❌ Error logging email:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to log email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await EmailLog.findAll(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email logs',
      error: error.message
    });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await EmailLog.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  logEmail,
  getEmailLogs,
  getStats
};