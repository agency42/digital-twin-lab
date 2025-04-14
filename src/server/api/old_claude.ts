/**
 * DEPRECATED: This file contains the original Claude API implementation with hardcoded prompts.
 * 
 * DO NOT USE THIS FILE FOR NEW DEVELOPMENT. Instead, use the simplified claude.ts
 * which focuses solely on API communication without any hardcoded prompts.
 * 
 * This file is kept for reference during the transition to the database-driven prompt system.
 * Once all functionality has been migrated, this file should be removed.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// Define interfaces for API interaction

// Basic structure for a message in the conversation history
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | ImageContent[]; // Content can be text or an array including image parts
}

// Structure for image content part
interface ImageContent {
    type: 'image';
    source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string; // base64 encoded image data
    };
}

// Define content medium types
type ContentMedium = 'twitter' | 'blog' | 'email' | 'linkedin' | 'instagram' | 'facebook' | string;

// Options for generateCompletion
interface CompletionOptions {
    system?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    model?: string;
    onChunk?: (chunk: string) => void;
}

// Structure for Anthropic SDK streaming events (simplified)
// Refer to @anthropic-ai/sdk types for full details if needed
interface StreamEvent {
    type: string;
    delta?: { type: string; text?: string };
    // other potential event fields
}

interface ClaudeOptions {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    debug?: boolean;
}

export class ClaudeAPI {
    private apiKey: string;
    private model: string;
    private maxTokens: number;
    private temperature: number;
    private debug: boolean;
    private anthropic: Anthropic;
    private templatePath: string = path.join(__dirname, '../../data/character_card_template.json');
    
    constructor(options: ClaudeOptions = {}) {
        this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.model = options.model || 'claude-3.7-sonnet';  // Default to latest Sonnet
        this.maxTokens = options.maxTokens || 4000;
        this.temperature = options.temperature || 0.7;
        this.debug = options.debug || false;
        
        if (!this.apiKey) {
            throw new Error('Anthropic API key is required');
        }
        this.anthropic = new Anthropic({
            apiKey: this.apiKey,
        });
    }

    /**
     * Loads the character card template from the file system
     * @returns The template as a JSON object
     */
    private async loadCharacterCardTemplate(): Promise<any> {
        try {
            const templateContent = await fs.readFile(this.templatePath, 'utf8');
            return JSON.parse(templateContent);
        } catch (error) {
            console.error('Error loading character card template:', error);
            // Return a default template if file can't be loaded
            return {
                "entity": { "form": "human" },
                "personality": { 
                    "core_traits": [{ "trait": "", "strength": 0.0 }],
                    "big_five": {}
                },
                "voice": { "style": "", "qualities": [] },
                "relationship": {},
                "platform_adaptations": {}
            };
        }
    }

    /**
     * Generates a completion using the Anthropic SDK.
     * Supports both streaming and non-streaming.
     * @param messages Array of conversation messages OR user message string
     * @param options Configuration options like system prompt, temperature, etc.
     * @returns Either a string (non-streaming) or an AsyncIterable stream.
     */
    async generateCompletion(
        messages: ChatMessage[] | string, 
        options: CompletionOptions = {}
    ): Promise<string | AsyncIterable<any>> {
        const formattedMessages: any[] = [];
        
        // Add system message if provided in options
        if (options.system && options.system.trim() !== '') {
            formattedMessages.push({
                role: 'system',
                content: options.system
            });
        }
        
        // Handle different input formats
        if (typeof messages === 'string') {
            // If messages is a string, it's the user message
            formattedMessages.push({
                role: 'user',
                content: messages || 'Hello'
            });
        } else if (Array.isArray(messages)) {
            // If messages is an array, add each message
            formattedMessages.push(...messages);
        }
        
        if (this.debug) {
            console.log('Sending to Claude API:', JSON.stringify({
                model: options.model || this.model,
                messages: formattedMessages,
                max_tokens: options.max_tokens || this.maxTokens,
                temperature: options.temperature || this.temperature
            }, null, 2));
        }
        
        if (options.stream) {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: options.model || this.model,
                        messages: formattedMessages,
                        max_tokens: options.max_tokens || this.maxTokens,
                        temperature: options.temperature || this.temperature,
                        stream: true
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Claude API error:', errorData);
                    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
                }
                
                return this.processStream(response);
                
            } catch (error) {
                console.error('Error streaming completion:', error);
                throw error;
            }
        } else {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: options.model || this.model,
                        messages: formattedMessages,
                        max_tokens: options.max_tokens || this.maxTokens,
                        temperature: options.temperature || this.temperature
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Claude API error:', errorData);
                    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                return data.content[0].text;
            } catch (error) {
                console.error('Error generating completion:', error);
                throw error;
            }
        }
    }

    /**
     * Process the streaming response from Anthropic API
     * @param response The fetch response object
     * @returns An async iterable of stream events
     */
    private async *processStream(response: Response): AsyncIterable<any> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Failed to get response reader');
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Keep the last line which might be incomplete
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        yield parsed;
                    } catch (e) {
                        console.error('Error parsing stream data:', e);
                    }
                }
            }
        }
    }

    /**
     * Generates an image description using Claude.
     * @param prompt The prompt for the description.
     * @param imageBase64 Base64 encoded image data.
     * @param imageMediaType The media type (e.g., 'image/jpeg').
     * @returns {Promise<string>} The generated image description.
     */
    async generateImageDescription(
        prompt: string,
        imageBase64: string,
        imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    ): Promise<string> {
        console.log(`--- Calling Claude for Image Description ---`);
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: imageMediaType,
                            data: imageBase64,
                        },
                    },
                    {
                        type: 'text',
                        content: prompt,
                    } as any, // Cast needed if 'text' isn't directly in ImageContent union
                ],
            },
        ];

        // Use the generateCompletion method (non-streaming)
        const responseText = await this.generateCompletion(messages, { stream: false }) as string;
        console.log(`--- End generateImageDescription ---`);
        return responseText;
    }

    /**
     * Generates a system prompt based on input text using Claude.
     * NOTE: Logging added previously in generateCompletion applies here.
     * @param inputText Combined text input from assets/sources, potentially with markers.
     * @param customPrompt Optional custom instructions.
     * @returns {Promise<string | null>} The generated system prompt text or null on failure.
     */
    async generateSystemPrompt(inputText: string, customPrompt?: string): Promise<string | null> {
        console.log(`--- Calling Claude for System Prompt Generation ---`);
        // Define basePrompt (ensure template literal is clean)
        const basePrompt = `Analyze the following text which represents writings and information about a person, potentially from different sources/platforms. Based *only* on this text, generate a comprehensive and effective SYSTEM PROMPT that captures the essence of this person's personality, voice, and key characteristics. \n\nThis system prompt will be used to instruct an AI assistant (like me) to behave and respond as a digital twin of this person. Therefore, the prompt should be:\n- Written in clear, direct language.\n- Structured logically (e.g., using sections for personality, voice, background, expertise, platform adaptations if detected).\n- Actionable for an AI model.\n\n**Analysis Requirements:**\n1.  Synthesize the core personality, values, voice style, tone, background, and expertise from ALL the text.\n2.  Analyze if the text (which may contain markers like "<source platform=\'...\' medium=\'...\'>") indicates significantly different communication styles or topics on specific platforms (e.g., LinkedIn vs. Blog). \n3.  If platform-specific adaptations are clear, incorporate instructions about them into the system prompt (e.g., "On LinkedIn, adopt a more professional tone...\"; "On Twitter, use concise and witty language...\").\n\n**Output Format:**\n- The output MUST be ONLY the generated system prompt text itself. \n- Do NOT include any introductory phrases like "Here is the system prompt:".\n- Do NOT include markdown formatting like code fences (\\\`\\\`\\\`).\n- Use clear headings or sections within the prompt text if helpful (e.g., "## Personality Traits", "## Voice and Tone", "## Platform Adaptations").`; // End of basePrompt template literal

        const systemMessage = customPrompt ? `${customPrompt}\\n\\n${basePrompt}` : basePrompt;
        // Define userMessageContent (ensure template literal is clean)
        const userMessageContent = `Here is the text about the person, potentially from multiple sources:\\n\\n${inputText}\\n\\nGenerate the system prompt according to the instructions provided, paying close attention to synthesizing the information and noting platform-specific adaptations if found.`; // End of userMessageContent template literal

        try {
            // Use generateCompletion (non-streaming) - Logging is inside
            const responseText = await this.generateCompletion(userMessageContent, {
                system: systemMessage,
                stream: false,
                max_tokens: 3072 
            }) as string;

            console.log(`--- End generateSystemPrompt ---`);
            // Return the raw text response directly
            return responseText.trim() || null; // Return null if response is empty/whitespace

        } catch (error: any) {
            // Error from generateCompletion is already logged
            console.error('Error during system prompt generation call (after API return):', error.message);
            return null; // Return null on API failure
        }
    }

    /**
     * Generates a character card JSON based on input text using Claude.
     * @param inputText Combined text input from assets/sources, potentially with markers.
     * @param customPrompt Optional custom instructions.
     * @returns {Promise<object | null>} The generated character card JSON or null on failure.
     */
    async generateCharacterCard(inputText: string, customPrompt?: string): Promise<object | null> {
        console.log(`--- Calling Claude for Character Card Generation ---`);
        
        // Load the template to provide as an example
        const template = await this.loadCharacterCardTemplate();
        const templateStr = JSON.stringify(template, null, 2);
        
        // Define the default prompt if none provided
        const defaultPrompt = `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile. The JSON object should follow this structure:
${templateStr}

Ensure the output is ONLY the JSON object, starting with { and ending with }.`;

        // Use custom prompt if provided, otherwise use the default
        const systemMessage = customPrompt || defaultPrompt;
        
        const userMessageContent = `Here is the text about the person, potentially from multiple sources:\n\n${inputText}\n\nGenerate the character card JSON according to the instructions provided, paying close attention to synthesizing the information.`;

        try {
            // Use generateCompletion (non-streaming)
            const responseText = await this.generateCompletion(userMessageContent, {
                system: systemMessage,
                stream: false,
                max_tokens: 4096,
                temperature: 0.7
            }) as string;

            console.log(`--- End generateCharacterCard ---`);
            
            // Parse the response to ensure it's valid JSON
            try {
                const characterCard = JSON.parse(responseText.trim());
                return characterCard;
            } catch (parseError) {
                console.error('Failed to parse character card JSON from Claude response:', parseError);
                console.log('Raw response:', responseText);
                return null;
            }
        } catch (error: any) {
            console.error('Error during character card generation call:', error.message);
            return null;
        }
    }

    // Removed the parseJSONFromText method entirely as it is no longer used.

    // --- Deprecated Methods (Using Axios Directly) --- Keep or remove?
    // These seem redundant now with the SDK integration.
    /*
    async _makeApiRequest(endpoint, method = 'post', data = {}) {
        try {
            const response = await this.axiosInstance({ url: endpoint, method, data });
            return response.data;
        } catch (error) {
            console.error(`Error making ${method.toUpperCase()} request to ${endpoint}:`, error.response?.data || error.message);
            throw error; // Re-throw to be handled by caller
        }
    }

    async _generateViaAxios(prompt, options = {}) {
        const params = {
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            model: 'claude-instant-1.2', // Or another model
            max_tokens_to_sample: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            stream: options.stream || false,
            // ... other params
        };

        const logParams = { ...params };
        if (logParams.prompt && logParams.prompt.length > 1000) { 
            logParams.prompt = logParams.prompt.substring(0, 500) + '... <truncated> ...' + logParams.prompt.substring(logParams.prompt.length - 500);
        }
        // console.log(`Request Params (excluding image data):\n${safeLogStringify(logParams)}`); // Commented out

        const response = await this._makeApiRequest('/v1/complete', 'post', params);

        if (options.stream) {
            // Handle streaming response if needed (more complex)
            throw new Error('Streaming via Axios not fully implemented here.');
        } else {
            const responseText = response.completion;
            // console.log(`Claude Response (Full):\n${responseText}`); // Commented out
            return responseText;
        }
    }
    */

    // Helper method to create appropriate prompts based on medium
    private createPrompt(medium: ContentMedium, text: string, messages: ChatMessage[] = []): { systemPrompt: string, userPrompt: string } {
        // Default system prompt
        let systemPrompt = `You are an AI assistant that generates content for ${medium}.`;
        
        // Default user prompt
        let userPrompt = text || 'Generate content';
        
        // If there are messages in the history, we'll use those instead
        if (messages && messages.length > 0) {
            // Extract system message if present
            const systemMessage = messages.find(m => m.role === 'system');
            if (systemMessage && typeof systemMessage.content === 'string') {
                systemPrompt = systemMessage.content;
            }
            
            // Find the last user message
            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage && typeof lastUserMessage.content === 'string') {
                userPrompt = lastUserMessage.content;
            }
        }
        
        return { systemPrompt, userPrompt };
    }
    
    // Helper method to stream content as it's generated
    async streamContent(
        medium: ContentMedium,
        text: string,
        messages: ChatMessage[] = [],
        options: CompletionOptions = {}
    ): Promise<string> {
        // Create appropriate system prompt based on medium
        let systemPrompt = `You are an AI assistant that generates content for ${medium}.`;
        
        // If there are system messages in the history, use those instead
        if (messages && messages.length > 0) {
            const systemMessage = messages.find(m => m.role === 'system');
            if (systemMessage && typeof systemMessage.content === 'string') {
                systemPrompt = systemMessage.content;
            }
        }
        
        // User prompt is either the text or the last user message
        let userPrompt = text;
        if (messages && messages.length > 0) {
            const userMessages = messages.filter(m => m.role === 'user');
            const lastUserMessage = userMessages[userMessages.length - 1];
            if (lastUserMessage && typeof lastUserMessage.content === 'string') {
                userPrompt = lastUserMessage.content;
            }
        }
        
        // Use the streamCompletion method with the system and user prompts
        return this.generateCompletion(
            userPrompt, 
            { 
                system: systemPrompt, 
                temperature: options.temperature, 
                max_tokens: options.max_tokens,
                onChunk: options.onChunk,
                stream: true 
            }
        ) as Promise<string>;
    }

    // Helper method to stream completion response
    async streamCompletion(
        systemPrompt: string,
        userMessage: string,
        onChunk: (chunk: string) => void,
        options: CompletionOptions = {}
    ): Promise<string> {
        const messages: any[] = [];
        
        // Only add system message if we have a system prompt
        if (systemPrompt && systemPrompt.trim() !== '') {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        
        // Add user message
        messages.push({
            role: 'user',
            content: userMessage || 'Hello'
        });
        
        let fullResponse = '';
        
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: options.model || this.model,
                    messages,
                    max_tokens: options.max_tokens || this.maxTokens,
                    temperature: options.temperature || this.temperature,
                    stream: true
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Claude API error:', errorData);
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }
            
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get response reader');
            }
            
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta' && parsed.delta.text) {
                                const text = parsed.delta.text;
                                fullResponse += text;
                                onChunk(text);
                            }
                        } catch (e) {
                            console.error('Error parsing stream data:', e);
                        }
                    }
                }
            }
            
            return fullResponse;
        } catch (error) {
            console.error('Error streaming completion:', error);
            throw error;
        }
    }
}

export default ClaudeAPI; 