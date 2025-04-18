import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import ClaudeAPI from '../api/claude';
import PromptConstructionService from '../services/promptConstructionService';

/**
 * Creates and configures a router for chat-related endpoints
 */
export default function createChatRouter() {
    const router = Router();
    const claudeAPI = new ClaudeAPI();
    const promptConstructionService = new PromptConstructionService();
    
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
        const { userId, userMessage, temperature = 0.7, stream = true } = req.body;

        if (!userId || !userMessage) {
            throw new Error('Missing required fields: userId and userMessage');
        }
        const tempValue = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
        if (typeof tempValue !== 'number' || isNaN(tempValue) || tempValue < 0 || tempValue > 1) {
            throw new Error('Invalid temperature provided. Must be a number between 0 and 1');
        }

        console.log(`Chat request for user ${userId}. Stream: ${stream}. Temperature: ${tempValue}`);
        
        try {
            // Use the prompt construction service to build the chat prompt
            const { formattedSystemPrompt } = await promptConstructionService.constructChatPrompt(userId);

            if (stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();

                let fullResponseText = '';
                try {
                    console.log(`Starting streaming response for user ${userId}`);
                    console.log(`User message (full):\n${userMessage}`);
                    
                    // Call the Claude API directly with the formatted system prompt
                    const streamResponse = await claudeAPI.generateCompletion(
                        userMessage,
                        { 
                            system: formattedSystemPrompt, 
                            temperature: tempValue, 
                            stream: true 
                        }
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
                            logInteraction(userId, 'chat', formattedSystemPrompt, userMessage, fullResponseText, {
                                temperature: tempValue,
                                stream: true,
                                completionType: 'streaming',
                                format: 'Markdown structured prompt'
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
                    logInteraction(userId, 'chat', formattedSystemPrompt, userMessage, fullResponseText, {
                        temperature: tempValue,
                        stream: true,
                        completionType: 'streaming',
                        note: 'Stream ended without proper message_stop event',
                        format: 'Markdown structured prompt'
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
                    logInteraction(userId, 'chat', formattedSystemPrompt, userMessage, '[ERROR] ' + streamError.message, {
                        temperature: tempValue,
                        stream: true,
                        error: streamError.message,
                        completionType: 'streaming',
                        format: 'Markdown structured prompt'
                    });
                }
            } else {
                // Non-streaming API call
                const responseText = await claudeAPI.generateCompletion(
                    userMessage,
                    { 
                        system: formattedSystemPrompt, 
                        temperature: tempValue, 
                        stream: false 
                    }
                ) as string;

                console.log('Non-stream response generated.');
                
                // Log the interaction
                logInteraction(userId, 'chat', formattedSystemPrompt, userMessage, responseText, {
                    temperature: tempValue,
                    stream: false,
                    completionType: 'standard',
                    format: 'Markdown structured prompt'
                });
                
                res.status(200).json({ response: responseText });
            }
        } catch (error: any) {
            console.error('Error generating response:', error);
            
            // Log error case
            logInteraction(userId, 'chat', 'Error retrieving system prompt', userMessage, '[ERROR] ' + error.message, {
                temperature: tempValue,
                stream: stream,
                error: error.message,
                completionType: 'standard'
            });
            
            throw error; // Let asyncHandler handle it
        }
    }));

    // Chat with persona endpoint
    router.post('/:userId/response', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { message, history } = req.body;
        
        if (!userId || !message) {
            throw new Error('Missing required fields: userId (in path) and message (in body)');
        }
        
        console.log(`Persona chat request for user ${userId}`);
        console.log(`User message (full):\n${message}`);
        
        try {
            // Use the prompt construction service to build the chat prompt
            const { formattedSystemPrompt } = await promptConstructionService.constructChatPrompt(userId);
            
            // Call Claude API with the formatted system prompt and user message
            const responseText = await claudeAPI.generateCompletion(
                message,  // User message
                { 
                    system: formattedSystemPrompt,
                    temperature: 0.7, 
                    stream: false 
                }
            ) as string;
            
            // Log the interaction
            logInteraction(userId, 'chat', formattedSystemPrompt, message, responseText, {
                historyLength: history ? history.length : 0,
                promptSource: 'Database',
                format: 'Markdown structured prompt'
            });
            
            res.status(200).json({ 
                response: responseText, 
                userId, 
                timestamp: new Date().toISOString() 
            });
        } catch (error: any) {
            console.error(`Error in persona chat for user ${userId}:`, error);
            
            // Log error case
            logInteraction(userId, 'chat', 'Error retrieving system prompt', message, '[ERROR] ' + error.message, {
                historyLength: history ? history.length : 0,
                promptSource: 'Database',
                error: error.message
            });
            
            throw error; // Let asyncHandler handle it
        }
    }));

    // Content generation endpoint
    router.post('/:userId/generate-content', asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId;
        const { 
            contentType,
            mainGoal,
            prompt,
            temperature = 0.7
        } = req.body;
        
        if (!userId) {
            throw new Error('Missing required field: userId (in path)');
        }

        if (!contentType) {
            throw new Error('contentType is required for content generation');
        }
        
        // Validate contentType is one of our expected values
        if (contentType !== 'post' && contentType !== 'chat') {
            throw new Error('contentType must be either "post" or "chat"');
        }
        
        // Get the user message from either mainGoal or prompt field
        const userMessage = mainGoal || prompt || '';
        
        console.log(`Content generation request for user ${userId}, contentType: ${contentType}`);
        console.log(`Main goal (full):`);
        if (userMessage) {
            console.log(userMessage);
        } else {
            console.log('None provided');
        }
        
        try {
            // Use the prompt construction service to build the content prompt
            const { formattedSystemPrompt, userMessageFieldName, contentTypeInfo } = 
                await promptConstructionService.constructPostPrompt(userId, contentType);
            
            // Call Claude API with the formatted system prompt and user message
            const result = await claudeAPI.generateCompletion(
                userMessage,
                { 
                    system: formattedSystemPrompt,
                    temperature, 
                    stream: false 
                }
            ) as string;
            
            // Log the interaction with structured input details
            logInteraction(userId, 'content', formattedSystemPrompt, {
                [userMessageFieldName]: userMessage,
                contentType: contentTypeInfo
            }, result, {
                format: 'Markdown structured prompt'
            });
            
            res.status(200).json({
                content: result,
                contentType,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error(`Error generating content for user ${userId}:`, error);
            
            // Log error case
            logInteraction(userId, 'content', 'Error retrieving system prompt', {
                mainGoal: userMessage,
                contentType
            }, '[ERROR] ' + error.message, {
                error: error.message
            });
            
            throw error;
        }
    }));

    return router;
} 