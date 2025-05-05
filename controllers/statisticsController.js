const TestModel = require('../models/testModel');
const CertificateModel = require('../models/certificateModel');
const UserModel = require('../models/userModel');

// Get all statistics
exports.getStatistics = async (req, res) => {
  try {
    // Get all tests
    const tests = await TestModel.getAllTests();
    
    // Get all test results
    const testResults = await TestModel.getAllTestResults();
    
    // Get all certificates
    const certificates = await CertificateModel.getAllCertificates();
    
    // Get all users
    const users = await UserModel.getAllUsers();
    
    // Calculate test statistics
    const testStatistics = tests.map(test => {
      const testResultsForTest = testResults.filter(result => result.testId === test.id);
      const studentCount = testResultsForTest.length;
      const totalScore = testResultsForTest.reduce((sum, result) => sum + result.score, 0);
      const averageScore = studentCount > 0 ? Math.round(totalScore / studentCount) : 0;
      const passedCount = testResultsForTest.filter(result => result.passed).length;
      const successRate = studentCount > 0 ? Math.round((passedCount / studentCount) * 100) : 0;
      
      return {
        testId: test.id,
        testName: test.name,
        studentCount,
        averageScore,
        successRate
      };
    });
    
    // Calculate student rankings
    const studentMap = new Map();
    
    testResults.forEach(result => {
      if (!studentMap.has(result.studentName)) {
        studentMap.set(result.studentName, {
          studentName: result.studentName,
          testCount: 0,
          totalScore: 0,
          certificateCount: 0
        });
      }
      
      const student = studentMap.get(result.studentName);
      student.testCount++;
      student.totalScore += result.score;
    });
    
    certificates.forEach(cert => {
      if (studentMap.has(cert.studentName)) {
        const student = studentMap.get(cert.studentName);
        student.certificateCount++;
      }
    });
    
    const studentRankings = Array.from(studentMap.values()).map(student => {
      return {
        studentName: student.studentName,
        testCount: student.testCount,
        averageScore: Math.round(student.totalScore / student.testCount),
        certificateCount: student.certificateCount
      };
    }).sort((a, b) => b.averageScore - a.averageScore);
    
    // Return statistics
    res.json({
      testCount: tests.length,
      studentCount: users.length,
      certificateCount: certificates.length,
      testStatistics,
      studentRankings
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};