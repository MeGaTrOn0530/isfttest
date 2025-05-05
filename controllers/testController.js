const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const TestModel = require('../models/testModel');
const CertificateModel = require('../models/certificateModel');

// Get all tests
exports.getAllTests = async (req, res) => {
  try {
    const tests = await TestModel.getAllTests();
    res.json({ tests });
  } catch (error) {
    console.error('Error getting tests:', error);
    res.status(500).json({ error: 'Failed to get tests' });
  }
};

// Get active tests (for students)
exports.getActiveTests = async (req, res) => {
  try {
    const allTests = await TestModel.getAllTests();
    const activeTests = allTests.filter(test => test.isActive);
    
    // For security, remove correct answers from questions
    const testsForStudents = activeTests.map(test => {
      return {
        id: test.id,
        name: test.name,
        description: test.description,
        duration: test.duration,
        questionCount: test.questionCount,
        passingScore: test.passingScore,
        isActive: test.isActive
      };
    });
    
    res.json({ tests: testsForStudents });
  } catch (error) {
    console.error('Error getting active tests:', error);
    res.status(500).json({ error: 'Failed to get active tests' });
  }
};

// Get a specific test
exports.getTestById = async (req, res) => {
  try {
    const testId = req.params.id;
    const test = await TestModel.getTestById(testId);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // For student view, remove correct answers
    if (req.query.view === 'student') {
      const testForStudent = {
        id: test.id,
        name: test.name,
        description: test.description,
        duration: test.duration,
        questionCount: test.questionCount,
        passingScore: test.passingScore,
        isActive: test.isActive,
        questions: test.questions.map(q => {
          return {
            question: q.question,
            options: q.options,
            imageUrl: q.imageUrl
          };
        })
      };
      return res.json(testForStudent);
    }
    
    res.json(test);
  } catch (error) {
    console.error('Error getting test:', error);
    res.status(500).json({ error: 'Failed to get test' });
  }
};

// Create a new test
exports.createTest = async (req, res) => {
  try {
    const { name, description, content, duration, questionCount, passingScore, isActive } = req.body;
    
    // Validate required fields
    if (!name || !description || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Parse content if it's a string
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid content format' });
      }
    }
    
    // Handle image uploads
    let uploadedImages = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      
      for (const image of images) {
        const imageName = `${Date.now()}-${image.name}`;
        const imagePath = path.join(__dirname, '../public/images', imageName);
        
        await image.mv(imagePath);
        uploadedImages.push(imageName);
        
        // Update image URLs in questions
        parsedContent = parsedContent.map(q => {
          if (q.imageUrl && uploadedImages.includes(q.imageUrl)) {
            return { ...q, imageUrl: imageName };
          }
          return q;
        });
      }
    }
    
    // Create new test
    const newTest = {
      id: uuidv4(),
      name,
      description,
      questions: parsedContent,
      duration: parseInt(duration) || 30,
      questionCount: parseInt(questionCount) || 20,
      passingScore: parseInt(passingScore) || 70,
      isActive: isActive === 'true' || isActive === true,
      createdAt: new Date().toISOString()
    };
    
    await TestModel.createTest(newTest);
    
    res.status(201).json({ message: 'Test created successfully', test: newTest });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
};

// Update a test
exports.updateTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const { name, description, duration, questionCount, passingScore, isActive } = req.body;
    
    // Get existing test
    const existingTest = await TestModel.getTestById(testId);
    if (!existingTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Update test
    const updatedTest = {
      ...existingTest,
      name: name || existingTest.name,
      description: description || existingTest.description,
      duration: parseInt(duration) || existingTest.duration,
      questionCount: parseInt(questionCount) || existingTest.questionCount,
      passingScore: parseInt(passingScore) || existingTest.passingScore,
      isActive: isActive === 'true' || isActive === true,
      updatedAt: new Date().toISOString()
    };
    
    await TestModel.updateTest(testId, updatedTest);
    
    res.json({ message: 'Test updated successfully', test: updatedTest });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// Delete a test
exports.deleteTest = async (req, res) => {
  try {
    const testId = req.params.id;
    
    // Check if test exists
    const existingTest = await TestModel.getTestById(testId);
    if (!existingTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Delete test
    await TestModel.deleteTest(testId);
    
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

// Submit test result
exports.submitTestResult = async (req, res) => {
  try {
    const { testId, score, passed, timeSpent, answers } = req.body;
    
    // Validate required fields
    if (!testId || score === undefined || passed === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get test
    const test = await TestModel.getTestById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Create test result
    const testResult = {
      id: uuidv4(),
      testId,
      testName: test.name,
      studentName: req.body.studentName || 'Anonymous Student',
      score,
      passed,
      timeSpent,
      answers,
      date: new Date().toISOString()
    };
    
    // Save test result
    await TestModel.saveTestResult(testResult);
    
    // If passed, create certificate
    if (passed) {
      const certificate = {
        id: uuidv4(),
        testId,
        testName: test.name,
        studentName: testResult.studentName,
        score,
        date: new Date().toISOString()
      };
      
      await CertificateModel.createCertificate(certificate);
    }
    
    res.status(201).json({ message: 'Test result submitted successfully', testResult });
  } catch (error) {
    console.error('Error submitting test result:', error);
    res.status(500).json({ error: 'Failed to submit test result' });
  }
};