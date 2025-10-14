const express = require('express');
const { 
  logDocument, 
  getDocumentLogs, 
  getByTrackingNumber,
  getDocumentStats // NEW: Import stats function
} = require('../controllers/documentController');

const router = express.Router();

router.post('/log', logDocument);
router.get('/logs', getDocumentLogs);
router.get('/stats', getDocumentStats); // NEW: Add stats route
router.get('/tracking/:trackingNumber', getByTrackingNumber);

module.exports = router;