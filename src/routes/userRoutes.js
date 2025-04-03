const express = require('express');
const UserDataService = require('../services/userDataService');

function createUserRouter() {
  const router = express.Router();
  const userDataService = new UserDataService();

  // GET /api/users - List all user IDs
  router.get('/', async (req, res) => {
    try {
      const userIds = await userDataService.getAllUserIds();
      res.status(200).json(userIds);
    } catch (error) {
      console.error("Error getting user IDs:", error);
      res.status(500).json({ error: 'Failed to retrieve user list.', details: error.message });
    }
  });

  // POST /api/users - Create a new user
  router.post('/', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing required field: userId' });
      }
      // Basic validation for userId (prevent problematic characters)
      if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
          return res.status(400).json({ error: 'User ID can only contain letters, numbers, underscores, and hyphens.' });
      }

      const newUser = await userDataService.createUser(userId);
      res.status(201).json(newUser); // Return the newly created user object
    } catch (error) {
      console.error(`Error creating user '${req.body.userId}':`, error);
      // Handle specific error for existing user
      if (error.message.includes('already exists')) {
           return res.status(409).json({ error: error.message }); // 409 Conflict
      }
      res.status(500).json({ error: 'Failed to create user.', details: error.message });
    }
  });

  // GET /api/users/:userId - Get specific user data
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const userData = await userDataService.getUserData(userId);
      if (userData) {
        res.status(200).json(userData);
      } else {
        res.status(404).json({ error: `User ID '${userId}' not found.` });
      }
    } catch (error) {
      console.error(`Error getting user data for '${req.params.userId}':`, error);
      res.status(500).json({ error: 'Failed to retrieve user data.', details: error.message });
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

  // DELETE /api/users/:userId - Delete a user
  router.delete('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // TODO: Add logic here to also delete associated assets (files and registry entries)
      // This requires careful implementation to avoid deleting shared assets if applicable.
      // For now, it only deletes the user profile entry.
      console.warn(`User deletion currently only removes the profile from personas.json. Associated assets in data/assets/ and assets.json are NOT deleted.`);

      const deleted = await userDataService.deleteUser(userId);
      if (deleted) {
        res.status(204).send(); // No content, successful deletion
      } else {
        res.status(404).json({ error: `User ID '${userId}' not found.` });
      }
    } catch (error) {
       console.error(`Error deleting user '${req.params.userId}':`, error);
       res.status(500).json({ error: 'Failed to delete user.', details: error.message });
    }
  });

  return router;
}

module.exports = createUserRouter; 