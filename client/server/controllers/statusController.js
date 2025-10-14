const StatusHistory = require('../models/StatusHistory');
const EmailLog = require('../models/EmailLog');
const DocumentLog = require('../models/DocumentLog');

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

    console.log('📝 Updating status with data:', { 
      recordId, 
      recordType, 
      status, 
      direction, 
      forwarded_to, 
      cof, 
      updatedBy 
    });

    // Validate required fields
    if (!recordId || !recordType || !status || !updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recordId, recordType, status, updatedBy'
      });
    }

    let updatedRecord;
    
    // Update the main record with the new forwarded_to and cof
    if (recordType === 'email') {
      updatedRecord = await EmailLog.updateStatus(recordId, {
        status,
        direction,
        remarks,
        forwarded_to: forwarded_to || '',
        cof: cof || '', 
        updated_by: updatedBy
      });
    } else if (recordType === 'document') {
      updatedRecord = await DocumentLog.updateStatus(recordId, {
        status,
        direction,
        remarks,
        forwarded_to: forwarded_to || '',
        cof: cof || '',
        updated_by: updatedBy
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid record type. Must be "email" or "document"'
      });
    }

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Create status history entry
    const statusHistory = await StatusHistory.create({
      record_id: recordId,
      record_type: recordType,
      status,
      direction,
      remarks,
      forwarded_to: forwarded_to || '',
      cof: cof || '',
      created_by: updatedBy
    });

    console.log('✅ Status updated successfully. Main record:', updatedRecord);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        record: updatedRecord,
        history: statusHistory
      }
    });

  } catch (error) {
    console.error('❌ Error updating status:', error);
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