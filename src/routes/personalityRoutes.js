const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const UserDataService = require('../services/userDataService'); // Import UserDataService
const personalityProfileService = require('../services/personalityProfileService');

function createPersonalityRouter(abstractionApproach) {
  const router = express.Router();
  const userDataService = new UserDataService(); // Instantiate UserDataService

  /**
   * Generate a personality profile
   * POST /api/personality/generate
   * {
   *   userId: string, 
   *   assetIds: string[],
   *   prompt: string (optional)
   * }
   */
  router.post('/generate', async (req, res) => {
    try {
      const { userId, assetIds, prompt } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'Missing required parameter: userId' });
      }

      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return res.status(400).json({ error: 'At least one asset ID must be provided' });
      }

      // Generate personality JSON using the abstraction approach
      const { json: personalityJSON, assets } = await abstractionApproach.generatePersonality(userId, assetIds, prompt);

      // Save the generated profile
      const result = await personalityProfileService.saveProfile(userId, personalityJSON, {
        assetIds,
        generatedAt: new Date().toISOString(),
        assetCount: assets.length,
      });

      // Return the generated personality
      return res.status(200).json({
        success: true,
        personalityJSON,
        assetCount: assets.length,
        profileId: result.profileId,
        generatedAt: result.metadata.timestamp
      });
    } catch (error) {
      console.error('Error generating personality:', error);
      return res.status(500).json({ error: `Failed to generate personality: ${error.message}` });
    }
  });

  /**
   * Get all personality profiles for a user
   * GET /api/personality/:userId
   */
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing required parameter: userId' });
      }
      
      // Get profiles for the user
      const profiles = await personalityProfileService.getUserProfiles(userId);
      
      if (profiles.length === 0) {
        return res.status(404).json({ error: 'No personality profiles found for this user' });
      }
      
      // Return the latest profile
      const latestProfile = profiles[0];
      
      // Safely extract metadata properties with fallbacks
      const profileId = latestProfile.metadata?.profileId || latestProfile.id || 'unknown';
      const timestamp = latestProfile.metadata?.timestamp || latestProfile.createdAt || new Date().toISOString();
      const assetIds = latestProfile.metadata?.assetIds || [];
      
      return res.status(200).json({
        personality: latestProfile.profile,
        profileId: profileId,
        generatedAt: timestamp,
        assetIds: assetIds
      });
    } catch (error) {
      console.error('Error getting personality profiles:', error);
      return res.status(500).json({ error: `Failed to get personality profiles: ${error.message}` });
    }
  });

  /**
   * Get a specific personality profile
   * GET /api/personality/:userId/:profileId
   */
  router.get('/:userId/:profileId', async (req, res) => {
    try {
      const { userId, profileId } = req.params;
      
      if (!userId || !profileId) {
        return res.status(400).json({ error: 'Missing required parameters: userId and profileId' });
      }
      
      // Get the specific profile
      const profileData = await personalityProfileService.getProfile(userId, profileId);
      
      if (!profileData) {
        return res.status(404).json({ error: 'Personality profile not found' });
      }
      
      return res.status(200).json({
        personality: profileData.profile,
        profileId: profileData.metadata.profileId,
        generatedAt: profileData.metadata.timestamp,
        assetIds: profileData.metadata.assetIds || []
      });
    } catch (error) {
      console.error('Error getting personality profile:', error);
      return res.status(500).json({ error: `Failed to get personality profile: ${error.message}` });
    }
  });

  /**
   * Delete a personality profile
   * DELETE /api/personality/:userId/:profileId
   */
  router.delete('/:userId/:profileId', async (req, res) => {
    try {
      const { userId, profileId } = req.params;
      
      if (!userId || !profileId) {
        return res.status(400).json({ error: 'Missing required parameters: userId and profileId' });
      }
      
      // Delete the profile
      const deleted = await personalityProfileService.deleteProfile(userId, profileId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Personality profile not found' });
      }
      
      return res.status(200).json({ success: true, message: 'Personality profile deleted successfully' });
    } catch (error) {
      console.error('Error deleting personality profile:', error);
      return res.status(500).json({ error: `Failed to delete personality profile: ${error.message}` });
    }
  });

  return router;
}

module.exports = createPersonalityRouter; 