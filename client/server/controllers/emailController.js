const EmailLog = require('../models/EmailLog');
const path = require('path');
const fs = require('fs');

const logEmail = async (req, res) => {
  try {
    console.log('📧 Received email log request');
    console.log('Request body:', req.body);
    
    const { to, subject, body, type, senderName, attachments = [] } = req.body;
    
    // Validate required fields
    if (!to || !subject || !body || !senderName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, body, senderName'
      });
    }

    // Process file attachments
    const savedFiles = [];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.fileData) {
          // Save base64 file data to disk
          const fileBuffer = Buffer.from(attachment.fileData, 'base64');
          const fileName = `${Date.now()}-${attachment.name}`;
          const filePath = path.join(__dirname, '../uploads', fileName);
          
          fs.writeFileSync(filePath, fileBuffer);
          savedFiles.push({
            originalName: attachment.name,
            savedName: fileName,
            path: filePath,
            size: attachment.size
          });
          
          console.log(`💾 Saved file: ${fileName}`);
        }
      }
    }

    const logData = {
      to_email: to,
      subject,
      body,
      type: type || 'Communication',
      sender_name: senderName,
      attachment_count: savedFiles.length,
      attachment_names: savedFiles.map(file => file.originalName),
      attachment_paths: savedFiles.map(file => file.savedName),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent') || 'Unknown'
    };

    console.log('💾 Attempting to save to database:', logData);

    const savedLog = await EmailLog.create(logData);
    
    console.log('✅ Email logged successfully:', savedLog.id);
    console.log('📎 Files saved:', savedFiles.length);
    
    res.status(201).json({
      success: true,
      message: 'Email logged successfully',
      data: {
        ...savedLog,
        savedFiles: savedFiles.map(f => f.originalName)
      }
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

// Add this function to your emailController.js if not already there
const getAttachment = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};

module.exports = {
  logEmail,
  getEmailLogs,
  getStats,
  getAttachment
};