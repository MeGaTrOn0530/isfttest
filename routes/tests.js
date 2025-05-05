const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// Get all tests
router.get('/', testController.getAllTests);

// Get active tests (for students)
router.get('/active', testController.getActiveTests);

// Get a specific test
router.get('/:id', testController.getTestById);

// Create a new test
router.post('/', testController.createTest);

// Update a test
router.put('/:id', testController.updateTest);

// Delete a test
router.delete('/:id', testController.deleteTest);

// Submit test result
router.post('/results', testController.submitTestResult);

module.exports = router;