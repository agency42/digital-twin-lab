const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const UserDataService = require('../services/userDataService'); // Import UserDataService

function createPersonalityRouter(abstractionApproach) {
  const router = express.Router();
  const userDataService = new UserDataService(); // Instantiate UserDataService

  // Generate personality profile (JSON) from selected assets using custom prompt
  router.post('/generate', async (req, res) => {
    try {
      // ** Get userId from request body **
      const { userId, assetIds, prompt: customPromptInput } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'Missing required field: userId' });
      }
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return res.status(400).json({ error: 'Missing required assetIds array' });
      }

      // Load user data to potentially get a custom prompt
      const userData = await userDataService.getUserData(userId);
      // Use custom prompt from request body if provided, else from user data, else null (AbstractionApproach uses default)
      const effectiveCustomPrompt = customPromptInput || userData?.generation?.customPrompt || null;
      
      console.log(`Generating personality for user ${userId} using ${assetIds.length} assets.`);
      if (effectiveCustomPrompt) {
          console.log(`Using custom prompt (length: ${effectiveCustomPrompt.length}).`);
      }

      // --- Generate Personality JSON using AbstractionApproach ---
      // AbstractionApproach now saves the result internally via UserDataService ideally,
      // OR we save it here after generation.
      // Let's assume AbstractionApproach is refactored to accept userId and save.
      // If not, we would save here using userDataService.updateUserData
      const personaJSON = await abstractionApproach.generatePersonaJSON(
        userId, // Pass userId instead of effectivePersonId
        assetIds,
        effectiveCustomPrompt
      );

      // ** Save the generated profile to the user's data **
      const updateData = {
          generation: {
              // Keep existing custom prompt if any
              customPrompt: userData?.generation?.customPrompt, 
              lastGeneratedProfile: {
                  json: personaJSON,
                  timestamp: new Date().toISOString(),
                  sourceAssetIds: assetIds
              }
          }
      };
      await userDataService.updateUserData(userId, updateData);
      console.log(`Personality JSON generated and saved for user ${userId}.`);

      // --- Return the Generated JSON --- 
      return res.status(200).json({
        success: true,
        userId: userId,
        personalityJSON: personaJSON, 
        timestamp: new Date().toISOString(),
        message: "Personality JSON generated and saved successfully."
      });

    } catch (error) {
      console.error(`Error processing /api/personality/generate request for user ${req.body.userId}:`, error);
      // Provide more specific error message if possible
      const errorMessage = error.message || 'An error occurred during personality generation.';
      const errorDetail = error.toString();
      return res.status(500).json({ 
        error: errorMessage,
        detail: errorDetail 
      });
    }
  });
  
  // Get generated personalities for a user (now reads from UserDataService)
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'Missing required userId parameter' });
      }
      
      const userData = await userDataService.getUserData(userId);
      
      if (!userData) {
           return res.status(404).json({ error: `User '${userId}' not found.` });
      }

      // Return relevant part of user data, e.g., last generated profile
      // Or potentially a history if we store multiple generations later
      const profileData = userData.generation?.lastGeneratedProfile || null;

      if (!profileData) {
           return res.status(200).json({ userId: userId, message: "No personality generated yet for this user.", personality: null });
      }

      return res.status(200).json({
          userId: userId,
          personality: profileData.json,
          generatedAt: profileData.timestamp,
          sourceAssetIds: profileData.sourceAssetIds
      });

    } catch (error) {
      console.error(`Error getting personality for ${req.params.userId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve personality data.', details: error.message });
    }
  });

  return router;
}

module.exports = createPersonalityRouter; 