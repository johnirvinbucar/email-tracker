const StatusHistory = require('../models/StatusHistory');
const EmailLog = require('../models/EmailLog');
const DocumentLog = require('../models/DocumentLog');


// In your statusController.js - update the updateStatus function
const updateStatus = async (req, res) => {
  try {
    const {
      recordId,
      recordType,
      status,
      direction,
      forwarded_to,
      cof,
      remarks,
      updatedBy
    } = req.body;

    console.log('📥 Received status update request:', {
      recordId,
      recordType,
      status,
      direction,
      forwarded_to,
      cof,
      remarks,
      updatedBy
    });

    // Handle multiple files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} attachment(s)`);
      attachments = req.files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size
      }));
    }

    console.log('📋 Attachments to process:', attachments);

    let updatedRecord;
    
    if (recordType === 'document') {
      const DocumentLog = require('../models/DocumentLog');
      // Update to handle multiple attachments
      updatedRecord = await DocumentLog.updateStatus(recordId, {
        status,
        direction,
        forwarded_to,
        cof,
        remarks,
        updated_by: updatedBy,
        attachments: attachments // Send array of attachments
      });
    } else if (recordType === 'email') {
      const EmailLog = require('../models/EmailLog');
      updatedRecord = await EmailLog.updateStatus(recordId, {
        status,
        direction,
        forwarded_to,
        cof,
        remarks,
        updated_by: updatedBy,
        attachments: attachments // Send array of attachments
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid record type'
      });
    }

    // Create status history entry
    const StatusHistory = require('../models/StatusHistory');
    const statusHistory = await StatusHistory.create({
      record_id: recordId,
      record_type: recordType,
      status,
      direction,
      forwarded_to,
      cof,
      remarks,
      created_by: updatedBy,
      // Store attachment information in status history if needed
      attachment_filename: attachments.length > 0 ? 
        attachments.map(a => a.originalName).join(', ') : null
    });

    console.log('✅ Status updated successfully');

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        record: updatedRecord,
        statusHistory
      }
    });

  } catch (error) {
    console.error('❌ Error in updateStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

const getStatusHistory = async (req, res) => {
  try {
    const { recordId, recordType } = req.query;

    if (!recordId || !recordType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: recordId, recordType'
      });
    }

    const history = await StatusHistory.findByRecord(recordId, recordType);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status history',
      error: error.message
    });
  }
};

const getStatusStats = async (req, res) => {
  try {
    const { recordType } = req.query;
    
    const stats = await StatusHistory.getStatusCounts(recordType);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching status stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status statistics',
      error: error.message
    });
  }
};

module.exports = {
  updateStatus,
  getStatusHistory,
  getStatusStats
};