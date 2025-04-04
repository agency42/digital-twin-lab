const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Service for managing personality profiles
 */
class PersonalityProfileService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.profilesDir = path.join(this.dataDir, 'personas');
    this.profilesFile = path.join(this.profilesDir, 'personas.json');
    
    // Ensure directories exist
    this.initializeDirectories();
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.profilesDir, { recursive: true });
      
      // Check if profiles file exists, create if it doesn't
      try {
        await fs.access(this.profilesFile);
      } catch (error) {
        await fs.writeFile(this.profilesFile, JSON.stringify({}, null, 2));
      }
    } catch (error) {
      console.error('Error initializing profile directories:', error);
    }
  }

  /**
   * Save a personality profile for a user
   * @param {string} userId - The user ID
   * @param {object} profile - The personality profile to save
   * @param {object} metadata - Additional metadata about the profile
   * @returns {Promise<object>} The saved profile with metadata
   */
  async saveProfile(userId, profile, metadata = {}) {
    try {
      // Load current profiles
      const profiles = await this.loadProfiles();
      
      // Generate profile ID if not provided
      const profileId = metadata.profileId || uuidv4();
      
      // Create or update user's profiles
      if (!profiles[userId]) {
        profiles[userId] = {};
      }
      
      // Add timestamp if not provided
      const timestamp = metadata.timestamp || new Date().toISOString();
      
      // Save the profile with metadata
      profiles[userId][profileId] = {
        profile,
        metadata: {
          ...metadata,
          profileId,
          timestamp,
          userId
        }
      };
      
      // Write profiles back to file
      await fs.writeFile(this.profilesFile, JSON.stringify(profiles, null, 2));
      
      return {
        profileId,
        profile,
        metadata: {
          ...metadata,
          profileId,
          timestamp,
          userId
        }
      };
    } catch (error) {
      console.error('Error saving personality profile:', error);
      throw new Error(`Failed to save personality profile: ${error.message}`);
    }
  }

  /**
   * Load all profiles for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of user's profiles with metadata
   */
  async getUserProfiles(userId) {
    try {
      const profiles = await this.loadProfiles();
      
      if (!profiles[userId]) {
        return [];
      }
      
      // Convert object to array and sort by timestamp (newest first)
      return Object.values(profiles[userId])
        .sort((a, b) => {
          const timestampA = new Date(a.metadata?.timestamp || 0);
          const timestampB = new Date(b.metadata?.timestamp || 0);
          return timestampB - timestampA;
        });
    } catch (error) {
      console.error('Error loading user profiles:', error);
      throw new Error(`Failed to load user profiles: ${error.message}`);
    }
  }

  /**
   * Get a specific profile by ID
   * @param {string} userId - The user ID
   * @param {string} profileId - The profile ID
   * @returns {Promise<object|null>} The profile or null if not found
   */
  async getProfile(userId, profileId) {
    try {
      const profiles = await this.loadProfiles();
      
      if (!profiles[userId] || !profiles[userId][profileId]) {
        return null;
      }
      
      return profiles[userId][profileId];
    } catch (error) {
      console.error('Error loading profile:', error);
      throw new Error(`Failed to load profile: ${error.message}`);
    }
  }

  /**
   * Delete a profile
   * @param {string} userId - The user ID
   * @param {string} profileId - The profile ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteProfile(userId, profileId) {
    try {
      const profiles = await this.loadProfiles();
      
      if (!profiles[userId] || !profiles[userId][profileId]) {
        return false;
      }
      
      // Delete the profile
      delete profiles[userId][profileId];
      
      // Write profiles back to file
      await fs.writeFile(this.profilesFile, JSON.stringify(profiles, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }

  /**
   * Delete all profiles for a user
   * @param {string} userId - The user ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteUserProfiles(userId) {
    try {
      const profiles = await this.loadProfiles();
      
      if (!profiles[userId]) {
        return true; // Nothing to delete
      }
      
      // Delete all user profiles
      delete profiles[userId];
      
      // Write profiles back to file
      await fs.writeFile(this.profilesFile, JSON.stringify(profiles, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error deleting user profiles:', error);
      throw new Error(`Failed to delete user profiles: ${error.message}`);
    }
  }

  /**
   * Load all profiles from file
   * @returns {Promise<object>} The profiles object
   * @private
   */
  async loadProfiles() {
    try {
      const data = await fs.readFile(this.profilesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create an empty one
        await fs.writeFile(this.profilesFile, JSON.stringify({}, null, 2));
        return {};
      }
      console.error('Error reading profiles file:', error);
      throw new Error(`Failed to read profiles: ${error.message}`);
    }
  }
}

module.exports = new PersonalityProfileService(); 