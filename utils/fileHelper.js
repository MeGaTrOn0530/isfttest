const fs = require('fs-extra');
const path = require('path');

// Save file to disk
exports.saveFile = async (file, directory, filename) => {
  try {
    // Create directory if it doesn't exist
    await fs.ensureDir(directory);
    
    // Generate unique filename if not provided
    const finalFilename = filename || `${Date.now()}-${file.name}`;
    
    // Save file
    const filePath = path.join(directory, finalFilename);
    await file.mv(filePath);
    
    return finalFilename;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

// Delete file from disk
exports.deleteFile = async (filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Read file from disk
exports.readFile = async (filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readFile(filePath);
    }
    return null;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};