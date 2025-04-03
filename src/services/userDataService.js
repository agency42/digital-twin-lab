const path = require('path');
const fs = require('fs').promises;

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

class UserDataService {
    constructor() {
        this.personasFilePath = path.join(__dirname, '../../data/personas/personas.json');
        this.personasDir = path.dirname(this.personasFilePath);
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

    // Get data for a specific user
    async getUserData(userId) {
        const data = await this._readData();
        return data[userId] || null; // Return user data or null if not found
    }

    // Create a new user profile (with default structure)
    async createUser(userId) {
        if (!userId) throw new Error("User ID is required to create a user.");
        
        const data = await this._readData();
        if (data[userId]) {
            throw new Error(`User ID '${userId}' already exists.`);
        }

        data[userId] = {
            userId: userId,
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            assets: { imageIds: [], textIds: [] },
            generation: { customPrompt: null, lastGeneratedProfile: null },
            chatContext: { 
                lore: '', 
                simulationParams: '', 
                psychologicalState: '',
                cognitiveStyle: ''
            },
            assessment: { userTipiScores: null, aiTipiScores: null, alignmentResults: null, lastRunTimestamp: null },
            chatHistory: []
        };

        await this._writeData(data);
        console.log(`Created new user profile: ${userId}`);
        return data[userId];
    }

    // Update specific fields for a user (provide object with fields to update)
    async updateUserData(userId, updates) {
        if (!userId) throw new Error("User ID is required to update data.");
        if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
             console.warn(`No updates provided for user ${userId}`);
             return null;
        }
        
        const data = await this._readData();
        if (!data[userId]) {
            throw new Error(`User ID '${userId}' not found.`);
        }

        // Merge updates - simple merge, not deep merge
        // More complex merging (e.g., for nested objects like assessment) might be needed
        // depending on how PUT requests are structured.
        // For now, assuming top-level field replacement or simple object merge.
        for (const key in updates) {
            if (key !== 'userId' && key !== 'createdAt') { // Protect immutable fields
                 if (typeof updates[key] === 'object' && updates[key] !== null && data[userId][key] && typeof data[userId][key] === 'object') {
                     // Basic 1-level deep merge for objects like 'generation', 'chatContext', 'assessment'
                     data[userId][key] = { ...data[userId][key], ...updates[key] };
                 } else {
                     data[userId][key] = updates[key];
                 }
            }
        }
        data[userId].lastUpdatedAt = new Date().toISOString();

        await this._writeData(data);
        console.log(`Updated user profile: ${userId}`);
        return data[userId];
    }

    // Delete a user profile
    async deleteUser(userId) {
         if (!userId) throw new Error("User ID is required to delete a user.");

        const data = await this._readData();
        if (!data[userId]) {
            console.warn(`User ID '${userId}' not found, cannot delete.`);
            return false; // Indicate user not found
        }

        delete data[userId];
        await this._writeData(data);
        console.log(`Deleted user profile: ${userId}`);
        return true; // Indicate success
    }
}

module.exports = UserDataService; 