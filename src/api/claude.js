const Anthropic = require('@anthropic-ai/sdk');

// Helper to stringify complex objects for logging, handling circular refs and limiting depth
function safeLogStringify(obj, depth = 5) { // Added depth limit
  const cache = new Set();
  let level = 0;
  return JSON.stringify(obj, (key, value) => {
    // Basic type handling first
    if (typeof value === 'bigint') {
        return value.toString() + 'n'; // Stringify BigInts
    }
    if (typeof value === 'function') {
        return '[Function]';
    }
    if (value instanceof Error) {
        return { message: value.message, stack: value.stack?.split('\n').slice(0, 5).join('\n') + '...' }; // Basic error info
    }

    // Handle objects and circular refs
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found
        return '[Circular]';
      }
      // Check depth
      if (level >= depth) {
        return '[Max Depth Reached]';
      }
      // Store value in our collection
      cache.add(value);
      level++; // Increment level for nested objects
    }
    
    // Limit string length for large content
    if (typeof value === 'string' && value.length > 1000) { // Increased truncation limit slightly
      return `${value.substring(0, 1000)}...[truncated length ${value.length}]`;
    }
    // Limit base64 image data length
    if (key === 'data' && typeof value === 'string' && value.length > 100 && value.startsWith('data:image')) {
        return `${value.substring(0, 50)}...[base64 image data truncated length ${value.length}]`;
    }
    return value;
  }, 2); // Indent with 2 spaces for readability
}

class ClaudeAPI {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    try {
      // Initialize the client
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      // Log the client structure for debugging
      console.log('Anthropic client initialized.'); // Simplified init log
      
