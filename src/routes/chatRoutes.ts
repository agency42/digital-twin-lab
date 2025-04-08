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
        const { message, history, systemPrompt, personaId } = req.body;
        
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

    return router;
} 