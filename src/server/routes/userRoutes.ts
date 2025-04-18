import express, { Router, Request, Response } from 'express';
import userDataService from '../services/userDataService'; // Import TS default export
import AssetProcessor from '../services/assetProcessor'; // Import TS version
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '../lib/asyncHandler'; // Import the wrapper
import { dbRun, dbAll } from '../lib/database'; // Import the dbRun function

// Function to create the user router
function createUserRouter(): Router {
    const router = express.Router();
    const assetProcessor = new AssetProcessor(); // Instantiate AssetProcessor

    // GET /api/users - Get all user IDs
    router.get('/', asyncHandler(async (_: Request, res: Response) => {
        // Get all users from database using the service
        const userIds = await userDataService.getAllUserIds();
        res.status(200).json(userIds);
    }));

    // POST /api/users - Create a new user
    router.post('/', asyncHandler(async (req: Request, res: Response) => { // Wrap handler
        const { userId, bio } = req.body; // Expect { userId: string, bio?: string }
        if (!userId) {
            res.status(400).json({ error: 'Missing required field: userId' });
            return; // Explicit return
        }
        
        // Check if user already exists?
        const existingUser = await userDataService.getUserData(userId);
        if (existingUser) {
            res.status(409).json({ error: `User ID '${userId}' already exists.` });
            return; // Explicit return
        }

        // createUser throws on error
        await userDataService.createUser(userId, { bio });
        
        // Fetch the newly created user data to return it
        const newUser = await userDataService.getUserData(userId);
        if (!newUser) {
             // If user creation succeeded but fetching failed, throw error
             throw new Error('Failed to retrieve user after creation.');
        }
        
        res.status(201).json(newUser);
        return; // Explicit return
    }));

    // GET /api/users/:userId - Get comprehensive user data
    router.get('/:userId', asyncHandler(async (req: Request, res: Response) => { // Wrap handler
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ error: 'Missing userId parameter' });
            return; // Explicit return
        }
        
        // getUserData returns null if not found, throws on other errors
        const userData = await userDataService.getUserData(userId);
        
        if (userData) {
            res.status(200).json(userData);
        } else {
            res.status(404).json({ error: `User ID '${userId}' not found` });
        }
        return; // Explicit return
    }));

    // PUT /api/users/:userId - Update user data (e.g., bio)
    router.put('/:userId', asyncHandler(async (req: Request, res: Response) => { // Wrap handler
        const { userId } = req.params;
        const updateData = req.body; // Contains fields like { bio: "..." }
        
        if (!userId) {
            res.status(400).json({ error: 'Missing userId parameter' });
            return; // Explicit return
        }
        if (!updateData || Object.keys(updateData).length === 0) {
             res.status(400).json({ error: 'No update data provided.' });
             return; // Explicit return
        }

        // Let the service handle filtering valid fields and potential errors
        // updateUserData throws on DB error, returns success/changes otherwise
        const result = await userDataService.updateUserData(userId, updateData);

        if (result.success && result.changes > 0) {
            // Fetch updated user data to return
            const updatedUser = await userDataService.getUserData(userId);
             if (!updatedUser) { // Handle case where fetch fails after successful update
                 throw new Error('Failed to retrieve user data after successful update.');
             }
            res.status(200).json(updatedUser);
        } else if (result.success && result.changes === 0) {
            // No changes were made (e.g., data was the same, or user not found by update)
             const existingUser = await userDataService.getUserData(userId);
             if (!existingUser) {
                res.status(404).json({ error: `User ID '${userId}' not found.` });
             } else {
                res.status(200).json(existingUser); // Return current data if no change
             }
        } else {
             // If updateUserData itself failed (should have thrown, but belts & braces)
             throw new Error('Failed to update user data.');
        }
        return; // Explicit return
    }));

    // DELETE /api/users/:userId - Delete a user
    router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => { // Wrap handler
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ error: 'Missing userId parameter' });
            return; // Explicit return
        }

        // First, attempt to delete all assets associated with the user
        // Use assetProcessor instance
        try {
            const allAssets = await assetProcessor.getAllAssets(userId);
            if (allAssets.length > 0) {
                const assetIdsToDelete = allAssets.map(a => a.asset_id);
                await assetProcessor.deleteAssets(userId, assetIdsToDelete);
            }
            // Also attempt to delete the user's asset directory
             const sanitizedUserId = assetProcessor.sanitizeUserId(userId);
             const userAssetsDir = path.join(__dirname, '../../../data/assets', sanitizedUserId);
             try {
                 await fs.rm(userAssetsDir, { recursive: true, force: true });
             } catch (dirError: any) {
                 // Log failure to delete directory, but don't stop user deletion
                 console.warn(`Could not delete assets directory ${userAssetsDir} for user ${userId}:`, dirError);
             }
        } catch (assetError: any) {
             console.error(`Error deleting assets for user ${userId} during user deletion:`, assetError);
             // Decide whether to proceed with user deletion if asset deletion fails
             // For now, let's proceed but log the error.
             // Note: Consider throwing here if asset deletion failure should halt user deletion.
        }

        // Now delete the user record (DB cascades should handle related tables)
        // deleteUser throws on DB error, returns success/changes otherwise
        const result = await userDataService.deleteUser(userId);

        if (result.success && result.changes > 0) {
            res.status(200).json({ success: true, message: `User '${userId}' deleted successfully.` });
            return; // Explicit return
        } else if (result.success && result.changes === 0) {
             res.status(404).json({ success: false, error: `User ID '${userId}' not found for deletion.` });
             return; // Explicit return
        } else {
             // Should have thrown, but handle if it returns success:false
             throw new Error('Failed to delete user.');
        }
    }));

    // POST /api/users/:userId/assessment - Store user assessment results
    router.post('/:userId/assessment', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { userTipiScores } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId parameter' });
            return;
        }

        if (!userTipiScores || typeof userTipiScores !== 'object') {
            res.status(400).json({ error: 'Invalid or missing userTipiScores in request body' });
            return;
        }

        try {
            // Ensure the assessment_data column exists
            const cols = await dbAll<{ name: string }>(`PRAGMA table_info(users)`);
            if (!cols.some(col => col.name === 'assessment_data')) {
                await dbRun(`ALTER TABLE users ADD COLUMN assessment_data TEXT DEFAULT '{}'`);
            }

            // Now update the user record with assessment data
            const updateQuery = `
                UPDATE users 
                SET assessment_data = json_patch(COALESCE(assessment_data, '{}'), ?)
                WHERE user_id = ?
            `;

            // Create a JSON object with the updated assessment data
            const assessmentPatch = JSON.stringify({ userTipiScores });

            await dbRun(updateQuery, [assessmentPatch, userId]);

            res.status(200).json({ 
                message: 'Assessment data updated successfully',
                userId
            });
        } catch (error) {
            console.error('Error updating assessment data:', error);
            res.status(500).json({ error: 'Failed to update assessment data' });
        }
    }));

    return router;
}

export default createUserRouter; 