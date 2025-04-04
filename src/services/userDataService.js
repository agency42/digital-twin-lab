const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Simple file-based lock implementation for personas.json
const lockfilePath = path.join(__dirname, '../../data/personas/personas.json.lock');
const lockCheckInterval = 100; // ms
const lockTimeout = 5000; // ms

async function acquireLock(operation = 'access') {
  const startTime = Date.now();
  while (true) {
    try {
      await fs.writeFile(lockfilePath, `locked by ${process.pid} for ${operation}`, { flag: 'wx' }); 
      // console.log('Personas lock acquired');
      return;
    } catch (error) {
      if (error.code === 'EEXIST') {
        if (Date.now() - startTime > lockTimeout) {
          throw new Error('Failed to acquire personas lock: Timeout');
        }
        // console.log('Waiting for personas lock...');
        await new Promise(resolve => setTimeout(resolve, lockCheckInterval));
      } else {
        throw error;
      }
    }
  }
}

async function releaseLock() {
  try {
    await fs.unlink(lockfilePath);
    // console.log('Personas lock released');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error releasing personas lock:', error);
    }
  }
}

/**
 * Service for managing user data
 */
class UserDataService {
  constructor() {
    this.usersFile = path.join(__dirname, '../../data/users.json');
    this.personasFilePath = path.join(__dirname, '../../data/personas/personas.json');
    this.personasDir = path.dirname(this.personasFilePath);
  }

  /**
   * Get the list of users
   * @returns {Promise<Array>} Array of user objects
   */
  async getUsers() {
    try {
      // Ensure file exists
      await fs.access(this.usersFile);
      
      // Read and parse the file
      const data = await fs.readFile(this.usersFile, 'utf8');
      let users = JSON.parse(data);
      
      // Handle case where the file might be empty
      if (!Array.isArray(users)) {
        users = [];
      }
      
      // Deduplicate users by ID
      const uniqueUsers = [];
      const seenIds = new Set();
      
      for (const user of users) {
        if (!seenIds.has(user.id)) {
          seenIds.add(user.id);
          uniqueUsers.push(user);
        } else {
          console.warn(`Duplicate user detected in users.json: ${user.id}`);
        }
      }
      
      // If we found and removed duplicates, update the file
      if (uniqueUsers.length !== users.length) {
        console.log(`Fixed ${users.length - uniqueUsers.length} duplicate users in users.json`);
        await fs.writeFile(this.usersFile, JSON.stringify(uniqueUsers, null, 2), 'utf8');
      }
      
      return uniqueUsers;
    } catch (error) {
      // If file doesn't exist, create an empty one
      if (error.code === 'ENOENT') {
        await fs.writeFile(this.usersFile, '[]', 'utf8');
        return [];
      }
      
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }

  /**
   * Get data for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User data or null if not found
   */
  async getUserData(userId) {
    try {
      const users = await this.getUsers();
      return users.find(user => user.id === userId) || null;
    } catch (error) {
      console.error(`Error getting user data for ${userId}:`, error);
      throw new Error(`Failed to get user data for ${userId}`);
    }
  }

  /**
   * Create a new user
   * @param {string} userId - User ID
   * @param {Object} initialData - Initial user data (optional)
   * @returns {Promise<Object>} Created user object
   */
  async createUser(userId, initialData = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const users = await this.getUsers();
      
      // Check if user already exists
      if (users.some(user => user.id === userId)) {
        throw new Error(`User '${userId}' already exists`);
      }

      // Create new user with default structure
      const newUser = {
        id: userId,
        createdAt: new Date().toISOString(),
        bio: initialData.bio || "",
        generation: {
          customPrompt: null,
          lastGeneratedProfile: null
        },
        chatContext: {
          lore: null,
          simulationParams: null,
          psychologicalState: null,
          cognitiveStyle: null
        },
        chatHistory: [],
        assessment: {
          userTipiScores: null,
          aiTipiScores: null,
          lastUpdated: null
        },
        ...initialData
      };

      // Add user to list
      users.push(newUser);
      
      // Save updated user list
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), 'utf8');
      
