const Anthropic = require('@anthropic-ai/sdk');

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
      console.log('Anthropic client initialized with properties:', Object.keys(this.client).join(', '));
      
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
   * @param {string | Array<object>} promptOrMessages - The prompt text string OR the structured messages payload (e.g., [{ role: 'user', content: [...] }]).
   * @param {object} options - Additional options (system, temperature, maxTokens).
   * @returns {Promise<string>} The generated completion text.
   */
  async generateCompletion(promptOrMessages, options = {}) {
    const systemPrompt = options.system || 'You are a helpful assistant.';
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || options.max_tokens || 4096; // Allow overriding via options
    
    // Determine message structure based on input type
    let messagesPayload;
    if (typeof promptOrMessages === 'string') {
      // Simple text prompt
      messagesPayload = [
        { role: 'user', content: promptOrMessages }
      ];
    } else if (Array.isArray(promptOrMessages) && promptOrMessages.length > 0 && promptOrMessages[0].role && promptOrMessages[0].content) {
      // Assume it's the structured messages payload (like from AbstractionApproach)
      messagesPayload = promptOrMessages;
    } else {
      throw new Error('Invalid input: generateCompletion requires a prompt string or a valid messages array.');
    }

    return this.withExponentialBackoff(async () => {
      console.log('Sending request to Claude API...'); 
      
      try {
        // Check if any messages contain images
        const hasImages = messagesPayload.some(msg => 
          Array.isArray(msg.content) && 
          msg.content.some(item => item.type === 'image')
        );
        
        if (hasImages) {
          console.log('Request includes image content using Anthropic multimodal API');
        }
        
        // Create the request payload
        const params = {
          model: this.model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: messagesPayload
        };
        
        // First, log the structure of the client to better understand it
        console.log('Client structure:', {
          hasMessages: !!this.client.messages,
          hasMessagesCreate: !!(this.client.messages && typeof this.client.messages.create === 'function'),
          hasCompletions: !!this.client.completions,
          hasCompletionsCreate: !!(this.client.completions && typeof this.client.completions.create === 'function')
        });
        
        // Use a fallback approach - first check if we can use the new messages API directly
        let response;
        
        if (this.client.messages && typeof this.client.messages.create === 'function') {
          console.log('Using client.messages.create method');
          response = await this.client.messages.create(params);
        } 
        // Try alternative approaches if not available
        else if (typeof this.client.createMessage === 'function') {
          console.log('Using client.createMessage method');
          response = await this.client.createMessage(params);
        }
        else if (this.client.completions && typeof this.client.completions.create === 'function') {
          console.log('Falling back to completions API');
          // Convert the messages format to completions format
          const prompt = `${systemPrompt}\n\n${messagesPayload.map(m => 
            `${m.role === 'user' ? 'Human' : 'Assistant'}: ${
              Array.isArray(m.content) 
                ? m.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
                : m.content
            }`
          ).join('\n')}\n\nAssistant: `;
          
          const completionParams = {
            prompt,
            model: this.model,
            max_tokens_to_sample: maxTokens,
            temperature
          };
          
          response = await this.client.completions.create(completionParams);
          
          // Format the response like the messages API would
          return response.completion;
        }
        else {
          console.log('Using raw fetch API call as last resort');
          // As a last resort, use the fetch API directly
          const baseUrl = this.client.baseURL || 'https://api.anthropic.com';
          const apiKey = this.client.apiKey || process.env.ANTHROPIC_API_KEY;
          
          const fetchResponse = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(params)
          });
          
          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(`API request failed: ${fetchResponse.status} ${JSON.stringify(errorData)}`);
          }
          
          response = await fetchResponse.json();
        }
        
        console.log('Received response from Claude API');
        
        // Extract the text content from the response
        if (response.completion) {
          // If using the completions API
          return response.completion;
        } else if (response.content && Array.isArray(response.content)) {
          // For messages API
          const textContent = response.content.find(item => item.type === 'text');
          if (!textContent || !textContent.text) {
            throw new Error('No text content found in Claude API response');
          }
          return textContent.text;
        } else {
          console.error('Unexpected response structure:', response);
          throw new Error('Invalid response structure from Claude API');
        }
      } catch (error) {
        console.error('Error in Claude API request:', error);
        throw error;
      }
    });
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
                    data: base64Image
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
        
        // Make the API call - using the same fallback approach as in generateCompletion
        console.log(`Generating image description for ${imagePath}`);
        
        let response;
        
        if (this.client.messages && typeof this.client.messages.create === 'function') {
          console.log('Using client.messages.create method');
          response = await this.client.messages.create(params);
        } else {
          console.log('Using raw fetch API call for image description');
          // Use the fetch API directly
          const baseUrl = this.client.baseURL || 'https://api.anthropic.com';
          const apiKey = this.client.apiKey || process.env.ANTHROPIC_API_KEY;
          
          const fetchResponse = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(params)
          });
          
          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(`API request failed: ${fetchResponse.status} ${JSON.stringify(errorData)}`);
          }
          
          response = await fetchResponse.json();
        }
        
        console.log('Received response from Claude API for image description');
        
        // Extract text from response
        if (!response.content || !Array.isArray(response.content)) {
          throw new Error('Invalid response structure from Claude API');
        }
        
        const textContent = response.content.find(item => item.type === 'text');
        if (!textContent || !textContent.text) {
          throw new Error('No text content found in Claude API response');
        }
        
        return textContent.text;
      } catch (error) {
        console.error(`Error generating image description:`, error);
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
        
        // Make the API call using the same fallback approach
        console.log('Generating personality profile');
        
        let response;
        
        if (this.client.messages && typeof this.client.messages.create === 'function') {
          console.log('Using client.messages.create method');
          response = await this.client.messages.create(params);
        } else if (this.client.completions && typeof this.client.completions.create === 'function') {
          console.log('Falling back to completions API');
          // Convert to completions format
          const completionPrompt = `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant: `;
          
          const completionParams = {
            prompt: completionPrompt,
            model: this.model,
            max_tokens_to_sample: maxTokens,
            temperature
          };
          
          const completionResponse = await this.client.completions.create(completionParams);
          
          // Convert completion response to expected format
          return this.parseJSONFromText(completionResponse.completion);
        } else {
          console.log('Using raw fetch API call');
          // Use the fetch API directly
          const baseUrl = this.client.baseURL || 'https://api.anthropic.com';
          const apiKey = this.client.apiKey || process.env.ANTHROPIC_API_KEY;
          
          const fetchResponse = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(params)
          });
          
          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(`API request failed: ${fetchResponse.status} ${JSON.stringify(errorData)}`);
          }
          
          response = await fetchResponse.json();
        }
        
        console.log('Received response from Claude API for personality generation');
        
        // Parse the response
        if (!response.content || !Array.isArray(response.content)) {
          throw new Error('Invalid response structure from Claude API');
        }
        
        const textContent = response.content.find(item => item.type === 'text');
        if (!textContent || !textContent.text) {
          throw new Error('No text content found in Claude API response');
        }
        
        // Parse the response as JSON
        return this.parseJSONFromText(textContent.text);
      } catch (error) {
        console.error('Error in personality generation:', error);
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
        .replace(/^```json\n?/g, '')
        .replace(/^```\n?/g, '')
        .replace(/```$/g, '')
        .trim();
        
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse JSON from text:', error);
      return {
        error: 'Failed to parse JSON',
        rawResponse: text
      };
    }
  }

  /**
   * Implements exponential backoff for API calls
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
        const isRateLimitError = error.status === 429;
        const isServerError = error.status >= 500 && error.status < 600;
        
        if ((isRateLimitError || isServerError) && retries <= this.maxRetries) {
          console.log(`API request failed with ${error.status}. Retrying in ${delay/1000} seconds... (Attempt ${retries}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          console.error('API request failed:', error);
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
    // Very rough approximation based on whitespace-split words
    // In production, you'd use a proper tokenizer like GPT-3 uses
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