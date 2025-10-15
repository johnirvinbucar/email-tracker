// In your statusRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { updateStatus, getStatusHistory, getStatusStats } = require('../controllers/statusController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Use multer for the update route - single file with field name 'attachment'
router.put('/update', upload.array('attachments', 10), updateStatus);
router.get('/history', getStatusHistory);
router.get('/stats', getStatusStats);

module.exports = router;