      return newUser;
    } catch (error) {
      console.error(`Error creating user ${userId}:`, error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update a user's data
   * @param {string} userId - User ID
   * @param {Object} updates - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateUserData(userId, updates) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const users = await this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        throw new Error(`User '${userId}' not found`);
      }

      // Handle special case for bio field
      if (updates.bio !== undefined) {
        users[userIndex].bio = updates.bio;
      }

      // Deep merge updates with existing user data
      users[userIndex] = this.deepMerge(users[userIndex], updates);
      users[userIndex].updatedAt = new Date().toISOString();
      
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), 'utf8');
      
      return users[userIndex];
    } catch (error) {
      console.error(`Error updating user data for ${userId}:`, error);
      throw new Error(`Failed to update user data: ${error.message}`);
    }
  }

  /**
   * Delete a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteUser(userId) {
    try {
      const users = await this.getUsers();
      const initialLength = users.length;
      
      const updatedUsers = users.filter(user => user.id !== userId);
      
      if (updatedUsers.length === initialLength) {
        return false; // User not found
      }
      
      await fs.writeFile(this.usersFile, JSON.stringify(updatedUsers, null, 2), 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Ensure the users file exists, create if it doesn't
   * @private
   */
  async ensureUsersFile() {
    try {
      await fs.access(this.usersFile);
    } catch (error) {
      // File doesn't exist, create it
      const usersDir = path.dirname(this.usersFile);
      await fs.mkdir(usersDir, { recursive: true });
      await fs.writeFile(this.usersFile, JSON.stringify([], null, 2), 'utf8');
    }
  }

  /**
   * Deep merge source object into target object
   * @private
   * @param {Object} target - Target object
   * @param {Object} source - Source object to merge in
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] === null) {
        // Explicitly set null values
        result[key] = null;
      } else if (Array.isArray(source[key])) {
        // Replace arrays entirely
        result[key] = [...source[key]];
      } else if (typeof source[key] === 'object' && source[key] !== null && typeof target[key] === 'object' && target[key] !== null) {
        // Recursively merge nested objects
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        // For primitive values, simply overwrite
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Ensure the base directory exists
  async _ensureDir() {
    try {
      await fs.mkdir(this.personasDir, { recursive: true });
    } catch (error) {
      console.error("Failed to ensure personas directory exists:", error);
      throw error; // Rethrow if directory creation fails
    }
  }

  // Read all user data (returns an object { userId: userData, ... })
  async _readData() {
    await this._ensureDir();
    try {
      const data = await fs.readFile(this.personasFilePath, 'utf-8');
      // Ensure we return an object, even if the file was previously an array or empty
      const jsonData = JSON.parse(data);
      if (Array.isArray(jsonData)) { 
        // If it's an array (old format), convert to object - potentially lossy if no userId
        console.warn("Old personas array format detected, converting to object. Ensure user IDs are consistent.");
        const objData = {};
        jsonData.forEach(user => {
          if(user.userId || user.personId) {
            objData[user.userId || user.personId] = user;
          }
        });
        return objData;
      }
      return jsonData || {}; // Return parsed object or empty object
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {}; // File doesn't exist, return empty object
      } else if (error instanceof SyntaxError) {
        console.error("Error parsing personas.json (corrupted?). Returning empty object.", error);
        // Optionally backup corrupted file here
        try {
          await fs.rename(this.personasFilePath, `${this.personasFilePath}.corrupted_${Date.now()}.bak`);
          console.log("Backed up corrupted personas file.");
        } catch (backupError) {
          console.error('Failed to backup corrupted personas file:', backupError);
        }
        return {}; 
      } else {
        throw error; // Rethrow other errors
      }
    }
  }

  // Write all user data (takes an object)
  async _writeData(data) {
    await this._ensureDir();
    await acquireLock('write');
    try {
      await fs.writeFile(this.personasFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      await releaseLock();
    }
  }

  // Get a list of all user IDs
  async getAllUserIds() {
    const data = await this._readData();
    return Object.keys(data);
  }
}

module.exports = UserDataService; 