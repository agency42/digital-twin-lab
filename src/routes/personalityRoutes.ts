import express, { Router, Request, Response } from 'express';
import AbstractionApproach from '../services/abstractionApproach'; // Import TS version
import PersonalityProfileService from '../services/personalityProfileService'; // Import TS version
import { asyncHandler } from '../lib/asyncHandler'; // Import the wrapper

// Function to create the personality router
function createPersonalityRouter(abstractionApproach: AbstractionApproach): Router {
    const router = express.Router();
    const personalityService = new PersonalityProfileService(); // Instantiate service here

    // POST /api/personality/:userId/generate - Generate a new personality profile
    router.post('/:userId/generate', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assetIds, customPrompt } = req.body; // Assuming { assetIds: string[], customPrompt?: string }

        if (!userId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            res.status(400).json({ error: 'Missing required fields: userId and assetIds array.' });
            return; // Explicit return
        }
        
        // generatePersonality now saves the persona and throws on error
        await abstractionApproach.generatePersonality(userId, assetIds, customPrompt);
        
        // Fetch the saved persona to return it (including ID, timestamps)
        const savedPersona = await personalityService.getUserPrimaryPersona(userId);
        
        if (!savedPersona) {
            throw new Error('Failed to confirm persona generation after successful AI call.');
        }
        
        res.status(201).json(savedPersona); 
        return; // Explicit return
    }));

    // GET /api/personality/:userId - Get the primary personality profile for a user
    router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ error: 'User ID parameter is required' });
            return; // Explicit return
        }
        
        const persona = await personalityService.getUserPrimaryPersona(userId);

        if (persona) {
            let parsedJson: any = null; 
            try {
                parsedJson = JSON.parse(persona.persona_json);
                res.status(200).json({ ...persona, persona_json: parsedJson });
            } catch (parseError: any) {
                 console.error(`Error parsing persona JSON for user ${userId}:`, parseError);
                res.status(200).json({ ...persona, warning: 'Failed to parse persona_json content.' });
            }
        } else {
            res.status(404).json({ error: 'Primary personality profile not found for this user.' });
        }
        return; // Explicit return
    }));

    // DELETE /api/personality/:userId - Delete the primary personality profile
    router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ error: 'User ID parameter is required' });
            return; // Explicit return
        }
        
        const result = await personalityService.deletePrimaryPersona(userId);
        
        if (result.success) {
             res.status(200).json({ message: result.message || 'Primary personality profile deleted successfully.', changes: result.changes });
             return; // Explicit return
        } else {
             throw new Error(result.message || 'Failed to delete personality profile.');
        }
    }));
    
    // --- Variations --- 

    // POST /api/personality/:userId/variations/:module - Save/Update a variation
    router.post('/:userId/variations/:module', asyncHandler(async (req: Request, res: Response) => {
         const { userId, module } = req.params;
         const { systemPrompt } = req.body; // Expects { systemPrompt: string | null }
         
         if (!userId || !module) {
              res.status(400).json({ error: 'User ID and module parameters are required.' });
              return; // Explicit return
         }
         // Allow null or string for systemPrompt
         if (systemPrompt !== null && typeof systemPrompt !== 'string') {
              res.status(400).json({ error: 'Invalid systemPrompt provided. Must be a string or null.' });
              return; // Explicit return
         }

         const result = await personalityService.saveVariation(userId, module, systemPrompt);
         res.status(200).json({ 
            success: true, 
            message: `Variation for module '${module}' saved successfully.`, 
            variationId: result.variationId 
         });
         return; // Explicit return
    }));
    
    // GET /api/personality/:userId/variations/:module - Get a specific variation
    router.get('/:userId/variations/:module', asyncHandler(async (req: Request, res: Response) => {
         const { userId, module } = req.params;
          if (!userId || !module) {
               res.status(400).json({ error: 'User ID and module parameters are required.' });
               return; // Explicit return
         }
         
         const variation = await personalityService.getVariation(userId, module);
         if (variation) {
             res.status(200).json(variation);
         } else {
             res.status(404).json({ error: `Variation for module '${module}' not found.` });
         }
         return; // Explicit return
    }));

    // DELETE /api/personality/:userId/variations/:module - Delete a variation
    router.delete('/:userId/variations/:module', asyncHandler(async (req: Request, res: Response) => {
         const { userId, module } = req.params;
         if (!userId || !module) {
              res.status(400).json({ error: 'User ID and module parameters are required.' });
              return; // Explicit return
         }
         
         const result = await personalityService.deleteVariation(userId, module);
         if (result.success && result.changes > 0) {
             res.status(200).json({ success: true, message: `Variation for module '${module}' deleted.` });
             return; // Explicit return
         } else if (result.success && result.changes === 0) {
             res.status(404).json({ success: false, error: `Variation for module '${module}' not found.` });
             return; // Explicit return
         } else {
             throw new Error('Failed to delete variation.');
         }
    }));

    return router;
}

export default createPersonalityRouter; 