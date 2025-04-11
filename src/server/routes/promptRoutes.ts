import express, { Router, Request, Response } from 'express';
import AbstractionApproach from '../services/abstractionApproach';
import PromptService from '../services/promptService';
import { asyncHandler } from '../lib/asyncHandler';
import fs from 'fs/promises';
import path from 'path';
// import { logger } from '../lib/logger'; // Assuming logger setup - REMOVED FOR NOW

// Basic logger replacement
const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
};

function createPromptRouter(abstractionApproach: AbstractionApproach): Router {
    const router = express.Router();
    const promptService = new PromptService();

    // POST /api/prompts/:userId/generate-character-card - Generate and save a new character card
    router.post('/:userId/generate-character-card', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { assetIds, customPrompt } = req.body;

        if (!userId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: userId and assetIds array.' });
        }

        // 1. Generate the character card content
        const characterCardString = await abstractionApproach.generateCharacterCard(userId, assetIds, customPrompt);

        // 2. Save the generated card using the updated service method
        const savedCard = await promptService.saveCharacterCard(userId, characterCardString, {
             basedOnAssetIds: assetIds
             // Optionally pass cardName if available from request or generation
        });

        return res.status(201).json(savedCard);
    }));

    // GET /api/prompts/:userId/current-character-card - Get the user's current character card
    router.get('/:userId/current-character-card', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        const card = await promptService.getCurrentCharacterCard(userId);
        if (card) {
            return res.status(200).json(card);
        } else {
            return res.status(404).json({ error: 'Current character card not found for this user.' });
        }
    }));

    // GET /api/prompts/:userId/generations-data - Get data for Chat/Post tabs
    router.get('/:userId/generations-data', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const type = req.query.type as 'chat' | 'post';

        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        if (type !== 'chat' && type !== 'post') {
            return res.status(400).json({ error: "Invalid or missing 'type' query parameter (must be 'chat' or 'post')" });
        }

        const data = await promptService.getGenerationsData(userId, type);
        return res.status(200).json(data); // Sends { characterCard, systemPrompt, instructionTemplate }
    }));

    // PUT /api/prompts/:userId/system-prompts/:type - Save/Update a system prompt
    router.put('/:userId/system-prompts/:type', asyncHandler(async (req: Request, res: Response) => {
        const { userId, type } = req.params as { userId: string; type: 'chat' | 'post' };
        const { promptText } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        if (type !== 'chat' && type !== 'post') {
            return res.status(400).json({ error: "Invalid type parameter (must be 'chat' or 'post')" });
        }
        if (typeof promptText !== 'string') {
            return res.status(400).json({ error: "Missing or invalid 'promptText' in request body." });
        }

        const savedPrompt = await promptService.saveSystemPrompt(userId, type, promptText);
        return res.status(200).json(savedPrompt);
    }));
    
    // POST /api/prompts/:userId/system-prompts/:type/reset - Reset a system prompt to the character card
    router.post('/:userId/system-prompts/:type/reset', asyncHandler(async (req: Request, res: Response) => {
        const { userId, type } = req.params as { userId: string; type: 'chat' | 'post' };

        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        if (type !== 'chat' && type !== 'post') {
            return res.status(400).json({ error: "Invalid type parameter (must be 'chat' or 'post')" });
        }

        const resetPrompt = await promptService.resetSystemPrompt(userId, type);
        if (resetPrompt) {
            return res.status(200).json(resetPrompt);
        } else {
            // This case should be handled by error in service if card doesn't exist
            return res.status(404).json({ error: 'Could not reset prompt, character card may be missing.' });
        }
    }));

    // PUT /api/prompts/:userId/instruction-templates/:type - Save/Update an instruction template
    router.put('/:userId/instruction-templates/:type', asyncHandler(async (req: Request, res: Response) => {
        const { userId, type } = req.params as { userId: string; type: 'chat' | 'post' };
        const { instructionText } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        if (type !== 'chat' && type !== 'post') {
            return res.status(400).json({ error: "Invalid type parameter (must be 'chat' or 'post')" });
        }
        if (typeof instructionText !== 'string') {
            return res.status(400).json({ error: "Missing or invalid 'instructionText' in request body." });
        }

        const savedTemplate = await promptService.saveInstructionTemplate(userId, type, instructionText);
        return res.status(200).json(savedTemplate);
    }));

    // --- Template File Endpoints (Keep as is for now) ---
    router.get('/character-card-template', asyncHandler(async (_req: Request, res: Response) => {
        try {
            const templatePath = path.join(__dirname, '../../data/character_card_template.json');
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(templateContent);
            return res.status(200).json(template);
        } catch (error: any) {
            logger.error('Error loading character card template:', error);
            return res.status(500).json({ error: 'Failed to load character card template', details: error.message });
        }
    }));
    router.post('/character-card-template', asyncHandler(async (req: Request, res: Response) => {
        const newTemplate = req.body;
        if (!newTemplate || typeof newTemplate !== 'object') {
            return res.status(400).json({ error: 'Invalid template format. Expected JSON object.' });
        }
        try {
            const templatePath = path.join(__dirname, '../../data/character_card_template.json');
            await fs.writeFile(templatePath, JSON.stringify(newTemplate, null, 2), 'utf8');
            return res.status(200).json({ success: true, message: 'Character card template updated successfully' });
        } catch (error: any) {
            logger.error('Error saving character card template:', error);
            return res.status(500).json({ error: 'Failed to save character card template', details: error.message });
        }
    }));
    // --- End Template File Endpoints ---

    // --- REMOVE OLD ENDPOINTS ---
    // Remove GET /api/prompts/:userId
    // Remove DELETE /api/prompts/:userId
    // Remove POST /api/prompts/:userId/variations/:moduleContext
    // Remove GET /api/prompts/:userId/variations/:moduleContext
    // Remove DELETE /api/prompts/:userId/variations/:moduleContext
    // Remove POST /api/prompts/:userId/generate

    return router;
}

export default createPromptRouter;