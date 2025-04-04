const express = require('express');
const UserDataService = require('../services/userDataService');
const fs = require('fs').promises;
const path = require('path');

function createUserRouter() {
  const router = express.Router();
  const userDataService = new UserDataService();

  // GET /api/users - List all user IDs
  router.get('/', async (req, res) => {
    try {
      const users = await userDataService.getUsers();
      res.status(200).json(users.map(user => ({ id: user.id, createdAt: user.createdAt })));
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // POST /api/users - Create a new user
  router.post('/', async (req, res) => {
    try {
      const { userId, bio } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const initialData = {};
      if (bio) {
        initialData.bio = bio;
      }
      
      const newUser = await userDataService.createUser(userId, initialData);
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // GET /api/users/:userId - Get specific user data
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const userData = await userDataService.getUserData(userId);
      
      if (!userData) {
        return res.status(404).json({ error: `User '${userId}' not found` });
      }
      
      res.status(200).json(userData);
    } catch (error) {
      console.error(`Error getting user data for ${req.params.userId}:`, error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });

  // PUT /api/users/:userId - Update specific user data
  router.put('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Basic validation: Ensure updates is an object and not empty
       if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
         return res.status(400).json({ error: 'Request body must contain update data.' });
      }
      // Prevent changing immutable fields via PUT
      delete updates.userId; 
      delete updates.createdAt;

      const updatedUserData = await userDataService.updateUserData(userId, updates);
      if (updatedUserData) {
        res.status(200).json(updatedUserData);
      } else {
           // This case might occur if updateUserData returns null due to empty updates
           // or potentially if the user was deleted between read and write (though locking helps)
           console.warn(`Update called for user ${userId}, but no effective changes were made or user not found.`);
           // Re-fetch to confirm existence before deciding on 404 vs 200/304
           const currentUserData = await userDataService.getUserData(userId);
           if (!currentUserData) {
               res.status(404).json({ error: `User ID '${userId}' not found during update.` });
           } else {
               res.status(200).json(currentUserData); // Return current data if no changes
           }
      }
    } catch (error) {
       console.error(`Error updating user data for '${req.params.userId}':`, error);
       if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
       }
       res.status(500).json({ error: 'Failed to update user data.', details: error.message });
    }
  });

  // Update user's bio
  router.post('/:userId/bio', async (req, res) => {
    try {
      const { userId } = req.params;
      const { bio } = req.body;
      
      if (bio === undefined) {
        return res.status(400).json({ error: 'Bio text is required' });
      }
      
      const updatedUser = await userDataService.updateUserData(userId, { bio });
      
      res.status(200).json({ 
        success: true, 
        userId, 
        bio: updatedUser.bio 
      });
    } catch (error) {
      console.error(`Error updating bio for user ${req.params.userId}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update bio' });
    }
  });

  // Update user's custom prompt for personality generation
  router.post('/:userId/prompt', async (req, res) => {
    try {
      const { userId } = req.params;
      const { prompt } = req.body;
      
      if (prompt === undefined) {
        return res.status(400).json({ error: 'Prompt text is required' });
      }
      
      // Create generation object if it doesn't exist
      let userData = await userDataService.getUserData(userId);
      if (!userData) {
        return res.status(404).json({ error: `User '${userId}' not found` });
      }
      
      // Initialize or update the generation property
      if (!userData.generation) {
        userData.generation = {};
      }
      
      // Update the custom prompt
      const updatedUser = await userDataService.updateUserData(userId, {
        generation: {
          ...userData.generation,
          customPrompt: prompt
        }
      });
      
      res.status(200).json({ 
        success: true, 
        userId,
        customPrompt: updatedUser.generation?.customPrompt || prompt
      });
    } catch (error) {
      console.error(`Error updating prompt for user ${req.params.userId}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  });

  // DELETE /api/users/:userId - Delete a user
  router.delete('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const deleted = await userDataService.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ error: `User '${userId}' not found` });
      }
      
      // Also clean up user's assets directory
      try {
        const userAssetsDir = path.join(__dirname, '../../data/assets', userId);
        await fs.rmdir(userAssetsDir, { recursive: true });
      } catch (error) {
        console.warn(`Could not delete assets directory for user ${userId}:`, error);
        // Continue anyway, as the user was successfully deleted
      }
      
      res.status(200).json({ success: true, message: `User '${userId}' deleted` });
    } catch (error) {
      console.error(`Error deleting user ${req.params.userId}:`, error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  return router;
}

module.exports = createUserRouter; 