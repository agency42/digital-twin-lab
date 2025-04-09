import express, { Router, Request, Response } from 'express';
import AbstractionApproach from '../services/abstractionApproach';
import PromptService from '../services/promptService'; // Updated import
import { asyncHandler } from '../lib/asyncHandler';
import fs from 'fs/promises';
import path from 'path';

// Function to create the prompt router
function createPromptRouter(abstractionApproach: AbstractionApproach): Router {
    const router = express.Router();
    const promptService = new PromptService(); // Use new service

    // POST /api/prompts/:userId/generate - Generate a new base prompt
    router.post('/:userId/generate', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assetIds, customPrompt } = req.body;

        if (!userId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: userId and assetIds array.' });
        }
        
        // Call the refactored method, which now saves internally and returns the prompt string
        const generatedPromptText = await abstractionApproach.generateBasePrompt(userId, assetIds, customPrompt);
        
        // Fetch the saved base prompt record to return full details
        const savedPrompt = await promptService.getUserBasePrompt(userId);
        if (!savedPrompt) {
            // This shouldn't happen if generation and saving succeeded
            throw new Error('Failed to retrieve base prompt immediately after generation.');
        }
        
        // Return the full saved prompt object (including ID, text, etc.)
        return res.status(201).json(savedPrompt);
    }));

    // POST /api/prompts/:userId/generate-character-card - Generate a new character card
    router.post('/:userId/generate-character-card', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assetIds, customPrompt } = req.body;

        if (!userId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: userId and assetIds array.' });
        }
        
        // Generate the character card
        const characterCardString = await abstractionApproach.generateCharacterCard(userId, assetIds, customPrompt);
        
        // Fetch the saved base prompt record to return full details
        const savedPrompt = await promptService.getUserBasePrompt(userId);
        if (!savedPrompt) {
            // This shouldn't happen if generation and saving succeeded
            throw new Error('Failed to retrieve character card immediately after generation.');
        }
        
        // Return the full saved prompt object (including ID, text, etc.)
        return res.status(201).json(savedPrompt);
    }));

    // GET /api/prompts/character-card-template - Get the current character card template
    router.get('/character-card-template', asyncHandler(async (_req: Request, res: Response) => {
        try {
            const templatePath = path.join(__dirname, '../../data/character_card_template.json');
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(templateContent);
            return res.status(200).json(template);
        } catch (error: any) {
            console.error('Error loading character card template:', error);
            return res.status(500).json({ 
                error: 'Failed to load character card template',
                details: error.message
            });
        }
    }));

    // POST /api/prompts/character-card-template - Update the character card template
    router.post('/character-card-template', asyncHandler(async (req: Request, res: Response) => {
        const newTemplate = req.body;
        
        if (!newTemplate || typeof newTemplate !== 'object') {
            return res.status(400).json({ error: 'Invalid template format. Expected JSON object.' });
        }
        
        try {
            const templatePath = path.join(__dirname, '../../data/character_card_template.json');
            await fs.writeFile(templatePath, JSON.stringify(newTemplate, null, 2), 'utf8');
            return res.status(200).json({ 
                success: true, 
                message: 'Character card template updated successfully' 
            });
        } catch (error: any) {
            console.error('Error saving character card template:', error);
            return res.status(500).json({ 
                error: 'Failed to save character card template',
                details: error.message
            });
        }
    }));

    // GET /api/prompts/:userId - Get the base prompt for a user
    router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        
        const prompt = await promptService.getUserBasePrompt(userId);
        if (prompt) {
            // Return the prompt object directly (prompt_text is already a string)
            return res.status(200).json(prompt);
        } else {
            return res.status(404).json({ error: 'Base prompt not found for this user.' });
        }
    }));

    // DELETE /api/prompts/:userId - Delete the base prompt
    router.delete('/:userId', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        
        const result = await promptService.deleteBasePrompt(userId);
        if (result.success) {
             // Safely access changes, defaulting to 0 if undefined
             const changesCount = result.changes ?? 0; 
             // Use message from service if available, otherwise provide default based on changesCount
             const message = result.message || (changesCount > 0 ? 'Base prompt deleted successfully.' : 'No base prompt found to delete.');
             // Return changesCount in the response
             return res.status(200).json({ message: message, changes: changesCount });
        } else {
             // Use message from service if available
             throw new Error(result.message || 'Failed to delete base prompt.'); 
        }
    }));
    
    // --- Variations --- 

    // POST /api/prompts/:userId/variations/:moduleContext - Save/Update a variation
    router.post('/:userId/variations/:moduleContext', asyncHandler(async (req: Request, res: Response) => {
         const { userId, moduleContext } = req.params;
         // Expecting systemPromptOverride in the body now
         const { systemPromptOverride } = req.body; 
         
         if (!userId || !moduleContext) {
              return res.status(400).json({ error: 'User ID and moduleContext parameters are required.' });
         }
         // Allow null or string for the override
         if (systemPromptOverride !== null && typeof systemPromptOverride !== 'string') {
              return res.status(400).json({ error: 'Invalid systemPromptOverride provided. Must be a string or null.' });
         }

         const result = await promptService.saveVariation(userId, moduleContext, systemPromptOverride);
         // Result from saveVariation is { variationId: string }
         return res.status(200).json({ 
            success: true, 
            message: `Variation for module '${moduleContext}' saved successfully.`, 
            variationId: result.variationId 
         });
    }));
    
    // GET /api/prompts/:userId/variations/:moduleContext - Get a specific variation
    router.get('/:userId/variations/:moduleContext', asyncHandler(async (req: Request, res: Response) => {
         const { userId, moduleContext } = req.params;
          if (!userId || !moduleContext) {
               return res.status(400).json({ error: 'User ID and moduleContext parameters are required.' });
         }
         
         const variation = await promptService.getVariation(userId, moduleContext);
         if (variation) {
             return res.status(200).json(variation);
         } else {
             return res.status(404).json({ error: `Variation for module '${moduleContext}' not found.` });
         }
    }));

    // DELETE /api/prompts/:userId/variations/:moduleContext - Delete a variation
    router.delete('/:userId/variations/:moduleContext', asyncHandler(async (req: Request, res: Response) => {
         const { userId, moduleContext } = req.params;
         if (!userId || !moduleContext) {
              return res.status(400).json({ error: 'User ID and moduleContext parameters are required.' });
         }
         
         const result = await promptService.deleteVariation(userId, moduleContext);
         if (result.success) {
             const message = result.changes > 0 
                 ? `Variation for module '${moduleContext}' deleted.`
                 : `No existing variation found for module '${moduleContext}', considered deleted.`;
             return res.status(200).json({ success: true, message: message, changes: result.changes }); 
         } else {
             console.error(`PromptService.deleteVariation failed for user ${userId}, module ${moduleContext}`);
             throw new Error(`Failed to delete variation for module '${moduleContext}'.`); 
         }
    }));

    return router;
}

// Update the export name
export default createPromptRouter; 