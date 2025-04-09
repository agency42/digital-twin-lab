import Anthropic from '@anthropic-ai/sdk';

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
    // Deprecated?: private axiosInstance: AxiosInstance;
    // Deprecated?: private claudeApiUrl: string = 'https://api.anthropic.com/v1/complete'; // Example URL, likely unused now

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Deprecated Axios setup?
        // this.axiosInstance = axios.create({
        //     baseURL: 'https://api.anthropic.com',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'x-api-key': process.env.ANTHROPIC_API_KEY,
        //         'anthropic-version': '2023-06-01'
        //     }
        // });
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
     * Attempts to generate a structured personality profile JSON using Claude.
     * NOTE: This method uses generateCompletion internally, so logging added there applies.
     * @param inputText Combined text input from assets/sources.
     * @param customPrompt Optional custom prompt instructions.
     * @returns {Promise<object | null>} The parsed JSON object or null on failure.
     */
    async generatePersonality(inputText: string, customPrompt?: string): Promise<object | null> {
        console.log(`--- Calling Claude for Personality Generation ---`);
        // Enhanced base prompt with stricter JSON formatting instructions
        const basePrompt = `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile.\n\nThe JSON object MUST strictly follow this structure:\n{\n  \"entity\": { \"form\": \"human | brand\", \"occupation\": \"string | null\", \"gender\": \"string | null\", \"age\": \"string | null\" },\n  \"personality\": { \"name\": \"string | null\", \"core_traits\": [{\"trait\": \"string\", \"strength\": number(0.0-1.0)}], \"values\": [\"string\"] },\n  \"voice\": { \"style\": \"string\", \"tone\": \"string\", \"qualities\": [\"string\"], \"patterns\": [\"string\"] },\n  \"relationship\": { \"style\": \"string\", \"boundaries\": \"string\" },\n  \"big_five_traits\": { \"openness\": \"high|medium|low\", \"conscientiousness\": \"high|medium|low\", \"extraversion\": \"high|medium|low\", \"agreeableness\": \"high|medium|low\", \"neuroticism\": \"high|medium|low\" },\n  \"background\": [\"string\"],\n  \"expertise\": [\"string\"]\n}\n\nIMPORTANT RULES FOR JSON OUTPUT:\n1.  The output MUST be ONLY the JSON object itself, starting with { and ending with }.\n2.  Do NOT include any introductory text, explanations, or markdown code fences (like \`\`\`json) before or after the JSON.\n3.  Ensure ALL strings are enclosed in double quotes (\").\n4.  Ensure all keys are enclosed in double quotes (\").\n5.  Ensure correct placement of commas - between elements in arrays and key/value pairs in objects.\n6.  Do NOT use trailing commas after the last element in an array or object.\n7.  Escape any special characters within strings properly (e.g., \\\" for a quote inside a string).\n8.  All keys specified in the structure MUST be present, even if their value is null or an empty array [].\n`;

        const systemMessage = customPrompt ? `${customPrompt}\n\n${basePrompt}` : basePrompt;
        const userMessageContent = `Here is the text about the person:\n\n<text>\n${inputText}\n</text>\n\nGenerate the JSON personality profile according to the strict rules provided.`;

        const messages: ChatMessage[] = [
            { role: 'user', content: userMessageContent },
        ];

        try {
            // Use generateCompletion (non-streaming) - Logging is inside generateCompletion
            const responseText = await this.generateCompletion(messages, {
                system: systemMessage,
                stream: false,
                max_tokens: 2048 // Allow more tokens for potentially large JSON
            }) as string;

            // Parse the response as JSON
             console.log('--- Attempting to parse personality JSON --- '); // Log before parsing
            const parsedJson = this.parseJSONFromText(responseText); // Logs errors internally
            // console.log(`Claude Response (Full JSON):\n${safeLogStringify(parsedJson)}`); // Commented out
            console.log(`--- End generatePersonality ---`);
            return parsedJson;

        } catch (error: any) {
            // Error from generateCompletion is already logged within that function
            console.error('Error during personality generation call (after API return):', error.message);
            return null; // Return null on API or parsing failure
        }
    }

    /**
     * Parses a JSON object from a string, attempting to clean common LLM response issues.
     * Tries to extract from ```json blocks first, then falls back to first { and last }.
     * @param text The text potentially containing a JSON object.
     * @returns The parsed object or null if parsing fails.
     */
    private parseJSONFromText(text: string): object | null {
        let jsonString = null;
        
        // 1. Try extracting from ```json code blocks
        const codeBlockMatch = text.match(/```json\s*(\{.*\})\s*```/s);
        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonString = codeBlockMatch[1];
            console.log("[parseJSONFromText] Extracted JSON from ```json block.");
        } else {
            // 2. Fallback: Find the first '{' and the last '}'
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');

            if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
                 jsonString = text.substring(startIndex, endIndex + 1);
                 console.log("[parseJSONFromText] Extracted JSON using first { and last }.");
            } else {
                console.error("[parseJSONFromText] Could not find valid JSON start/end markers ({...}) in Claude response:", text ? text.substring(0, 500) + '...' : 'EMPTY RESPONSE'); // Log truncated response
                return null;
            }
        }
        
        // 3. Attempt to parse the extracted string
        try {
            if (!jsonString) {
                 throw new Error("[parseJSONFromText] jsonString is null after extraction attempts.");
            }
            // Trim whitespace just in case
            return JSON.parse(jsonString.trim()); 
        } catch (error: any) {
            console.error("[parseJSONFromText] Failed to parse extracted JSON string:", error.message);
            console.error("[parseJSONFromText] Attempted to parse:", jsonString ? jsonString.substring(0, 500) + '...' : 'NULL' ); // Log truncated string
            // console.error("[parseJSONFromText] Original Claude raw response:", text); // Log the full raw response
            return null;
        }
    }

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