const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

// Get all statistics
router.get('/', statisticsController.getStatistics);

module.exports = router;