      // Set model and retry settings
      this.model = 'claude-3-opus-20240229'; // Using a compatible model
      this.maxRetries = 3;
      this.retryInitialDelay = 1000; // 1 second
    } catch (error) {
      console.error('Error initializing Anthropic client:', error);
      throw error;
    }
  }

  /**
   * Generate a completion (response) from Claude, supporting multimodal input.
   * Handles both regular and streaming requests.
   * @param {string | Array<object>} promptOrMessages - The prompt text string OR the structured messages payload.
   * @param {object} options - Additional options (system, temperature, maxTokens, stream).
   * @returns {Promise<string | AsyncIterable<object>>} The generated completion text OR an async iterable for streaming.
   */
  async generateCompletion(promptOrMessages, options = {}) {
    const systemPrompt = options.system || 'You are a helpful assistant.';
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || options.max_tokens || 4096; 
    const stream = options.stream || false; // Default to non-streaming
    
    // Determine message structure based on input type
    let messagesPayload;
    if (typeof promptOrMessages === 'string') {
      messagesPayload = [{ role: 'user', content: promptOrMessages }];
    } else if (Array.isArray(promptOrMessages) && promptOrMessages.length > 0 && promptOrMessages[0].role && promptOrMessages[0].content) {
      messagesPayload = promptOrMessages;
    } else {
      throw new Error('Invalid input: generateCompletion requires a prompt string or a valid messages array.');
    }

    // --- Enhanced Logging --- 
    console.log(`\n--- ClaudeAPI: generateCompletion (Stream: ${stream}) ---`);
    const logParams = {
        model: this.model,
        temperature: temperature,
        max_tokens: maxTokens,
        systemPrompt: systemPrompt, // Log full system prompt
        messages: messagesPayload // Log full message payload
    };
    console.log(`Request Params:\n${safeLogStringify(logParams)}`);
    // --- End Enhanced Logging ---
    
    // We won't use exponential backoff wrapper directly here for streaming clarity
    // Retries need to be handled differently for streams if needed
    try {
      const params = {
        model: this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt,
        messages: messagesPayload,
        stream: stream // Pass the stream option
      };

      if (this.client.messages && typeof this.client.messages.create === 'function') {
        const response = await this.client.messages.create(params);

        if (stream) {
          console.log('Claude API: Returning stream.');
          // Caller needs to handle the stream
          return response; 
        } else {
          // Handle non-streaming response
          if (response.content && Array.isArray(response.content)) {
            const textContent = response.content.find(item => item.type === 'text');
            if (!textContent || !textContent.text) {
              throw new Error('No text content found in Claude API response');
            }
            const responseText = textContent.text;
            console.log(`Claude Response (Full):\n${responseText}`); // Log full non-streamed response
            console.log(`--- End generateCompletion (Non-Stream) ---`);
            return responseText;
          } else {
            console.error('Unexpected non-stream response structure:', response);
            throw new Error('Invalid non-stream response structure from Claude API');
          }
        }
      } else {
        throw new Error('Anthropic client does not support messages.create method.');
        // Note: Fallbacks to completions or raw fetch are harder to adapt for streaming 
        // and are removed for simplicity in this streaming refactor.
      }
    } catch (error) {
      console.error('Error in Claude API request (generateCompletion):', error);
      console.log(`--- End generateCompletion (Error) ---`);
      throw error; // Re-throw after logging
    }
  }
  
  /**
   * Generate a detailed description of an image using Claude's multimodal capabilities
   * @param {string} imagePath - Path to the image file
   * @param {object} options - Additional options
   * @returns {Promise<string>} The generated image description
   */
  async generateImageDescription(imagePath, options = {}) {
    const fs = require('fs');
    const systemPrompt = options.system || 
      'You are an assistant that provides extremely detailed visual descriptions of images. ' +
      'Focus on colors, objects, textures, composition, lighting, and any text visible in the image. ' +
      'Be thorough and descriptive with high imagery, as this will be used to generate a personality.';
    const temperature = options.temperature || 0.5;
    const maxTokens = options.maxTokens || 4096;

    // --- Logging --- 
    console.log(`\n--- ClaudeAPI: generateImageDescription ---`);
    const logParams = {
        imagePath: imagePath,
        model: this.model,
        temperature: temperature,
        max_tokens: maxTokens,
        systemPrompt: systemPrompt,
    };
    console.log(`Request Params (excluding image data):\n${safeLogStringify(logParams)}`);
    // --- End Logging ---
    
    return this.withExponentialBackoff(async () => {
      try {
        // Read the image file as a base64-encoded string
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');
        const mimeType = this.getMimeType(imagePath);
        
        // Create the request parameters
        const params = {
          model: this.model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: [
            { 
              role: 'user', 
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Image // Base64 data will be truncated by safeLogStringify
                  }
                },
                {
                  type: 'text',
                  text: 'Please provide an extremely detailed description of this image with high imagery. Focus on colors, objects, textures, composition, lighting, and any text visible in the image.'
                }
              ]
            }
          ]
        };

        console.log(`Messages Payload (structure only):\n${safeLogStringify(params.messages.map(msg => ({
            role: msg.role,
            content_types: Array.isArray(msg.content) ? msg.content.map(c => c.type) : typeof msg.content,
        })))}`);
        
        let response;
        
        if (this.client.messages && typeof this.client.messages.create === 'function') {
          response = await this.client.messages.create(params);
        } else {
          throw new Error('Anthropic client does not support messages.create method for images.');
          // Fallback removed for simplicity
        }
        
        // Extract text from response
        if (!response.content || !Array.isArray(response.content)) {
          throw new Error('Invalid response structure from Claude API');
        }
        
        const textContent = response.content.find(item => item.type === 'text');
        if (!textContent || !textContent.text) {
          throw new Error('No text content found in Claude API response');
        }
        const responseText = textContent.text;
        
        console.log(`Claude Response (Full):\n${responseText}`);
        console.log(`--- End generateImageDescription ---`);
        return responseText;

      } catch (error) {
        console.error(`Error generating image description:`, error);
        console.log(`--- End generateImageDescription (Error) ---`);
        throw error;
      }
    });
  }
  
  /**
   * Generate a personality profile based on content
   * @param {Array<string>} contents - Array of text content to analyze
   * @param {object} options - Additional options
   * @returns {Promise<object>} JSON personality profile
   */
  async generatePersonality(contents, options = {}) {
    const systemPrompt = options.system || 
      'You are an expert psychologist who creates detailed personality profiles. ' +
      'Based on the content provided, create a comprehensive personality description ' +
      'that captures tone, voice, beliefs, interests, and communication style.';
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 8192;
    
    // Join all content with separators
    const combinedContent = contents.join('\n\n---\n\n');
    
    // Create specific instruction for generating JSON personality
    const prompt = `
    Based on the following content, create a detailed personality profile in JSON format.
    The JSON should include the following fields:
    - "traits": key personality traits as an array of strings
    - "interests": main interests and hobbies as an array of strings
    - "values": core values and beliefs as an array of strings
    - "communicationStyle": how this person communicates (tone, style, vocabulary) as an object
    - "background": likely background information inferred from the content as an object
    - "voiceDescription": a 2-3 paragraph description of how this person's voice and writing style sounds
    
    Be specific and detailed, drawing directly from the provided content.
    
    CONTENT:
    ${combinedContent}
    
    OUTPUT FORMAT:
    Return ONLY valid JSON with no additional explanation or text.
    `;

    // --- Logging ---
    console.log(`\n--- ClaudeAPI: generatePersonality ---`);
    const logParams = {
        model: this.model,
        temperature: temperature,
        max_tokens: maxTokens,
        systemPrompt: systemPrompt,
        promptLength: prompt.length, // Log prompt length instead of full prompt
        contentCount: contents.length,
    };
    console.log(`Request Params:\n${safeLogStringify(logParams)}`);
    // --- End Logging ---
    
    return this.withExponentialBackoff(async () => {
      try {
        // Create the request parameters
        const params = {
          model: this.model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: prompt }
          ]
        };

        console.log(`Messages Payload (structure only):\n${safeLogStringify(params.messages.map(msg => ({
            role: msg.role,
            content_type: typeof msg.content,
            content_length: typeof msg.content === 'string' ? msg.content.length : 'N/A'
        })))}`);
        
        let response;
        
        if (this.client.messages && typeof this.client.messages.create === 'function') {
          response = await this.client.messages.create(params);
        } else {
          throw new Error('Anthropic client does not support messages.create method for personality generation.');
          // Fallback removed for simplicity
        }
        
        // Extract text content
        if (!response.content || !Array.isArray(response.content)) {
          throw new Error('Invalid response structure from Claude API');
        }
        
        const textContent = response.content.find(item => item.type === 'text');
        if (!textContent || !textContent.text) {
          throw new Error('No text content found in Claude API response');
        }
        const responseText = textContent.text;

        // Parse the response as JSON
        const parsedJson = this.parseJSONFromText(responseText); // Logs raw response on failure
        console.log(`Claude Response (Full JSON):\n${safeLogStringify(parsedJson)}`);
        console.log(`--- End generatePersonality ---`);
        return parsedJson;

      } catch (error) {
        console.error('Error in personality generation:', error);
        console.log(`--- End generatePersonality (Error) ---`);
        throw error;
      }
    });
  }
  
  /**
   * Parse JSON from text response, handling markdown code blocks
   * @param {string} text - Text potentially containing JSON
   * @returns {object} Parsed JSON object
   */
  parseJSONFromText(text) {
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedResponse = text.trim()
        .replace(/^```json\n?/g, '') // Handle ```json prefix
        .replace(/^```\n?/g, '')    // Handle ``` prefix
        .replace(/```$/g, '')     // Handle ``` suffix
        .trim();
        
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse JSON from text:', error);
      console.error('Raw text received for parsing:', text); // Log the raw text on parse failure
      return {
        error: 'Failed to parse JSON',
        rawResponse: text
      };
    }
  }

  /**
   * Implements exponential backoff for API calls (only used for non-streaming methods now)
   * @param {Function} apiCall - The API call function to execute
   * @returns {Promise<any>} The result of the API call
   */
  async withExponentialBackoff(apiCall) {
    let retries = 0;
    let delay = this.retryInitialDelay;
    
    while (true) {
      try {
        return await apiCall();
      } catch (error) {
        retries++;
        // Attempt to access status safely
        const status = error?.status || error?.response?.status;
        const isRateLimitError = status === 429;
        const isServerError = status >= 500 && status < 600;
        
        if ((isRateLimitError || isServerError) && retries <= this.maxRetries) {
          console.warn(`API request failed with status ${status || 'unknown'}. Retrying in ${delay/1000} seconds... (Attempt ${retries}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          // Error already logged in the calling function's catch block
          throw error;
        }
      }
    }
  }

  /**
   * Simple token count estimator (rough approximation)
   * @param {string} text - The text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
  
  /**
   * Determine MIME type based on file extension
   * @param {string} filePath - Path to the file
   * @returns {string} MIME type
   */
  getMimeType(filePath) {
    const path = require('path');
    const extension = path.extname(filePath).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
}

module.exports = ClaudeAPI;