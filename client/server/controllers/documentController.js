const DocumentLog = require('../models/DocumentLog');
const path = require('path');
const fs = require('fs');

const logDocument = async (req, res) => {
  try {
    console.log('📄 Received document log request');
    console.log('Request body:', req.body);
    
    const { 
      senderName, 
      docType, 
      documentSubject, 
      direction, 
      remarks, 
      attachments = [] 
    } = req.body;
    
    // Validate required fields
    if (!senderName || !docType || !documentSubject || !direction) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: senderName, docType, documentSubject, direction'
      });
    }

    // Process file attachments
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

    const logData = {
      sender_name: senderName,
      doc_type: docType,
      document_subject: documentSubject,
      direction: direction,
      remarks: remarks || '',
      attachment_count: savedFiles.length,
      attachment_names: savedFiles.map(file => file.originalName),
      attachment_paths: savedFiles.map(file => file.savedName),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent') || 'Unknown'
    };

    console.log('💾 Attempting to save to document_logs:', logData);

    const savedLog = await DocumentLog.create(logData);
    
    console.log('✅ Document saved successfully:', savedLog.id);
    console.log('📎 Files saved:', savedFiles.length);
    
    res.status(201).json({
      success: true,
      message: 'Document record saved successfully',
      data: {
        ...savedLog,
        savedFiles: savedFiles.map(f => f.originalName)
      }
    });
  } catch (error) {
    console.error('❌ Error saving document:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to save document record',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getDocumentLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await DocumentLog.findAll(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching document logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document logs',
      error: error.message
    });
  }
};

const getDocumentStats = async (req, res) => {
  try {
    const stats = await DocumentLog.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document statistics',
      error: error.message
    });
  }
};

const getByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const log = await DocumentLog.findByTrackingNumber(trackingNumber);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Document log not found'
      });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching document log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document log',
      error: error.message
    });
  }
};

module.exports = {
  logDocument,
  getDocumentLogs,
  getDocumentStats
};