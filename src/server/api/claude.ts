/**
 * claude.ts - Simple API client for Claude AI model
 * 
 * This file handles the basic communication with Claude's API without
 * any hardcoded prompts or specialized generation logic.
 * All prompts should be stored in the database and managed through the frontend.
 */

// Define the basic types needed for API interaction
interface ChatMessage {
    role: 'user' | 'assistant';
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

// Media element for direct input in CompletionOptions
interface MediaElement {
    type: string; // mime type like 'image/jpeg'
    data: string; // base64 encoded data
}

// Configuration options for completion requests
interface CompletionOptions {
    system?: string;     // System prompt text
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    model?: string;
    media?: MediaElement[]; // Array of media elements to include
}

// Constructor options
interface ClaudeOptions {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    debug?: boolean;
}

/**
 * ClaudeAPI - Simple client for interacting with Claude AI
 * 
 * This class provides minimal methods to communicate with Claude's API
 * without any hardcoded prompts or specialized generation logic.
 */
class ClaudeAPI {
    private apiKey: string;
    private model: string;
    private maxTokens: number;
    private temperature: number;
    private debug: boolean;
    
    constructor(options: ClaudeOptions = {}) {
        this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.model = options.model || 'claude-3-7-sonnet-20250219';  // Updated to latest Claude 3.7 Sonnet model
        this.maxTokens = options.maxTokens || 4000;
        this.temperature = options.temperature || 0.7;
        this.debug = options.debug || false;
        
        if (!this.apiKey) {
            throw new Error('Anthropic API key is required');
        }
    }

    /**
     * Generates a completion using the Anthropic API.
     * Handles both streaming and non-streaming responses.
     * 
     * @param messages Text or array of messages to send to Claude
     * @param options Configuration options
     * @returns Either a string (non-streaming) or an AsyncIterable (streaming)
     */
    async generateCompletion(
        messages: ChatMessage[] | string, 
        options: CompletionOptions = {}
    ): Promise<string | AsyncIterable<any>> {
        const formattedMessages: any[] = [];
        
        // NOTE: No longer adding system message to the messages array
        // System message is now passed as a separate top-level parameter
        
        // Handle different input formats
        if (typeof messages === 'string') {
            // If messages is a string, it's the user message
            if (options.media && options.media.length > 0) {
                // If media is included, create a message with both text and image content
                const content: any[] = [];
                
                // Add all media elements
                for (const mediaItem of options.media) {
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaItem.type,
                            data: mediaItem.data
                        }
                    });
                }
                
                // Add the text content
                content.push({
                    type: 'text',
                    text: messages || 'Hello'
                });
                
