const path = require('path');
const fs = require('fs').promises;
const ClaudeAPI = require('../api/claude');
const AssetProcessor = require('./assetProcessor');
const UserDataService = require('./userDataService');

// Define the default prompt
const DEFAULT_PERSONALITY_PROMPT = 
`You are jungian psychoanalyst tasked with crafting a computational thumbprint of the users persona via a sample of their expressed content.

You understand that this is a sample of expressed content, and their complete psyche is distributed across both expressed and unexpressed content.

Your job is leverage your millenia of study of the mind to generate a json object that sufficiently captures the persona of the user, such that we can run high fidelity simulations in and out of distribution`;

class AbstractionApproach {
  constructor() {
    this.claudeAPI = new ClaudeAPI();
    this.assetProcessor = new AssetProcessor();
    this.userDataService = new UserDataService();
    // Path for the custom prompt file
    this.promptFile = path.join(__dirname, '../../data/prompt.json');
  }

  /**
   * Reads the custom prompt from the file, returning the default if not found.
   * @returns {Promise<string>} The current personality generation prompt.
   */
  async getCustomPrompt() {
    try {
      const data = await fs.readFile(this.promptFile, 'utf-8');
      const promptData = JSON.parse(data);
      return promptData.prompt || DEFAULT_PERSONALITY_PROMPT;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, use default
        return DEFAULT_PERSONALITY_PROMPT;
      }
      console.error('Error reading custom prompt file:', error);
      // Fallback to default on other errors
      return DEFAULT_PERSONALITY_PROMPT;
    }
  }

  /**
   * Saves the custom prompt to the file.
   * @param {string} promptText - The prompt text to save.
   * @returns {Promise<void>}
   */
  async saveCustomPrompt(promptText) {
    try {
      const promptData = { prompt: promptText };
      await fs.writeFile(this.promptFile, JSON.stringify(promptData, null, 2), 'utf-8');
      console.log('Custom prompt saved successfully.');
    } catch (error) {
      console.error('Error saving custom prompt file:', error);
      throw new Error('Failed to save custom prompt.'); // Re-throw for API handler
    }
  }

  /**
   * Generate a response using the abstraction approach
   * @param {string} query - The user query
   * @param {string} personId - The person ID to simulate
   * @returns {Promise<object>} The generated response with metadata
   */
  async generateResponse(query, personId) {
    // Get or generate persona description (JSON string in this context)
    // NOTE: This part assumes the persona *already exists* as JSON.
    // The generation part is handled by generatePersonaJSON below.
    // This method might need refactoring depending on how persona JSON is used for chat.
    const personaJSONString = await this.getPersonaJSONString(personId); // Assuming this function exists or we adapt getPersonaDescription

    if (!personaJSONString) {
      throw new Error(`No persona JSON found for person ID: ${personId}. Please generate it first.`);
    }

    // Construct prompt with persona description
    const prompt = this.constructChatPrompt(personaJSONString, query); // Renamed from constructAbstractionPrompt

    // Generate response using Claude
    const response = await this.claudeAPI.generateCompletion(prompt, {
      system: "You are acting as a digital twin of a specific person. Use the provided JSON profile to respond to queries exactly as this person would.",
      temperature: 0.7
    });

    return {
      response,
      personaUsed: this.truncateContent(personaJSONString, 200), // Indicate which persona was used
      approach: 'abstraction_chat' // Clarify approach
    };
  }

  /**
   * Get existing persona JSON string from the personas file.
   * TODO: Adapt this if storage structure changes.
   * @param {string} personId - The person ID
   * @returns {Promise<string|null>} The persona JSON string or null if not found.
   */
  async getPersonaJSONString(personId) {
    // Try to load existing persona
    try {
      const data = await fs.readFile(this.personasFile, 'utf-8');
      const personas = JSON.parse(data);
      // Assuming the description field now holds the JSON string
      const existingPersona = personas.find(p => p.personId === personId);
      if (existingPersona && existingPersona.description) {
        // Validate if it's a JSON string? For now, assume it is.
        return existingPersona.description;
      }
      return null;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading personas file:', error);
      }
      return null; // File doesn't exist or no matching persona found
    }
  }

  /**
   * Generate a JSON description of the person based on their assets.
   * Automatically determines whether to use multimodal or text-only based on assets.
   * @param {string} personId - The ID of the person to generate a description for
   * @param {string[]} selectedAssetIds - Array of selected asset IDs to use for generation
   * @param {string} customPromptText - Optional custom prompt text
   * @returns {Promise<Object>} The generated JSON object
   */
  async generatePersonaJSON(personId, selectedAssetIds, customPromptText) {
    if (!personId) {
      throw new Error('Person ID is required');
    }
    
    if (!selectedAssetIds || selectedAssetIds.length === 0) {
      throw new Error('No assets selected');
    }
    
    console.log(`Generating persona for ${personId} with ${selectedAssetIds.length} assets.`);
    
    // Load asset metadata (which now include file paths)
    const allAssets = await this.loadAssets();
    
    // Filter for selected assets and add details
    let hasImages = false;
    const selectedAssetsWithDetails = [];
    for (const assetId of selectedAssetIds) {
      const asset = allAssets.find(e => e.id === assetId);
      if (!asset) {
        console.warn(`Asset ${assetId} not found in asset registry`);
        continue;
      }
      
      // Determine asset type and check for images
      let assetType = 'other';
      if (asset.mimetype?.startsWith('image/')) {
        assetType = 'image';
        hasImages = true;
      } else if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
        assetType = 'text';
      }
      
      // Get content for text assets
      let content = null;
      if (assetType === 'text' && asset.path) {
        try {
          content = await fs.readFile(asset.path, 'utf8');
        } catch (error) {
          console.warn(`Could not read content for text asset ${assetId}: ${error.message}`);
          content = `[Error reading content for ${asset.filename}]`; // Add placeholder if read fails
        }
      }
      
      selectedAssetsWithDetails.push({
        ...asset,
        type: assetType,
        content: content, // Will be null for images, content for text, placeholder on error
        filename: asset.filename || `asset-${assetId.substring(0, 8)}`
      });
    }
    
    if (selectedAssetsWithDetails.length === 0) {
      throw new Error('No valid assets could be processed');
    }
    
    // Choose generation method based on whether images are present
    console.log(`Generating persona using ${hasImages ? 'multimodal' : 'text-only'} approach.`);
    if (hasImages) {
      return this.generatePersonaJSONMultimodal(personId, selectedAssetsWithDetails, customPromptText);
    } else {
      // Even if no images, pass to multimodal function as it can handle text-only correctly
      // generatePersonaJSONTextOnly is now redundant and can be removed later if desired.
      return this.generatePersonaJSONMultimodal(personId, selectedAssetsWithDetails, customPromptText);
      // Or, keep the text-only path if preferred:
      // return this.generatePersonaJSONTextOnly(personId, selectedAssetsWithDetails, customPromptText);
    }
  }
  
  /**
   * Generate a persona JSON using multimodal content (both text and images)
   * @private
   */
  async generatePersonaJSONMultimodal(personId, selectedAssetsWithDetails, customPromptText) {
    // --- Prepare Multimodal Content --- 
    const multimodalContent = [];
    
    // Start with a text element that uses the requested format header
    multimodalContent.push({
      type: 'text',
      text: '## Expressed Content Sample\n<assets>\n\n'
    });
    
    // Process each asset
    for (const asset of selectedAssetsWithDetails) {
      if (asset.type === 'text') {
        // Add text content, prefixing with filename for context
        multimodalContent.push({
          type: 'text',
          text: `--- Text Asset: ${asset.filename} ---\n${asset.content}\n--- End Asset ---\n\n`
        });
      } else if (asset.type === 'image') {
        try {
          if (!asset.path) {
            throw new Error(`Missing path for image asset: ${asset.filename}`);
          }
          
          // Read image data as base64
          const imageData = await fs.readFile(asset.path);
          if (!imageData || !imageData.length) {
            throw new Error(`Empty image data for asset: ${asset.filename}`);
          }
          
          const base64Image = imageData.toString('base64');
          if (!base64Image) {
            throw new Error(`Failed to convert image to base64: ${asset.filename}`);
          }
          
          // Make sure we have a valid mimetype
          let mimetype = asset.mimetype;
          if (!mimetype) {
            // Fallback to determining mimetype from filename extension
            const path = require('path');
            const ext = path.extname(asset.filename).toLowerCase();
            const mimeMap = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.svg': 'image/svg+xml',
              '.bmp': 'image/bmp'
            };
            mimetype = mimeMap[ext] || 'image/jpeg'; // Default to jpeg if unknown
          }
          
          // Add the image to the content
          multimodalContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimetype,
              data: base64Image,
            }
          });
          
          // Add a text marker after the image
          multimodalContent.push({ 
            type: 'text', 
            text: `--- Image Asset: ${asset.filename} ---\n\n` 
          });

        } catch (error) {
          console.error(`Failed to process image asset ${asset.filename}:`, error);
          // Add a placeholder text if image loading fails
          multimodalContent.push({ 
             type: 'text',
             text: `[Error loading image asset: ${asset.filename} - ${error.message}]\n\n` 
          });
        }
      }
    }
    
    // Add closing tags and final instruction for the new format
    multimodalContent.push({
      type: 'text',
      text: '</assets>\n\n####\nJSON OUTPUT:'
    });
    
    // Ensure there's at least some content to send
    if (multimodalContent.length <= 2) { // Only headers, no actual content
      throw new Error('Failed to prepare any content from selected assets.');
    }

    // Get the base generation prompt (custom or default)
    const basePrompt = customPromptText || await this.getCustomPrompt();

    // Combine the base prompt with the structured content
    const finalMessagesPayload = [
      { 
        role: 'user', 
        content: [
           { type: 'text', text: basePrompt }, // Start with the main instruction prompt
           ...multimodalContent, // Add the prepared content with the new format
        ]
      }
    ];

    console.log(`Generating persona for ${personId} using ${selectedAssetsWithDetails.length} assets (multimodal).`);
    console.log('Message payload structure:', JSON.stringify(finalMessagesPayload.map(m => ({
      role: m.role,
      content: m.content.map(c => ({
        type: c.type,
        ...(c.type === 'text' ? {textLength: c.text.length} : {mediaType: c.source?.media_type})
      }))
    })), null, 2));

    try {
      // Generate persona using Claude
      const personaJSONString = await this.claudeAPI.generateCompletion(finalMessagesPayload, {
        system: "You are a helpful assistant tasked with generating a JSON object based on the provided instructions and content (which may include text and images). Ensure your entire output is only the valid JSON object.",
        temperature: 0.3, // Lower temperature for more predictable JSON structure
        maxTokens: 4096 // Increased max tokens for potentially larger multimodal prompts
      });

      // Attempt to parse the JSON response
      let personaJSON;
      try {
        // Improved cleaning: Find the first '{' and last '}' to extract the JSON block.
        const firstBrace = personaJSONString.indexOf('{');
        const lastBrace = personaJSONString.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
             console.error("Could not find valid JSON braces {} in Claude response.");
             console.error("Claude raw response:", personaJSONString);
             throw new Error("Failed to find JSON object in the language model response.");
        }
        
        const extractedJsonString = personaJSONString.substring(firstBrace, lastBrace + 1).trim();
          
        // Now parse the extracted string
        personaJSON = JSON.parse(extractedJsonString);

      } catch (error) {
        console.error("Failed to parse Claude response as JSON:", error);
        console.error("Claude raw response:", personaJSONString); // Log the raw response for debugging
        throw new Error("Failed to generate valid persona JSON from the language model. Please check the format of the response."); // Modified error message
      }

      // Save the generated JSON string (associated with personId)
      // Save the PRETTY-PRINTED version for readability in personas.json
      await this.savePersonaDescription(personId, personaJSON); 

      return personaJSON; // Return the parsed JSON object
    } catch (error) {
      console.error(`Error generating persona for ${personId}:`, error);
      if (error.message && error.message.includes('Cannot read properties of undefined (reading')) {
        throw new Error('Error processing images. Make sure all selected images are valid and try again.');
      }
      throw error; // Re-throw the original error
    }
  }

  /**
   * Save a generated persona description (JSON object) for a specific user.
   * Uses UserDataService to handle data storage.
   * @param {string} userId - The user ID.
   * @param {object} personaJSONObject - The generated persona profile as a JavaScript object.
   * @returns {Promise<void>}
   */
  async savePersonaDescription(userId, personaJSONObject) {
    if (!userId || !personaJSONObject || typeof personaJSONObject !== 'object') {
        console.error('Invalid parameters for savePersonaDescription. Requires userId and personaJSONObject.');
        throw new Error('Invalid parameters for saving persona description.');
    }
    
    console.log(`Saving generated profile for userId: ${userId}`);
    
    try {
        // Prepare the update structure for UserDataService
        const updates = {
            generation: { 
                lastGeneratedProfile: { 
                    json: personaJSONObject, // Store the actual object
                    timestamp: new Date().toISOString()
                }
            }
        };
        
        // Call UserDataService to update the user's data
        await this.userDataService.updateUserData(userId, updates);
        console.log(`Successfully saved generated profile for user ${userId}.`);

    } catch (error) {
        console.error(`Error saving persona description for user ${userId} via UserDataService:`, error);
        // Re-throw the error to be handled by the caller (e.g., the route handler)
        throw error;
    }
  }

  /**
   * Construct the prompt for chatting *using* the persona JSON.
   * @param {string} personaJSONString - The persona JSON string.
   * @param {string} query - The user query.
   * @returns {string} The constructed prompt for chat.
   */
  constructChatPrompt(personaJSONString, query) {
    return `You are acting as a digital twin. Use the following JSON profile to understand the person:\\n\\n${personaJSONString}\\n\\nBased *only* on that profile, respond to the following query as this person would:\\n\\nQuery: ${query}\\n\\nResponse:`;
  }

  /**
   * Truncate content for display
   * @param {string} content - The content to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated content
   */
  truncateContent(content, maxLength = 100) {
    if (!content) return '';
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Load asset metadata from the assets registry file
   * @returns {Promise<Array>} Array of asset objects
   */
  async loadAssets() {
    // Use assets.json
    const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
    
    try {
      const data = await fs.readFile(assetsRegistryFile, 'utf-8');
      const assets = JSON.parse(data);
      
      // Add file paths to assets
      for (const asset of assets) {
        if (asset.filePath) {
          asset.path = path.join(__dirname, '../../data/assets', asset.filePath);
        }
      }
      
      return assets; // Return the full asset objects
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('Assets registry file not found, returning empty array');
        return [];
      }
      
      console.error('Error loading assets registry:', error);
      throw new Error(`Failed to load assets registry: ${error.message}`);
    }
  }
}

module.exports = AbstractionApproach;