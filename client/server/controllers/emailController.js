const EmailLog = require('../models/EmailLog');
const path = require('path');
const fs = require('fs');

const logEmail = async (req, res) => {
  try {
    console.log('📧 Received email log request');
    console.log('Request body:', req.body);
    
    const { 
      to, 
      subject, 
      body, 
      type, 
      senderName, 
      category, 
      docType, 
      direction, 
      remarks, 
      documentSubject, // NEW: Document subject
      attachments = [] 
    } = req.body;
    
    // Validate required fields based on category
    if (!senderName) {
      console.log('❌ Missing required field: senderName');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: senderName'
      });
    }

    if (category === 'Email') {
      if (!to || !subject || !body) {
        console.log('❌ Missing required email fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for email: to, subject, body'
        });
      }
    } else if (category === 'Document') {
      if (!docType || !direction || !documentSubject) { // NEW: Require documentSubject
        console.log('❌ Missing required document fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for document: docType, direction, documentSubject'
        });
      }
    }

    // Process file attachments (same as before)
    const savedFiles = [];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.fileData) {
          const fileBuffer = Buffer.from(attachment.fileData, 'base64');
          const fileName = `${Date.now()}-${attachment.name}`;
          const filePath = path.join(__dirname, '../uploads', fileName);
          
          const uploadsDir = path.join(__dirname, '../uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
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

    // Prepare data for database
    const logData = {
      sender_name: senderName,
      category: category || 'Email',
      attachment_count: savedFiles.length,
      attachment_names: savedFiles.map(file => file.originalName),
      attachment_paths: savedFiles.map(file => file.savedName),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent') || 'Unknown'
    };

    // Add email-specific fields
    if (category === 'Email') {
      logData.to_email = to;
      logData.subject = subject;
      logData.body = body;
      logData.type = type || 'Communication';
    } else {
      // Document-specific fields
      logData.doc_type = docType;
      logData.document_subject = documentSubject; // NEW: Store document subject
      logData.direction = direction;
      logData.remarks = remarks || '';
      logData.to_email = null;
      logData.subject = documentSubject; // Use document subject as the main subject
      logData.body = remarks || `Document: ${docType} - ${documentSubject}`;
      logData.type = 'Document';
    }

    console.log('💾 Attempting to save to database:', logData);

    const savedLog = await EmailLog.create(logData);
    
    console.log('✅ Record saved successfully:', savedLog.id);
    console.log('📎 Files saved:', savedFiles.length);
    
    res.status(201).json({
      success: true,
      message: category === 'Email' ? 'Email logged successfully' : 'Document record saved successfully',
      data: {
        ...savedLog,
        savedFiles: savedFiles.map(f => f.originalName)
      }
    });
  } catch (error) {
    console.error('❌ Error saving record:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to save record',
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

const getByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const log = await EmailLog.findByTrackingNumber(trackingNumber);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Email log not found'
      });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching email log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email log',
      error: error.message
    });
  }
};

module.exports = {
  logEmail,
  getEmailLogs,
  getStats,
  getAttachment
};