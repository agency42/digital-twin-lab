import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates and configures a router for component-related endpoints (character cards and instruction sets)
 */
export default function createComponentRouter() {
    const router = Router();
    
    // Get all character cards for a user
    router.get('/:userId/character-cards', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const db = req.app.locals.db;
        
        const cards = await db.all(
            `SELECT * FROM character_cards WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        
        res.status(200).json(cards);
    }));
    
    // Get a specific character card
    router.get('/character-cards/:cardId', asyncHandler(async (req: Request, res: Response) => {
        const cardId = req.params.cardId;
        const db = req.app.locals.db;
        
        const card = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        if (!card) {
            return res.status(404).json({ error: 'Character card not found' });
        }
        
        res.status(200).json(card);
    }));
    
    // Create a new character card
    router.post('/:userId/character-cards', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { cardName, cardData, basedOnAssets } = req.body;
        const db = req.app.locals.db;
        
        // Validate required fields
        if (!cardData) {
            return res.status(400).json({ error: 'Card data is required' });
        }
        
        // Create card ID
        const cardId = uuidv4();
        const isDefault = req.body.isDefault || 0;
        
        // If this card is being set as default, clear other defaults
        if (isDefault) {
            await db.run(
                `UPDATE character_cards SET is_default = 0 WHERE user_id = ?`,
                [userId]
            );
        }
        
        // Insert the new character card
        await db.run(
            `INSERT INTO character_cards 
            (card_id, user_id, card_name, card_data, based_on_assets, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                cardId,
                userId,
                cardName || 'Character Card',
                JSON.stringify(cardData),
                basedOnAssets ? JSON.stringify(basedOnAssets) : null,
                isDefault
            ]
        );
        
        // Get the inserted card
        const card = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        res.status(201).json(card);
    }));
    
    // Update a character card
    router.put('/character-cards/:cardId', asyncHandler(async (req: Request, res: Response) => {
        const cardId = req.params.cardId;
        const { cardName, cardData, isDefault } = req.body;
        const db = req.app.locals.db;
        
        // Get the current card to make sure it exists and to get the user_id
        const existingCard = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        if (!existingCard) {
            return res.status(404).json({ error: 'Character card not found' });
        }
        
        // If setting as default, clear other defaults
        if (isDefault) {
            await db.run(
                `UPDATE character_cards SET is_default = 0 WHERE user_id = ?`,
                [existingCard.user_id]
            );
        }
        
        // Update fields
        await db.run(
            `UPDATE character_cards 
            SET card_name = ?, card_data = ?, is_default = ?, updated_at = datetime('now')
            WHERE card_id = ?`,
            [
                cardName || existingCard.card_name,
                cardData ? JSON.stringify(cardData) : existingCard.card_data,
                isDefault !== undefined ? isDefault : existingCard.is_default,
                cardId
            ]
        );
        
        // Get the updated card
        const updatedCard = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        res.status(200).json(updatedCard);
    }));
    
    // Delete a character card
    router.delete('/character-cards/:cardId', asyncHandler(async (req: Request, res: Response) => {
        const cardId = req.params.cardId;
        const db = req.app.locals.db;
        
        // Check if the card exists
        const card = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        if (!card) {
            return res.status(404).json({ error: 'Character card not found' });
        }
        
        // Check if the card is in use by any prompt templates
        const usedInTemplates = await db.get(
            `SELECT COUNT(*) as count FROM prompt_templates WHERE card_id = ?`,
            [cardId]
        );
        
        if (usedInTemplates.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete character card that is in use by prompt templates',
                usedCount: usedInTemplates.count
            });
        }
        
        // Delete the card
        await db.run(
            `DELETE FROM character_cards WHERE card_id = ?`,
            [cardId]
        );
        
        res.status(200).json({ message: 'Character card deleted successfully' });
    }));
    
    // --- Instruction Set Endpoints ---
    
    // Get all instruction sets for a user
    router.get('/:userId/instruction-sets', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const db = req.app.locals.db;
        
        const instructionSets = await db.all(
            `SELECT * FROM instruction_sets WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        
        res.status(200).json(instructionSets);
    }));
    
    // Get instruction sets for a specific medium
    router.get('/:userId/instruction-sets/medium/:medium', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const medium = req.params.medium;
        const db = req.app.locals.db;
        
        const instructionSets = await db.all(
            `SELECT * FROM instruction_sets 
            WHERE user_id = ? AND (medium = ? OR medium IS NULL) 
            ORDER BY medium DESC, created_at DESC`,
            [userId, medium]
        );
        
        res.status(200).json(instructionSets);
    }));
    
    // Get a specific instruction set
    router.get('/instruction-sets/:instructionId', asyncHandler(async (req: Request, res: Response) => {
        const instructionId = req.params.instructionId;
        const db = req.app.locals.db;
        
        const instructionSet = await db.get(
            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        if (!instructionSet) {
            return res.status(404).json({ error: 'Instruction set not found' });
        }
        
        res.status(200).json(instructionSet);
    }));
    
    // Create a new instruction set
    router.post('/:userId/instruction-sets', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { instructionName, instructionData, medium, isDefault } = req.body;
        const db = req.app.locals.db;
        
        // Validate required fields
        if (!instructionData) {
            return res.status(400).json({ error: 'Instruction data is required' });
        }
        
        // Create instruction ID
        const instructionId = uuidv4();
        
        // If this instruction is being set as default (overall or for a specific medium)
        if (isDefault) {
            if (medium) {
                // Clear default for this specific medium
                await db.run(
                    `UPDATE instruction_sets SET is_default = 0 
                    WHERE user_id = ? AND medium = ?`,
                    [userId, medium]
                );
            } else {
                // Clear default for general instructions
                await db.run(
                    `UPDATE instruction_sets SET is_default = 0 
                    WHERE user_id = ? AND medium IS NULL`,
                    [userId]
                );
            }
        }
        
        // Insert the new instruction set
        await db.run(
            `INSERT INTO instruction_sets 
            (instruction_id, user_id, instruction_name, instruction_data, medium, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                instructionId,
                userId,
                instructionName || 'Instruction Set',
                JSON.stringify(instructionData),
                medium || null,
                isDefault || 0
            ]
        );
        
        // Get the inserted instruction set
        const instructionSet = await db.get(
            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        res.status(201).json(instructionSet);
    }));
    
    // Update an instruction set
    router.put('/instruction-sets/:instructionId', asyncHandler(async (req: Request, res: Response) => {
        const instructionId = req.params.instructionId;
        const { instructionName, instructionData, medium, isDefault } = req.body;
        const db = req.app.locals.db;
        
        // Get the current instruction set to make sure it exists
        const existingInstructionSet = await db.get(
            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        if (!existingInstructionSet) {
            return res.status(404).json({ error: 'Instruction set not found' });
        }
        
        // If setting as default, clear other defaults
        if (isDefault) {
            const mediumToUse = medium !== undefined ? medium : existingInstructionSet.medium;
            if (mediumToUse) {
                // Clear default for this specific medium
                await db.run(
                    `UPDATE instruction_sets SET is_default = 0 
                    WHERE user_id = ? AND medium = ? AND instruction_id != ?`,
                    [existingInstructionSet.user_id, mediumToUse, instructionId]
                );
            } else {
                // Clear default for general instructions
                await db.run(
                    `UPDATE instruction_sets SET is_default = 0 
                    WHERE user_id = ? AND medium IS NULL AND instruction_id != ?`,
                    [existingInstructionSet.user_id, instructionId]
                );
            }
        }
        
        // Update fields
        await db.run(
            `UPDATE instruction_sets 
            SET instruction_name = ?, instruction_data = ?, medium = ?, is_default = ?, 
                updated_at = datetime('now')
            WHERE instruction_id = ?`,
            [
                instructionName !== undefined ? instructionName : existingInstructionSet.instruction_name,
                instructionData ? JSON.stringify(instructionData) : existingInstructionSet.instruction_data,
                medium !== undefined ? medium : existingInstructionSet.medium,
                isDefault !== undefined ? isDefault : existingInstructionSet.is_default,
                instructionId
            ]
        );
        
        // Get the updated instruction set
        const updatedInstructionSet = await db.get(
            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        res.status(200).json(updatedInstructionSet);
    }));
    
    // Delete an instruction set
    router.delete('/instruction-sets/:instructionId', asyncHandler(async (req: Request, res: Response) => {
        const instructionId = req.params.instructionId;
        const db = req.app.locals.db;
        
        // Check if the instruction set exists
        const instructionSet = await db.get(
            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        if (!instructionSet) {
            return res.status(404).json({ error: 'Instruction set not found' });
        }
        
        // Check if the instruction set is in use by any prompt templates
        const usedInTemplates = await db.get(
            `SELECT COUNT(*) as count FROM prompt_templates WHERE instruction_id = ?`,
            [instructionId]
        );
        
        if (usedInTemplates.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete instruction set that is in use by prompt templates',
                usedCount: usedInTemplates.count
            });
        }
        
        // Delete the instruction set
        await db.run(
            `DELETE FROM instruction_sets WHERE instruction_id = ?`,
            [instructionId]
        );
        
        res.status(200).json({ message: 'Instruction set deleted successfully' });
    }));
    
    // --- Prompt Template Endpoints ---
    
    // Get all prompt templates for a user
    router.get('/:userId/templates', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const db = req.app.locals.db;
        
        const templates = await db.all(
            `SELECT t.*, 
                    cc.card_name, 
                    ins.instruction_name 
             FROM prompt_templates t
             LEFT JOIN character_cards cc ON t.card_id = cc.card_id
             LEFT JOIN instruction_sets ins ON t.instruction_id = ins.instruction_id
             WHERE t.user_id = ? 
             ORDER BY t.created_at DESC`,
            [userId]
        );
        
        res.status(200).json(templates);
    }));
    
    // Create a new prompt template
    router.post('/:userId/templates', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { templateName, cardId, instructionId, isDefault } = req.body;
        const db = req.app.locals.db;
        
        // Validate required fields
        if (!cardId) {
            return res.status(400).json({ error: 'Character card ID is required' });
        }
        
        // Check if the character card exists
        const card = await db.get(
            `SELECT * FROM character_cards WHERE card_id = ? AND user_id = ?`,
            [cardId, userId]
        );
        
        if (!card) {
            return res.status(404).json({ error: 'Character card not found or does not belong to this user' });
        }
        
        // Check if the instruction set exists (if provided)
        let instructionSet = null;
        if (instructionId) {
            instructionSet = await db.get(
                `SELECT * FROM instruction_sets WHERE instruction_id = ? AND user_id = ?`,
                [instructionId, userId]
            );
            
            if (!instructionSet) {
                return res.status(404).json({ error: 'Instruction set not found or does not belong to this user' });
            }
        }
        
        // Create template ID
        const templateId = uuidv4();
        
        // If this template is being set as default, clear other defaults
        if (isDefault) {
            await db.run(
                `UPDATE prompt_templates SET is_default = 0 WHERE user_id = ?`,
                [userId]
            );
        }
        
        // Assemble the prompt (combining card and instructions)
        let assembledPrompt = card.card_data;
        try {
            const cardData = JSON.parse(card.card_data);
            
            if (instructionSet) {
                // Combine with instruction data
                const instructionData = JSON.parse(instructionSet.instruction_data);
                assembledPrompt = JSON.stringify({
                    ...cardData,
                    ...instructionData
                });
            } else {
                // Just use card data formatted as JSON string
                assembledPrompt = JSON.stringify(cardData);
            }
        } catch (error) {
            console.error('Error assembling prompt:', error);
            // Fall back to concatenating strings if JSON parsing fails
            assembledPrompt = card.card_data;
            if (instructionSet) {
                assembledPrompt += "\n" + instructionSet.instruction_data;
            }
        }
        
        // Insert the new template
        await db.run(
            `INSERT INTO prompt_templates 
            (template_id, user_id, template_name, card_id, instruction_id, assembled_prompt, 
             is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                templateId,
                userId,
                templateName || 'Prompt Template',
                cardId,
                instructionId || null,
                assembledPrompt,
                isDefault || 0
            ]
        );
        
        // Get the inserted template with related info
        const template = await db.get(
            `SELECT t.*, 
                    cc.card_name, 
                    ins.instruction_name 
             FROM prompt_templates t
             LEFT JOIN character_cards cc ON t.card_id = cc.card_id
             LEFT JOIN instruction_sets ins ON t.instruction_id = ins.instruction_id
             WHERE t.template_id = ?`,
            [templateId]
        );
        
        res.status(201).json(template);
    }));
    
    return router;
} 