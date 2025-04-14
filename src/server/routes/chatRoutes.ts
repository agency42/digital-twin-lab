import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import ClaudeAPI from '../api/claude';
import PromptService from '../services/promptService';

/**
 * Creates and configures a router for chat-related endpoints
 */
export default function createChatRouter() {
    const router = Router();
    const claudeAPI = new ClaudeAPI();
    const promptService = new PromptService();
    
    /**
     * Helper function to log AI interactions
     * @param userId User identifier
     * @param type Type of interaction (chat/content)
     * @param systemPrompt System prompt used
     * @param userInput User message/instruction
     * @param aiResponse AI's response
     * @param additionalInfo Any additional info to log
     */
    function logInteraction(
        userId: string, 
        type: 'chat' | 'content', 
        systemPrompt: string,
        userInput: string | any,
        aiResponse: string,
        additionalInfo?: any
    ) {
        // Create log separator for easier reading
        const separator = '='.repeat(80);
        console.log(`\n${separator}`);
        console.log(`INTERACTION LOG [${new Date().toISOString()}]`);
        console.log(`TYPE: ${type.toUpperCase()}`);
        console.log(`USER: ${userId}`);
        
        // Log full system prompt without truncation
        console.log(`\nSYSTEM PROMPT (full):`);
        console.log(systemPrompt || 'None');
        
        // For string inputs, log directly, otherwise handle structured data
        if (typeof userInput === 'string') {
            console.log(`\nUSER INPUT (full):`);
            console.log(userInput);
        } else {
            console.log('\nUSER INPUT (structured):');
            if (userInput.mainGoal) {
                console.log(`\nMain Goal (full):`);
                console.log(userInput.mainGoal);
            }
            
            if (userInput.instructions) {
                console.log(`\nInstructions (full):`);
                console.log(userInput.instructions);
            }
            
            if (userInput.examples && userInput.examples.length) {
                console.log(`\nExamples (${userInput.examples.length} provided):`);
                userInput.examples.forEach((ex: string, i: number) => {
                    console.log(`\nExample ${i+1}:`);
                    console.log(ex);
                });
            }
        }
        
        // Log AI response without truncation
        console.log(`\nAI RESPONSE (full):`);
        console.log(aiResponse || 'None');
        
        // Log any additional information
        if (additionalInfo) {
            console.log('\nADDITIONAL INFO:');
            console.log(additionalInfo);
        }
        
        console.log(separator + '\n');
    }
    
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

        console.log(`Chat request for user ${userId}. Stream: ${stream}. Temperature: ${tempValue}`);

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            let fullResponseText = '';
            try {
                console.log(`Starting streaming response for user ${userId}`);
                console.log(`User message (full):\n${userMessage}`);
                
                // Use structured format for streaming too
                const streamResponse = await claudeAPI.generateStructuredCompletion(
                    systemPrompt || '',    // Character card / system prompt
                    '',                    // No additional instructions for chat
                    [],                    // No examples for chat
                    userMessage,           // User message as main goal
                    { temperature: tempValue, stream: true }
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
                        // Log the full interaction after completion
                        logInteraction(userId, 'chat', systemPrompt, userMessage, fullResponseText, {
                            temperature: tempValue,
                            stream: true,
                            completionType: 'streaming'
                        });
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
                // Still log the interaction even if no proper stop event
                logInteraction(userId, 'chat', systemPrompt, userMessage, fullResponseText, {
                    temperature: tempValue,
                    stream: true,
                    completionType: 'streaming',
                    note: 'Stream ended without proper message_stop event'
                });
            } catch (streamError: any) {
                console.error('Error during SSE stream processing:', streamError);
                if (!res.writableEnded) {
                    try {
                        res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message || 'Stream error' })}\n\n`);
                    } catch { /* Ignore */ }
                    res.end();
                }
                // Log error case
                logInteraction(userId, 'chat', systemPrompt, userMessage, '[ERROR] ' + streamError.message, {
                    temperature: tempValue,
                    stream: true,
                    error: streamError.message,
                    completionType: 'streaming'
                });
            }

        } else {
            try {
                // Use structured format for non-streaming
                const responseText = await claudeAPI.generateStructuredCompletion(
                    systemPrompt || '',    // Character card / system prompt
                    '',                    // No additional instructions for chat
                    [],                    // No examples for chat
                    userMessage,           // User message as main goal
                    { temperature: tempValue, stream: false }
                ) as string;

                console.log('Non-stream response generated.');
                
                // Log the interaction
                logInteraction(userId, 'chat', systemPrompt, userMessage, responseText, {
                    temperature: tempValue,
                    stream: false,
                    completionType: 'standard',
                    format: 'XML structured prompt'
                });
                
                res.status(200).json({ response: responseText });
            } catch (error: any) {
                console.error('Error generating non-streaming response:', error);
                
                // Log error case
                logInteraction(userId, 'chat', systemPrompt, userMessage, '[ERROR] ' + error.message, {
                    temperature: tempValue,
                    stream: false,
                    error: error.message,
                    completionType: 'standard'
                });
                
                throw error; // Let asyncHandler handle it
            }
        }
    }));

    // Chat with persona endpoint
    router.post('/:userId/response', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { message, history, systemPrompt: customSystemPrompt, mainGoal } = req.body;
        
        if (!userId || !message) {
            throw new Error('Missing required fields: userId (in path) and message (in body)');
        }
        
        console.log(`Persona chat request for user ${userId}`);
        console.log(`User message (full):\n${message}`);
        
        // If no custom system prompt is provided, fetch the chat system prompt from the database
        let systemPrompt = customSystemPrompt;
        if (!systemPrompt) {
            // Get the user's chat system prompt from the database
            const generationsData = await promptService.getGenerationsData(userId, 'chat');
            if (generationsData.systemPrompt) {
                systemPrompt = generationsData.systemPrompt.prompt_text;
                
                // If there are instruction templates, append them to the system prompt
                if (generationsData.instructionTemplate) {
                    systemPrompt += `\n\n## Instructions\n${generationsData.instructionTemplate.instruction_text}`;
                }
            }
        }
        
        try {
            const responseText = await claudeAPI.generateStructuredCompletion(
                systemPrompt || '',    // Character card / system prompt
                '',                    // No additional instructions for chat
                [],                    // No examples for chat
                message,               // User message as main goal
                { temperature: 0.7, stream: false }
            ) as string;
            
            // Log the interaction
            logInteraction(userId, 'chat', systemPrompt || '', message, responseText, {
                mainGoal: mainGoal || 'None provided',
                historyLength: history ? history.length : 0,
                promptSource: customSystemPrompt ? 'Custom' : 'Database',
                format: 'XML structured prompt'
            });
            
            res.status(200).json({ 
                response: responseText, 
                userId, 
                timestamp: new Date().toISOString() 
            });
        } catch (error: any) {
            console.error(`Error in persona chat for user ${userId}:`, error);
            
            // Log error case
            logInteraction(userId, 'chat', systemPrompt || '', message, '[ERROR] ' + error.message, {
                mainGoal: mainGoal || 'None provided',
                historyLength: history ? history.length : 0,
                promptSource: customSystemPrompt ? 'Custom' : 'Database',
                error: error.message
            });
            
            throw error; // Let asyncHandler handle it
        }
    }));

    // Content generation endpoint
    router.post('/:userId/generate-content', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { 
            systemPrompt: customSystemPrompt, 
            instructions: customInstructions, 
            examples, 
            mainGoal, 
            medium, 
            templateId, 
            cardId, 
            instructionId, 
            stream = false 
        } = req.body;
        
        if (!userId) {
            throw new Error('Missing required field: userId (in path)');
        }

        if (!medium) {
            throw new Error('Medium is required for content generation');
        }
        
        console.log(`Content generation request for user ${userId}, medium: ${medium}`);
        
        // Get prompts from database if not provided
        let finalSystemPrompt = customSystemPrompt || '';
        let finalInstructions = customInstructions || '';
        let finalUserMessage = mainGoal || '';
        let finalExamples = examples || [];
        
        // If system prompt or instructions aren't provided, fetch from database
        if (!customSystemPrompt || !customInstructions) {
            try {
                // Fetch system prompt and instruction template from database
                const generationsData = await promptService.getGenerationsData(userId, 'post');
                
                // Use database system prompt if not provided
                if (!customSystemPrompt && generationsData.systemPrompt) {
                    finalSystemPrompt = generationsData.systemPrompt.prompt_text;
                }
                
                // Use database instructions if not provided
                if (!customInstructions && generationsData.instructionTemplate) {
                    finalInstructions = generationsData.instructionTemplate.instruction_text;
                }
            } catch (error) {
                console.error('Error fetching prompts from database:', error);
                // Continue with provided values if database fetch fails
            }
        }
        
        // Component-based approach if IDs are provided
        if ((templateId || (cardId && instructionId)) && !mainGoal) {
            try {
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
                    
                    const characterData = JSON.parse(characterCard.card_data);
                    
                    // Fetch the instruction set if it exists
                    if (template.instruction_id) {
                        const instructionSet = await db.get(
                            `SELECT * FROM instruction_sets WHERE instruction_id = ?`,
                            [template.instruction_id]
                        );
                        
                        if (instructionSet) {
                            const instructionData = JSON.parse(instructionSet.instruction_data);
                            
                            // Extract instructions
                            if (instructionData.instruction) {
                                finalInstructions = instructionData.instruction;
                            } else if (instructionData.instructions) {
                                finalInstructions = instructionData.instructions;
                            }
                            
                            // Extract main goal as the user message if available
                            if (instructionData.mainGoal) {
                                finalUserMessage = instructionData.mainGoal;
                            }
                            
                            // Check for platform-specific instructions
                            if (instructionData.platform_adaptations && 
                                instructionData.platform_adaptations[medium]) {
                                const platformAdaptation = instructionData.platform_adaptations[medium];
                                
                                if (platformAdaptation.generation_instructions) {
                                    finalInstructions = platformAdaptation.generation_instructions;
                                }
                                
                                if (platformAdaptation.examples && Array.isArray(platformAdaptation.examples)) {
                                    finalExamples = platformAdaptation.examples;
                                }
                            }
                        }
                    }
                    
                    // Use the assembled prompt as fallback for system prompt
                    if (!finalSystemPrompt) {
                        finalSystemPrompt = template.assembled_prompt || JSON.stringify(characterData);
                    }
                }
                // If cardId and/or instructionId are provided directly
                else if (cardId) {
                    // Fetch the character card
                    const characterCard = await db.get(
                        `SELECT * FROM character_cards WHERE card_id = ? AND user_id = ?`,
                        [cardId, userId]
                    );
                    
                    if (!characterCard) {
                        throw new Error(`Character card not found: ${cardId}`);
                    }
                    
                    const characterData = JSON.parse(characterCard.card_data);
                    
                    // Assemble the system prompt if not provided
                    if (!finalSystemPrompt) {
                        finalSystemPrompt = JSON.stringify(characterData);
                    }
                    
                    // Fetch the instruction set
                    if (instructionId) {
                        const instructionSet = await db.get(
                            `SELECT * FROM instruction_sets WHERE instruction_id = ? AND user_id = ?`,
                            [instructionId, userId]
                        );
                        
                        if (instructionSet) {
                            const instructionData = JSON.parse(instructionSet.instruction_data);
                            
                            // Extract instructions
                            if (instructionData.instruction) {
                                finalInstructions = instructionData.instruction;
                            } else if (instructionData.instructions) {
                                finalInstructions = instructionData.instructions;
                            }
                            
                            // Extract main goal as the user message if available
                            if (!finalUserMessage && instructionData.mainGoal) {
                                finalUserMessage = instructionData.mainGoal;
                            }
                            
                            // Check for platform-specific instructions
                            if (instructionData.platform_adaptations && 
                                instructionData.platform_adaptations[medium]) {
                                const platformAdaptation = instructionData.platform_adaptations[medium];
                                
                                if (platformAdaptation.generation_instructions) {
                                    finalInstructions = platformAdaptation.generation_instructions;
                                }
                                
                                if (platformAdaptation.examples && Array.isArray(platformAdaptation.examples)) {
                                    finalExamples = platformAdaptation.examples;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing component-based approach:', e);
                console.log('Falling back to provided values or database prompts');
            }
        }
        
        // Construct the user instruction - combine mainGoal, instructions, and examples
        let effectiveUserMessage = '';
        
        // Add main goal if provided
        if (finalUserMessage) {
            effectiveUserMessage += `Main Goal: ${finalUserMessage}\n\n`;
        }
        
        // Add instructions
        effectiveUserMessage += finalInstructions;
        
        // Add examples if provided
        if (finalExamples && finalExamples.length > 0) {
            effectiveUserMessage += '\n\nExamples:\n';
            finalExamples.forEach((example: string, index: number) => {
                effectiveUserMessage += `Example ${index + 1}: ${example}\n`;
            });
        }
        
        try {
            console.log(`Generating content for ${userId} (${medium})...`);
            console.log(`Main goal (full):`);
            if (finalUserMessage) {
                console.log(finalUserMessage);
            } else {
                console.log('None provided');
            }
            
            let result;
            if (stream) {
                // Implementation for streaming content generation would go here
                // For simplicity, we're just using non-streaming for now
                throw new Error('Streaming not yet implemented for content generation');
            } else {
                // Use the new structured XML format for the prompt
                result = await claudeAPI.generateStructuredCompletion(
                    finalSystemPrompt,           // Character card / system prompt
                    finalInstructions,           // Instructions
                    finalExamples || [],         // Examples array
                    finalUserMessage || "",      // Main goal as user message
                    { temperature: 0.7, stream: false }
                ) as string;
                
                // Log the interaction with structured input details
                logInteraction(userId, 'content', finalSystemPrompt, {
                    mainGoal: finalUserMessage,
                    instructions: finalInstructions,
                    examples: finalExamples,
                    medium: medium
                }, result, {
                    templateId: templateId || 'None',
                    cardId: cardId || 'None',
                    instructionId: instructionId || 'None',
                    format: 'XML structured prompt'
                });
            }
            
            res.status(200).json({
                content: result,
                medium: medium,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error(`Error generating content for user ${userId}:`, error);
            
            // Log error case
            logInteraction(userId, 'content', finalSystemPrompt, {
                mainGoal: finalUserMessage,
                instructions: finalInstructions,
                examples: finalExamples,
                medium: medium
            }, '[ERROR] ' + error.message, {
                templateId: templateId || 'None',
                cardId: cardId || 'None',
                instructionId: instructionId || 'None',
                error: error.message
            });
            
            throw error;
        }
    }));

    return router;
} 