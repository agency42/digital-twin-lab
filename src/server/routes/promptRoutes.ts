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

    // GET /api/prompts/:userId/generations-data - Get all data needed for the Generations tab
    router.get('/:userId/generations-data', asyncHandler(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const type = req.query.type as 'chat' | 'post';

        if (!userId) {
            return res.status(400).json({ error: 'User ID parameter is required' });
        }
        if (type !== 'chat' && type !== 'post') {
            return res.status(400).json({ error: "Invalid type parameter (must be 'chat' or 'post')" });
        }

        try {
            // This will return the current character card, system prompt, and instruction template
            // Note that the instruction template may now include mainGoal and examples from metadata
            const data = await promptService.getGenerationsData(userId, type);
            return res.status(200).json(data);
        } catch (error: any) {
            logger.error(`Error getting generations data for ${userId}/${type}:`, error);
            return res.status(500).json({ error: `Failed to get generations data: ${error.message}` });
        }
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

    // Save instruction template for a specific type (main endpoint)
    router.put('/:userId/instruction-templates/:type', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const type = req.params.type as 'chat' | 'post' | 'assessment'; // only these types are supported
        const { instructionText, mainGoal, examples } = req.body;

        if (!instructionText) {
            throw new Error('Missing required field: instructionText');
        }

        const db = req.app.locals.db;

        try {
            // First check if user has an existing instruction template
            const existingTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (existingTemplate) {
                // Update existing instruction template
                await db.run(
                    `UPDATE instruction_templates 
                     SET instruction_text = ?, 
                         mainGoal = ?, 
                         examples = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND type = ?`,
                    [
                        instructionText,
                        mainGoal || null,
                        examples && examples.length ? JSON.stringify(examples) : null,
                        userId,
                        type
                    ]
                );
            } else {
                // Create new instruction template
                await db.run(
                    `INSERT INTO instruction_templates 
                     (user_id, type, instruction_text, mainGoal, examples, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        userId,
                        type,
                        instructionText,
                        mainGoal || null,
                        examples && examples.length ? JSON.stringify(examples) : null
                    ]
                );
            }

            // Get the updated/created template
            const updatedTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (!updatedTemplate) {
                throw new Error('Failed to retrieve updated instruction template');
            }

            // Parse examples if they exist
            if (updatedTemplate.examples) {
                try {
                    updatedTemplate.examples = JSON.parse(updatedTemplate.examples);
                } catch (error) {
                    console.error('Error parsing examples JSON:', error);
                    updatedTemplate.examples = [];
                }
            } else {
                updatedTemplate.examples = [];
            }

            res.status(200).json(updatedTemplate);
        } catch (error: any) {
            console.error('Error saving instruction template:', error);
            throw new Error(`Failed to save instruction template: ${error.message}`);
        }
    }));
    
    // Save main goal field only for a specific instruction template
    router.put('/:userId/instruction-templates/:type/main-goal', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const type = req.params.type as 'chat' | 'post' | 'assessment'; // only these types are supported
        const { mainGoal } = req.body;

        if (mainGoal === undefined) {
            throw new Error('Missing required field: mainGoal');
        }

        const db = req.app.locals.db;

        try {
            // First check if user has an existing instruction template
            const existingTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (existingTemplate) {
                // Update existing instruction template's main goal
                await db.run(
                    `UPDATE instruction_templates 
                     SET mainGoal = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND type = ?`,
                    [mainGoal || null, userId, type]
                );
            } else {
                // Create new instruction template with default instruction text and the provided main goal
                const defaultInstructionText = type === 'chat' 
                    ? "Engage in a helpful and informative conversation." 
                    : "Generate content for the specified platform following the main goal.";
                
                await db.run(
                    `INSERT INTO instruction_templates 
                     (user_id, type, instruction_text, mainGoal, created_at, updated_at)
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [userId, type, defaultInstructionText, mainGoal || null]
                );
            }

            // Get the updated/created template
            const updatedTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (!updatedTemplate) {
                throw new Error('Failed to retrieve updated instruction template');
            }

            // Send the raw template data back (frontend expects examples as JSON string)
            res.status(200).json(updatedTemplate);
        } catch (error: any) {
            console.error('Error saving main goal:', error);
            throw new Error(`Failed to save main goal: ${error.message}`);
        }
    }));
    
    // Save examples field only for a specific instruction template
    router.put('/:userId/instruction-templates/:type/examples', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const type = req.params.type as 'chat' | 'post' | 'assessment'; // only these types are supported
        const { examples } = req.body; // Expecting a string now

        // Updated validation: Expect a string (can be empty)
        if (typeof examples !== 'string') {
            throw new Error('Missing or invalid required field: examples must be a string');
        }

        const db = req.app.locals.db;
        const examplesToSave = examples.trim() || null; // Store null if empty string

        try {
            // First check if user has an existing instruction template
            const existingTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (existingTemplate) {
                // Update existing instruction template's examples
                await db.run(
                    `UPDATE instruction_templates 
                     SET examples = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND type = ?`,
                    [
                        examplesToSave, // Save the raw string (or null)
                        userId,
                        type
                    ]
                );
            } else {
                // Create new instruction template with default instruction text and the provided examples
                const defaultInstructionText = type === 'chat' 
                    ? "Engage in a helpful and informative conversation." 
                    : "Generate content for the specified platform following the examples provided.";
                
                await db.run(
                    `INSERT INTO instruction_templates 
                     (user_id, type, instruction_text, examples, created_at, updated_at)
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        userId,
                        type,
                        defaultInstructionText,
                        examplesToSave // Save the raw string (or null)
                    ]
                );
            }

            // Get the updated/created template
            const updatedTemplate = await db.get(
                `SELECT * FROM instruction_templates 
                 WHERE user_id = ? AND type = ?`,
                [userId, type]
            );

            if (!updatedTemplate) {
                throw new Error('Failed to retrieve updated instruction template');
            }

            // Send the raw template data back (frontend expects examples as JSON string or plain text)
            res.status(200).json(updatedTemplate);
        } catch (error: any) {
            console.error('Error saving examples:', error);
            throw new Error(`Failed to save examples: ${error.message}`);
        }
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

    return router;
}

export default createPromptRouter;