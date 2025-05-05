const path = require('path');
const fs = require('fs-extra');

const testsFile = path.join(__dirname, '../data/tests.json');
const testResultsFile = path.join(__dirname, '../data/test-results.json');

// Ensure test results file exists
if (!fs.existsSync(testResultsFile)) {
  fs.writeJsonSync(testResultsFile, { results: [] });
}

// Get all tests
exports.getAllTests = async () => {
  try {
    const data = await fs.readJson(testsFile);
    return data.tests || [];
  } catch (error) {
    console.error('Error reading tests file:', error);
    return [];
  }
};

// Get test by ID
exports.getTestById = async (id) => {
  try {
    const tests = await this.getAllTests();
    return tests.find(test => test.id === id);
  } catch (error) {
    console.error('Error getting test by ID:', error);
    return null;
  }
};

// Create a new test
exports.createTest = async (test) => {
  try {
    const tests = await this.getAllTests();
    tests.push(test);
    await fs.writeJson(testsFile, { tests });
    return test;
  } catch (error) {
    console.error('Error creating test:', error);
    throw error;
  }
};

// Update a test
exports.updateTest = async (id, updatedTest) => {
  try {
    const tests = await this.getAllTests();
    const index = tests.findIndex(test => test.id === id);
    
    if (index !== -1) {
      tests[index] = updatedTest;
      await fs.writeJson(testsFile, { tests });
      return updatedTest;
    }
    
    throw new Error('Test not found');
  } catch (error) {
    console.error('Error updating test:', error);
    throw error;
  }
};

// Delete a test
exports.deleteTest = async (id) => {
  try {
    const tests = await this.getAllTests();
    const filteredTests = tests.filter(test => test.id !== id);
    
    if (tests.length === filteredTests.length) {
      throw new Error('Test not found');
    }
    
    await fs.writeJson(testsFile, { tests: filteredTests });
    return true;
  } catch (error) {
    console.error('Error deleting test:', error);
    throw error;
  }
};

// Get all test results
exports.getAllTestResults = async () => {
  try {
    const data = await fs.readJson(testResultsFile);
    return data.results || [];
  } catch (error) {
    console.error('Error reading test results file:', error);
    return [];
  }
};

// Save test result
exports.saveTestResult = async (result) => {
  try {
    const results = await this.getAllTestResults();
    results.push(result);
    await fs.writeJson(testResultsFile, { results });
    return result;
  } catch (error) {
    console.error('Error saving test result:', error);
    throw error;
  }
};