                formattedMessages.push({
                    role: 'user',
                    content
                });
            } else {
                // Standard text-only message
                formattedMessages.push({
                    role: 'user',
                    content: messages || 'Hello'
                });
            }
        } else if (Array.isArray(messages)) {
            // If messages is an array, add each message
            formattedMessages.push(...messages);
        }
        
        // Prepare the request payload
        const requestPayload: any = {
            model: options.model || this.model,
            messages: formattedMessages,
            max_tokens: options.max_tokens || this.maxTokens,
            temperature: options.temperature || this.temperature
        };
        
        // Add system as a top-level parameter
        if (options.system && options.system.trim() !== '') {
            requestPayload.system = options.system;
        }
        
        // Add stream parameter if specified
        if (options.stream) {
            requestPayload.stream = true;
        }
        
        if (this.debug) {
            console.log('Sending to Claude API:', JSON.stringify(requestPayload, null, 2));
        }
        
        // Updated headers with the latest anthropic-version
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
        };
        
        if (options.stream) {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestPayload)
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Claude API error:', errorData);
                    throw new Error(`Claude API error: ${errorData}`);
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
                    headers,
                    body: JSON.stringify(requestPayload)
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Claude API error:', errorData);
                    throw new Error(`Claude API error: ${errorData}`);
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
     * Processes an image message to generate a description
     * 
     * @param prompt The prompt text
     * @param imageBase64 Base64 encoded image data
     * @param imageMediaType The media type of the image
     * @returns The response text from Claude
     */
    async generateImageDescription(
        prompt: string,
        imageBase64: string,
        imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    ): Promise<string> {
        console.log(`Processing image message`);
        // Use the new media parameter in CompletionOptions
        const responseText = await this.generateCompletion(prompt, {
            system: "You are an expert at describing images. Provide detailed, objective descriptions of the images you're shown.",
            media: [
                {
                    type: imageMediaType,
                    data: imageBase64
                }
            ],
            stream: false
        }) as string;
        
        return responseText;
    }

    /**
     * Formats prompt components into a structured XML format
     * @param characterCard The character card data (JSON or string)
     * @param instructions The instruction text
     * @param examples Array of example strings
     * @param mainGoal The main goal/request
     * @returns Formatted XML string
     */
    private formatStructuredXmlPrompt(
        characterCard: string | object,
        instructions: string = "",
        examples: string[] = [],
        mainGoal: string = ""
    ): string {
        // Convert character card to string if it's an object
        const characterCardStr = typeof characterCard === 'object' 
            ? JSON.stringify(characterCard) 
            : characterCard;
        
        // Build XML document
        let xmlPrompt = `<Prompt version="1.0">\n`;
        xmlPrompt += `  <Header>Digital Twin Prompt</Header>\n`;
        
        // Add character card section
        xmlPrompt += `  <CharacterCard>\n`;
        xmlPrompt += `    <Data><![CDATA[${characterCardStr}]]></Data>\n`;
        xmlPrompt += `  </CharacterCard>\n`;
        
        // Add instructions section if provided
        if (instructions && instructions.trim()) {
            xmlPrompt += `  <Instructions>\n`;
            // Split instructions by newline to create separate instruction elements
            const instructionLines = instructions.split('\n')
                .map(line => line.trim())
                .filter(line => line);
            
            if (instructionLines.length > 0) {
                instructionLines.forEach(line => {
                    xmlPrompt += `    <Instruction>${this.escapeXml(line)}</Instruction>\n`;
                });
            } else {
                // Add as single instruction if no newlines
                xmlPrompt += `    <Instruction>${this.escapeXml(instructions)}</Instruction>\n`;
            }
            xmlPrompt += `  </Instructions>\n`;
        }
        
        // Add examples section if provided
        if (examples && examples.length > 0) {
            xmlPrompt += `  <Examples>\n`;
            examples.forEach((example, index) => {
                xmlPrompt += `    <Example id="${index + 1}">${this.escapeXml(example)}</Example>\n`;
            });
            xmlPrompt += `  </Examples>\n`;
        }
        
        // Add main goal section if provided
        if (mainGoal && mainGoal.trim()) {
            xmlPrompt += `  <MainGoal>${this.escapeXml(mainGoal)}</MainGoal>\n`;
        }
        
        xmlPrompt += `</Prompt>`;
        return xmlPrompt;
    }

    /**
     * Escapes special XML characters to prevent malformed XML
     * @param text Text to escape
     * @returns Escaped text
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Generates a completion using structured XML format for the prompt
     * 
     * @param characterCard Character card (JSON or string)
     * @param instructions Instructions for the task
     * @param examples Array of examples
     * @param mainGoal Primary user goal/request
     * @param options Additional configuration options
     * @returns Either a string (non-streaming) or an AsyncIterable (streaming)
     */
    async generateStructuredCompletion(
        characterCard: string | object,
        instructions: string = "",
        examples: string[] = [],
        mainGoal: string = "",
        options: CompletionOptions = {}
    ): Promise<string | AsyncIterable<any>> {
        // Format the system prompt as XML
        const systemPromptXml = this.formatStructuredXmlPrompt(
            characterCard,
            instructions,
            examples,
            ""  // No main goal in system prompt
        );
        
        // Use main goal as the user message
        const userMessage = mainGoal;
        
        if (this.debug) {
            console.log('Formatted XML System Prompt:');
            console.log(systemPromptXml);
            console.log('User Message:');
            console.log(userMessage);
        }
        
        // Call the standard generateCompletion with the formatted XML as system prompt
        return this.generateCompletion(
            userMessage,
            { 
                ...options,
                system: systemPromptXml
            }
        );
    }
}

export default ClaudeAPI; 