const express = require('express');
const path = require('path');
const fs = require('fs');
const { 
  logDocument, 
  getDocumentLogs, 
  getByTrackingNumber,
  getDocumentStats
} = require('../controllers/documentController');

const router = express.Router();

router.post('/log', logDocument);
router.get('/logs', getDocumentLogs);
router.get('/stats', getDocumentStats);
router.get('/tracking/:trackingNumber', getByTrackingNumber);

// ADD THIS ROUTE FOR DOWNLOADING DOCUMENT ATTACHMENTS
router.get('/attachment/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    console.log('📥 Attempting to download document file:', filename);
    console.log('📁 File path:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ Document file not found:', filePath);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Get the original filename from query params or use the saved filename
    const originalName = req.query.originalName || filename;
    
    console.log('✅ Document file found, sending download:', originalName);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error streaming document file:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading file'
      });
    });
    
  } catch (error) {
    console.error('❌ Error in document download attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

module.exports = router;