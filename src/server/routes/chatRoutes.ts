import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import ClaudeAPI from '../api/claude';

/**
 * Creates and configures a router for chat-related endpoints
 */
export default function createChatRouter() {
    const router = Router();
    const claudeAPI = new ClaudeAPI();
    
    // Chat endpoint
    router.post('/', asyncHandler(async (req: Request, res: Response) => {
        const { userId, systemPrompt, userMessage, temperature = 0.7, stream = true } = req.body;

        if (!userId || !userMessage) {
            throw new Error('Missing required fields: userId and userMessage');
        }
        const tempValue = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
        if (typeof tempValue !== 'number' || isNaN(tempValue) || tempValue < 0 || tempValue > 1) {
            throw new Error('Invalid temperature provided. Must be a number between 0 and 1');
        }

        console.log(`Chat request for user ${userId}. Stream: ${stream}`);

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            let fullResponseText = '';
            try {
                const streamResponse = await claudeAPI.generateCompletion(
                    [{ role: 'user', content: userMessage }],
                    { system: systemPrompt, temperature: tempValue, stream: true }
                );

                for await (const event of streamResponse as AsyncIterable<any>) {
                    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                        const textChunk = event.delta.text;
                        fullResponseText += textChunk;
                        res.write(`data: ${JSON.stringify({ type: 'chunk', data: textChunk })}\n\n`);
                    } else if (event.type === 'message_stop') {
                        res.write(`data: ${JSON.stringify({ type: 'complete', data: fullResponseText })}\n\n`);
                        res.end();
                        console.log('SSE Stream completed successfully.');
                        return;
                    } else if (event.type === 'error') {
                        console.error('Error event received from Claude stream:', event.error);
                        throw new Error(event.error?.message || 'Received error event from stream');
                    }
                }
                console.warn('SSE Stream ended without a proper message_stop event.');
                if (!res.writableEnded) {
                    res.end();
                }
            } catch (streamError: any) {
                console.error('Error during SSE stream processing:', streamError);
                if (!res.writableEnded) {
                    try {
                        res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message || 'Stream error' })}\n\n`);
                    } catch { /* Ignore */ }
                    res.end();
                }
            }

        } else {
            const responseText = await claudeAPI.generateCompletion(
                [{ role: 'user', content: userMessage }],
                { system: systemPrompt, temperature: tempValue, stream: false }
            ) as string;

            console.log('Non-stream response generated.');
            res.status(200).json({ response: responseText });
        }
    }));

    // Chat with persona endpoint
    router.post('/:userId/response', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { message, history, systemPrompt, mainGoal } = req.body;
        
        if (!userId || !message) {
            throw new Error('Missing required fields: userId (in path) and message (in body)');
        }
        
        // Future: Implement chat history tracking if needed
        
        const responseText = await claudeAPI.generateCompletion(
            [{ role: 'user', content: message }],
            { system: systemPrompt || '', temperature: 0.7, stream: false }
        ) as string;
        
        res.status(200).json({ 
            response: responseText, 
            userId, 
            timestamp: new Date().toISOString() 
        });
    }));

    // Content generation endpoint
    router.post('/:userId/generate-content', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { systemPrompt, medium, templateId, cardId, instructionId } = req.body;
        
        if (!userId) {
            throw new Error('Missing required field: userId (in path)');
        }

        if (!medium) {
            throw new Error('Medium is required for content generation');
        }
        
        // Different flows based on whether we're using the component-based approach or legacy
        let userMessage = '';
        let finalSystemPrompt = systemPrompt;
        let extractedInstructions = false;
        let characterData = null;
        let instructionData = null;
        
        try {
            // Check if we're using component IDs
            if (templateId || (cardId && instructionId)) {
                // Component-based approach
                console.log(`Using component-based approach for ${userId} with ${medium}`);
                
                // Get the database connection
                const db = req.app.locals.db;
                
                // If templateId is provided, get the template, character card, and instruction set
                if (templateId) {
                    // Fetch the template which references character card and instruction set
                    const template = await db.get(
                        `SELECT * FROM prompt_templates WHERE template_id = ? AND user_id = ?`,
                        [templateId, userId]
                    );
                    
                    if (!template) {
                        throw new Error(`Template not found: ${templateId}`);
                    }
                    
                    // Fetch the character card
                    const characterCard = await db.get(
                        `SELECT * FROM character_cards WHERE card_id = ?`,
                        [template.card_id]
                    );
                    
                    if (!characterCard) {
                        throw new Error(`Character card not found: ${template.card_id}`);
                    }
                    
                    characterData = JSON.parse(characterCard.card_data);
                    
                    // Fetch the instruction set if it exists
                    if (template.instruction_id) {
                        const instructionSet = await db.get(
                            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
                            [template.instruction_id]
                        );
                        
                        if (instructionSet) {
                            instructionData = JSON.parse(instructionSet.instruction_data);
                        }
                    }
                    
                    // Use the assembled prompt as fallback
                    finalSystemPrompt = template.assembled_prompt;
                }
                // If cardId and/or instructionId are provided directly
                else {
                    // Fetch the character card
                    if (cardId) {
                        const characterCard = await db.get(
                            `SELECT * FROM character_cards WHERE card_id = ? AND user_id = ?`,
                            [cardId, userId]
                        );
                        
                        if (!characterCard) {
                            throw new Error(`Character card not found: ${cardId}`);
                        }
                        
                        characterData = JSON.parse(characterCard.card_data);
                    }
                    
                    // Fetch the instruction set
                    if (instructionId) {
                        const instructionSet = await db.get(
                            `SELECT * FROM instruction_sets WHERE instruction_id = ? AND user_id = ?`,
                            [instructionId, userId]
                        );
                        
                        if (instructionSet) {
                            instructionData = JSON.parse(instructionSet.instruction_data);
                        }
                    }
                    
                    // Assemble the system prompt
                    if (characterData && instructionData) {
                        finalSystemPrompt = JSON.stringify({
                            ...characterData,
                            ...instructionData
                        });
                    }
                    else if (characterData) {
                        finalSystemPrompt = JSON.stringify(characterData);
                    }
                }
                
                // Determine the user message (instruction) to use
                if (instructionData) {
                    // Check for platform-specific instructions first
                    if (instructionData.platform_adaptations && 
                        instructionData.platform_adaptations[medium] && 
                        instructionData.platform_adaptations[medium].generation_instructions) {
                        userMessage = instructionData.platform_adaptations[medium].generation_instructions;
                        extractedInstructions = true;
                    } 
                    // Check for platform_instructions
                    else if (instructionData.platform_instructions && 
                             instructionData.platform_instructions[medium]) {
                        userMessage = instructionData.platform_instructions[medium];
                        extractedInstructions = true;
                    }
                    // Next check for medium-specific instructions
                    else if (instructionData[`${medium}_instructions`]) {
                        userMessage = instructionData[`${medium}_instructions`];
                        extractedInstructions = true;
                    }
                    // Finally check for generic instructions
                    else if (instructionData.generation_instructions) {
                        userMessage = instructionData.generation_instructions;
                        extractedInstructions = true;
                    }
                    // Check for main_goal, instructions, or directives as fallbacks
                    else if (instructionData.main_goal) {
                        userMessage = `${instructionData.main_goal}`;
                        extractedInstructions = true;
                    }
                    else if (instructionData.instructions && 
                             typeof instructionData.instructions === 'string') {
                        userMessage = instructionData.instructions;
                        extractedInstructions = true;
                    }
                }
                
                // Log what instructions were found
                console.log(`Using ${extractedInstructions ? 'component-extracted' : 'default'} instructions for ${medium}`);
            }
            // Legacy approach - parse the system prompt directly
            else if (systemPrompt) {
                console.log(`Using legacy approach for ${userId} with ${medium}`);
                
                // Try to parse the system prompt as JSON
                const systemPromptJson = JSON.parse(systemPrompt);
                
                // Check for platform-specific instructions first
                if (systemPromptJson.platform_adaptations && 
                    systemPromptJson.platform_adaptations[medium] && 
                    systemPromptJson.platform_adaptations[medium].generation_instructions) {
                    // Use platform-specific generation instructions
                    userMessage = systemPromptJson.platform_adaptations[medium].generation_instructions;
                    extractedInstructions = true;
                } 
                // Next check for medium-specific instructions
                else if (systemPromptJson[`${medium}_instructions`]) {
                    userMessage = systemPromptJson[`${medium}_instructions`];
                    extractedInstructions = true;
                }
                // Finally check for generic instructions
                else if (systemPromptJson.generation_instructions) {
                    userMessage = systemPromptJson.generation_instructions;
                    extractedInstructions = true;
                }
                // Check for main_goal, instructions, or directives as fallbacks
                else if (systemPromptJson.main_goal) {
                    userMessage = `${systemPromptJson.main_goal}`;
                    extractedInstructions = true;
                }
                else if (systemPromptJson.instructions && typeof systemPromptJson.instructions === 'string') {
                    userMessage = systemPromptJson.instructions;
                    extractedInstructions = true;
                }
                
                // Log what instructions were found
                console.log(`Using ${extractedInstructions ? 'JSON-extracted' : 'default'} instructions for ${medium}`);
            }
        } catch (e) {
            console.log('Error processing prompt structure:', e);
            console.log('Using default instructions');
        }
        
        // If no instructions were found in the JSON, use a simple generic message
        if (!extractedInstructions) {
            userMessage = `Generate content for ${medium}`;
        }
        
        // Log the exact instruction being used for transparency
        console.log(`Instruction for ${medium}: "${userMessage}"`);
        
        const content = await claudeAPI.generateCompletion(
            [{ role: 'user', content: userMessage }],
            { system: finalSystemPrompt, temperature: 0.7, stream: false }
        ) as string;
        
        res.status(200).json({ 
            content, 
            userId, 
            medium,
            timestamp: new Date().toISOString(),
            // Include the instruction used for transparency
            instruction_used: userMessage,
            // Include which components were used
            components: {
                templateId: templateId || null,
                cardId: cardId || null,
                instructionId: instructionId || null
            }
        });
    }));

    return router;
} 