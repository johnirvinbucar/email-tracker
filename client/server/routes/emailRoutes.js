const express = require('express');
const { logEmail, getEmailLogs, getStats, getAttachment } = require('../controllers/emailController');

const router = express.Router();

router.post('/log', logEmail);
router.get('/logs', getEmailLogs);
router.get('/stats', getStats);
router.get('/attachment/:filename', getAttachment); // Make sure this exists

module.exports = router;