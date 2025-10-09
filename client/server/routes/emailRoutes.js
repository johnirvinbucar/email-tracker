const express = require('express');
const { logEmail, getEmailLogs, getStats } = require('../controllers/emailController');

const router = express.Router();

router.post('/log', logEmail);
router.get('/logs', getEmailLogs);
router.get('/stats', getStats);

module.exports = router;