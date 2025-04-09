import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// Define interfaces for API interaction

// Basic structure for a message in the conversation history
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

// Options for generateCompletion
interface CompletionOptions {
    system?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    // Add other potential Anthropic options if needed
}

// Structure for Anthropic SDK streaming events (simplified)
// Refer to @anthropic-ai/sdk types for full details if needed
interface StreamEvent {
    type: string;
    delta?: { type: string; text?: string };
    // other potential event fields
}

class ClaudeAPI {
    private anthropic: Anthropic;
    private templatePath: string = path.join(__dirname, '../../data/character_card_template.json');
    
    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
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
     * @param messages The message history.
     * @param options Configuration options like system prompt, temperature, etc.
     * @returns Either a string (non-streaming) or an AsyncIterable stream.
     */
    async generateCompletion(
        messages: ChatMessage[],
        options: CompletionOptions = {}
    ): Promise<string | AsyncIterable<StreamEvent>> { // Return type depends on stream option
        const { system, temperature = 0.7, max_tokens = 1024, stream = false } = options;

        // --- Enhanced Logging Start ---
        console.log(`--- Calling Claude API (Stream: ${stream}) ---`);
        console.log(`System Prompt: ${system ? system.substring(0, 200) + (system.length > 200 ? '...' : '') : 'None'}`);
        // Log messages carefully, potentially truncating long content
        const loggedMessages = messages.map(msg => {
            if (typeof msg.content === 'string' && msg.content.length > 300) {
                return { ...msg, content: msg.content.substring(0, 150) + '...<truncated>...' + msg.content.substring(msg.content.length - 150) };
            } else if (Array.isArray(msg.content)) { // Handle image content array
                 return { ...msg, content: `[${msg.content.length} content parts, including images]` };
            }
            return msg;
        });
        console.log('Messages:', JSON.stringify(loggedMessages, null, 2));
        console.log(`Options: ${JSON.stringify({ temperature, max_tokens })}`);
        // --- Enhanced Logging End ---

        try {
            const requestPayload: Anthropic.Messages.MessageCreateParams = {
                model: 'claude-3-haiku-20240307', // Or specify another model
                messages: messages as Anthropic.Messages.MessageParam[], // Type assertion needed if structure differs slightly
                max_tokens: max_tokens,
                temperature: temperature,
                system: system, // Optional system prompt
                stream: stream,
            };

            if (stream) {
                const streamResponse = await this.anthropic.messages.create(requestPayload as Anthropic.Messages.MessageCreateParamsStreaming);
                console.log(`--- Claude Stream Initiated ---`);
                // We return the stream directly for the caller to handle
                // TODO: Add logging within the stream handling if needed (e.g., in chatModule)
                return streamResponse as AsyncIterable<StreamEvent>; 
            } else {
                const response: Anthropic.Messages.Message = await this.anthropic.messages.create(requestPayload as Anthropic.Messages.MessageCreateParamsNonStreaming);
                console.log(`--- Claude Non-Stream Response Received ---`);
                // console.log('Usage:', response.usage);

                // Extract the text content
                let responseText = '';
                if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
                    responseText = response.content[0].text;
                } else {
                    console.warn('Claude response content was empty or not text.');
                }
                
                // --- Enhanced Logging Start ---
                console.log('Claude Raw Response Text (Non-Stream):', responseText);
                // --- Enhanced Logging End ---

                console.log(`--- End generateCompletion (Non-Stream) ---`);
                return responseText;
            }
        } catch (error: any) {
             // --- Enhanced Logging Start ---
            console.error('[Claude API Error] Error during API call:', error.message);
            if (error instanceof Anthropic.APIError) {
                 console.error('[Claude API Error] Details:', {
                     status: error.status,
                     headers: error.headers, // Log headers which might contain rate limit info
                     message: error.message,
                     // error: error.error // Avoid logging potentially large/sensitive raw error object
                 });
            }
            // --- Enhanced Logging End ---
            // Re-throw a more generic error or the specific error
            throw new Error(`Anthropic API call failed: ${error.message}`);
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
        // console.log(`Claude Response (Full):\n${responseText}`); // Commented out
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
        const basePrompt = `Analyze the following text which represents writings and information about a person, potentially from different sources/platforms. Based *only* on this text, generate a comprehensive and effective SYSTEM PROMPT that captures the essence of this person's personality, voice, and key characteristics. \n\nThis system prompt will be used to instruct an AI assistant (like me) to behave and respond as a digital twin of this person. Therefore, the prompt should be:\n- Written in clear, direct language.\n- Structured logically (e.g., using sections for personality, voice, background, expertise, platform adaptations if detected).\n- Actionable for an AI model.\n\n**Analysis Requirements:**\n1.  Synthesize the core personality, values, voice style, tone, background, and expertise from ALL the text.\n2.  Analyze if the text (which may contain markers like "<source platform=\'...\' medium=\'...\'>") indicates significantly different communication styles or topics on specific platforms (e.g., LinkedIn vs. Blog). \n3.  If platform-specific adaptations are clear, incorporate instructions about them into the system prompt (e.g., "On LinkedIn, adopt a more professional tone...\"; "On Twitter, use concise and witty language...\").\n\n**Output Format:**\n- The output MUST be ONLY the generated system prompt text itself. \n- Do NOT include any introductory phrases like "Here is the system prompt:".\n- Do NOT include markdown formatting like code fences (\\\`\\\`\\\`).\n- Use clear headings or sections within the prompt text if helpful (e.g., "## Personality Traits", "## Voice and Tone", "## Platform Adaptations").\n`; // End of basePrompt template literal

        const systemMessage = customPrompt ? `${customPrompt}\\n\\n${basePrompt}` : basePrompt;
        // Define userMessageContent (ensure template literal is clean)
        const userMessageContent = `Here is the text about the person, potentially from multiple sources:\\n\\n${inputText}\\n\\nGenerate the system prompt according to the instructions provided, paying close attention to synthesizing the information and noting platform-specific adaptations if found.`; // End of userMessageContent template literal

        const messages: ChatMessage[] = [
            { role: 'user', content: userMessageContent },
        ]; // End of messages array assignment

        try {
            // Use generateCompletion (non-streaming) - Logging is inside
            const responseText = await this.generateCompletion(messages, {
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

        const messages: ChatMessage[] = [
            { role: 'user', content: userMessageContent },
        ];

        try {
            // Use generateCompletion (non-streaming)
            const responseText = await this.generateCompletion(messages, {
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
}

export default ClaudeAPI; 