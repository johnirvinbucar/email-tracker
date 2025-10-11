const express = require('express');
const { logDocument, getDocumentLogs, getDocumentStats } = require('../controllers/documentController');

const router = express.Router();

router.post('/log', logDocument);
router.get('/logs', getDocumentLogs);

module.exports = router;