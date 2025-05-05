const path = require('path');
const fs = require('fs-extra');

const usersFile = path.join(__dirname, '../data/users.json');

// Get all users
exports.getAllUsers = async () => {
  try {
    const data = await fs.readJson(usersFile);
    return data.users || [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Get user by ID
exports.getUserById = async (id) => {
  try {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

// Create a new user
exports.createUser = async (user) => {
  try {
    const users = await this.getAllUsers();
    users.push(user);
    await fs.writeJson(usersFile, { users });
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};