const express = require('express');
const { updateStatus, getStatusHistory, getStatusStats } = require('../controllers/statusController');

const router = express.Router();

router.put('/update', updateStatus);
router.get('/history', getStatusHistory);
router.get('/stats', getStatusStats);

module.exports = router; 