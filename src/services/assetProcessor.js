const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
// const OpenAIAPI = require('../api/openai'); // Removed OpenAI dependency

// Simple file-based lock implementation
const lockfilePath = path.join(__dirname, '../../data/assets.json.lock');
const lockCheckInterval = 100; // ms to wait between lock checks
const lockTimeout = 5000; // ms to wait before giving up on lock

async function acquireLock() {
  const startTime = Date.now();
  while (true) {
    try {
      // Try to create the lock file exclusively
      await fs.writeFile(lockfilePath, 'locked', { flag: 'wx' }); 
      console.log('Lock acquired');
      return; // Lock acquired
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lock file exists, wait and retry
        if (Date.now() - startTime > lockTimeout) {
          throw new Error('Failed to acquire lock: Timeout');
        }
        console.log('Waiting for lock...');
        await new Promise(resolve => setTimeout(resolve, lockCheckInterval));
      } else {
        // Unexpected error
        throw error;
      }
    }
  }
}

async function releaseLock() {
  try {
    await fs.unlink(lockfilePath);
    console.log('Lock released');
  } catch (error) {
    // Ignore if file doesn't exist (already released)
    if (error.code !== 'ENOENT') {
      console.error('Error releasing lock:', error);
    }
  }
}

class AssetProcessor {
  constructor() {
    // this.openaiAPI = new OpenAIAPI(); // Removed OpenAI initialization
    this.assetsDir = path.join(__dirname, '../../data/assets');
    this.assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
  }
  
  /**
   * Process an asset file (image, text, etc.) and store it in the data directory
   * @param {object} file - Express file upload object
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Processed asset info
   */
  async processAsset(file, metadata = {}) {
    console.log(`AssetProcessor.processAsset called with file: ${file.name}, mimetype: ${file.mimetype}, size: ${file.size} bytes`);
    // Expect userId in metadata now instead of personId
    const userId = metadata.userId || metadata.personId || 'unknown_user'; // Allow personId for backward compatibility during transition
    console.log(`Metadata (expecting userId):`, metadata);
    
    // Ensure we have a valid userId
    if (userId === 'unknown_user') {
      console.warn(`No userId provided for asset ${file.name}, using default: 'unknown_user'`);
    }
    
    // Sanitize userId for directory naming
    const sanitizedUserId = this.sanitizeUserId(userId);
    console.log(`Sanitized userId from "${userId}" to "${sanitizedUserId}"`);
    
    // Update metadata with sanitized userId
    const finalMetadata = {
         ...metadata, // Keep original metadata
         userId: sanitizedUserId, // Ensure this is the primary identifier
         originalUserId: metadata.userId !== sanitizedUserId ? metadata.userId : undefined, // Store original only if different
         personId: undefined, // Remove potentially confusing personId field
         createdAt: new Date().toISOString(),
     };
     // Clean up old personId if it exists from input metadata
     delete finalMetadata.personId; 
     delete finalMetadata.originalPersonId; // Use originalUserId
    
    // Generate a unique ID for the asset
    const assetId = uuidv4();
    
    // Create a safe filename (including assetId for uniqueness)
    const sanitizedOriginalFilename = path.basename(file.name).replace(/[^a-zA-Z0-9-_.]/g, '_');
    const filename = `${sanitizedOriginalFilename}_${assetId}${path.extname(sanitizedOriginalFilename)}`;// Ensure extension is preserved
    
    // Determine the file path where the asset will be stored
    const userDir = path.join(this.assetsDir, sanitizedUserId);
    await fs.mkdir(userDir, { recursive: true });
    
    // Store relative path using forward slashes for consistency
    const relativeFilePath = path.join(sanitizedUserId, filename).replace(/\\/g, '/'); 
    const fullPath = path.join(this.assetsDir, relativeFilePath);
    
    // Move the file using the provided mv function
    try {
      // The file object provided by express-fileupload or scraping needs an mv method
      await file.mv(fullPath);
      console.log(`File moved to: ${fullPath}`);
    } catch (error) {
      console.error(`Error moving file: ${error}`);
      throw new Error(`Failed to move file: ${error.message}`);
    }

     // Extract content (simple text/placeholder for now)
     const extractedContent = await this.extractContent(file);
    
    // Create an asset object for the registry
    const asset = {
      id: assetId,
      filename: sanitizedOriginalFilename, // Store original filename separately
      filePath: relativeFilePath, // Store relative path
      mimetype: file.mimetype,
      size: file.size,
      metadata: finalMetadata, // Use the processed metadata with userId
      extractedContent: extractedContent, // Keep extracted content if needed
      extractedContentLength: extractedContent ? extractedContent.length : 0,
    };
    
    // Store the asset metadata in the registry
    await this.storeAsset(asset);
    
    console.log(`Asset ${assetId} (${sanitizedOriginalFilename}) processed and stored successfully for user ${sanitizedUserId}`);
    return asset;
  }
  
  /**
   * Extract content from uploaded file based on its type
   * @param {object} file - The uploaded file object
   * @returns {Promise<string>} Extracted content as text
   */
  async extractContent(file) {
    console.log(`ExtractContent called for file: ${file.name}, mimetype: ${file.mimetype}`);
    
    const mimetype = file.mimetype;
    
    // Simple content extraction based on file type
    if (mimetype === 'text/plain') {
      // For text files, read the content
      let textContent = '';
      
      // Handle different ways the file content might be available
      if (file.data) {
        // If we have Buffer data directly
        textContent = file.data.toString('utf-8');
        console.log(`Got text content from file.data buffer, length: ${textContent.length}`);
      } else if (file.tempFilePath) {
        // If we have a temporary file path
        const buffer = await fs.readFile(file.tempFilePath);
        textContent = buffer.toString('utf-8');
        console.log(`Got text content from tempFilePath, length: ${textContent.length}`);
      } else {
        throw new Error('No data or tempFilePath found for text file');
      }
      
      return textContent;
    } 
    // For images, just store a placeholder text (in MVP)
    else if (mimetype.startsWith('image/')) {
      console.log(`Processing image file: ${file.name}`);
      return `[IMAGE: ${file.name}]`;
    }
    // For application/json
    else if (mimetype === 'application/json') {
      let textContent = '';
      if (file.data) {
        textContent = file.data.toString('utf-8');
      } else if (file.tempFilePath) {
        const buffer = await fs.readFile(file.tempFilePath);
        textContent = buffer.toString('utf-8');
      }
      console.log(`Got JSON content, length: ${textContent.length}`);
      return textContent;
    }
    // For application/pdf, application/msword, etc.
    else if (mimetype.includes('application/')) {
      console.log(`Processing document file: ${file.name}`);
      return `[DOCUMENT: ${file.name}]`;
    }
    else {
      console.error(`Unsupported file type: ${mimetype}`);
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
  }
  
  /**
   * Store asset metadata in assets registry JSON file
   * @param {object} assetInfo - The asset information object
   */
  async storeAsset(assetInfo) {
    await acquireLock(); // Acquire lock before accessing the file
    try {
      let assets = [];

      try {
        // Read existing assets registry
        const data = await fs.readFile(this.assetsRegistryFile, 'utf-8');
        assets = JSON.parse(data);
        if (!Array.isArray(assets)) {
            console.warn('Assets registry file content is not an array, resetting.');
            assets = [];
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log('Assets registry file not found, creating a new one.');
        } else if (error instanceof SyntaxError) {
            console.error('Error parsing assets registry file (corrupted?), backing up and starting fresh.', error);
            // Attempt to backup corrupted file
            try {
                await fs.rename(this.assetsRegistryFile, `${this.assetsRegistryFile}.corrupted_${Date.now()}.bak`);
            } catch (backupError) {
                console.error('Failed to backup corrupted assets registry file:', backupError);
            }
            assets = []; // Start fresh
        } else {
          throw error; // Rethrow unexpected errors
        }
      }
      
      // Check for duplicates before pushing (optional, but good practice)
      const existingIndex = assets.findIndex(a => a.id === assetInfo.id);
      if (existingIndex !== -1) {
          console.warn(`Asset ID ${assetInfo.id} already exists in registry. Overwriting.`);
          assets[existingIndex] = assetInfo;
      } else {
          assets.push(assetInfo);
      }
      
      // Write updated assets back to file
      await fs.writeFile(this.assetsRegistryFile, JSON.stringify(assets, null, 2), 'utf-8');
      console.log(`Stored/Updated asset ${assetInfo.id} in registry`);
    } catch (error) {
      console.error('Error storing asset in registry:', error);
      // Don't rethrow, as asset might be partially processed
    } finally {
      await releaseLock(); // Ensure lock is always released
    }
  }
  
  /**
   * Get all assets for a person or all assets if no personId is provided
   * @param {string} [userId] - Optional userId to filter the assets
   * @returns {Promise<Array<object>>} List of assets
   */
  async getAllAssets(userId = null) {
    console.log(`AssetProcessor.getAllAssets called for userId: ${userId || 'all users'}`);
    let allAssets = [];
    try {
      const data = await fs.readFile(this.assetsRegistryFile, 'utf-8');
      allAssets = JSON.parse(data);
       if (!Array.isArray(allAssets)) { 
           console.warn('assets.json is not an array, returning empty.'); 
           return []; 
       }
    } catch (error) {
      if (error.code === 'ENOENT') { return []; }
      console.error(`Error reading assets registry file: ${error.message}`);
      throw error;
    }
    
    let userAssets;
    if (userId) {
      const sanitizedUserId = this.sanitizeUserId(userId);
      console.log(`Filtering assets for sanitized userId: ${sanitizedUserId} (original: ${userId})`);
      userAssets = allAssets.filter(asset => 
         asset.metadata && 
         (asset.metadata.userId === sanitizedUserId || asset.metadata.userId === userId) // Match sanitized or original
      );
      console.log(`Found ${userAssets.length} assets for user: ${userId}`);
    } else {
      userAssets = allAssets;
      console.log(`Returning all ${userAssets.length} assets (no userId filter)`);
    }
    
    // Sort assets: text first, then by date (newest first)
    userAssets.sort((a, b) => {
      const typeA = a.mimetype?.startsWith('text') ? 0 : (a.mimetype?.startsWith('image') ? 1 : 2);
      const typeB = b.mimetype?.startsWith('text') ? 0 : (b.mimetype?.startsWith('image') ? 1 : 2);
      if (typeA !== typeB) return typeA - typeB;
      
      const dateA = a.metadata?.createdAt || '1970-01-01T00:00:00Z';
      const dateB = b.metadata?.createdAt || '1970-01-01T00:00:00Z';
      return dateB.localeCompare(dateA);
    });
    
    return userAssets;
  }

  /**
   * Delete an asset by its ID
   * Removes the asset entry from assets.json and deletes the file.
   * @param {string} assetId - The ID of the asset to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  async deleteAsset(assetId) {
    await acquireLock(); // Acquire lock before modifying assets registry
    let success = false;
    let assetToDelete = null;
    let assets = [];
    try {
        // Read existing assets
        try {
            const data = await fs.readFile(this.assetsRegistryFile, 'utf-8');
            assets = JSON.parse(data);
            if (!Array.isArray(assets)) { console.error('Assets registry invalid.'); return false; }
        } catch (error) {
             if (error.code === 'ENOENT') { console.log('Assets registry empty.'); return false; }
             else { console.error('Error reading assets registry:', error); return false; }
        }

        const originalLength = assets.length;
        const filteredAssets = assets.filter(asset => {
            if (asset.id === assetId) {
                assetToDelete = asset;
                return false;
            }
            return true;
        });

        if (!assetToDelete) { console.warn(`Asset ${assetId} not found. Cannot delete.`); return false; }

        if (filteredAssets.length < originalLength) {
            await fs.writeFile(this.assetsRegistryFile, JSON.stringify(filteredAssets, null, 2), 'utf-8');
            console.log(`Removed asset ${assetId} from assets registry.`);

            // Now delete the actual file
            if (assetToDelete.filePath) {
                const absoluteFilePath = path.join(this.assetsDir, assetToDelete.filePath);
                try {
                    await fs.unlink(absoluteFilePath);
                    console.log(`Deleted asset file: ${absoluteFilePath}`);
                    success = true; 
                } catch (fileError) {
                    if (fileError.code === 'ENOENT') {
                        console.warn(`Asset file not found for ${assetId}, but removed entry.`);
                        success = true; // Consider successful if entry removed
                    } else {
                        console.error(`Error deleting asset file ${absoluteFilePath}:`, fileError);
                        // Mark as failed if file deletion error occurs after registry update
                        success = false; 
                    }
                }
            } else {
                 console.warn(`Asset ${assetId} had no filePath. Removed registry entry only.`);
                 success = true; // Still successful if record removed
            }
        }
    } catch (error) {
        console.error(`Error during deleteAsset operation for ${assetId}:`, error);
        success = false;
    } finally {
        await releaseLock(); // Always release the lock
    }
    return success;
  }

  /**
   * Sanitize userId to ensure consistent directory naming
   * This helps prevent issues with dots, special characters, and website prefixes
   * @param {string} userId - The original userId to sanitize
   * @returns {string} Sanitized userId suitable for directory naming
   */
  sanitizeUserId(userId) {
    if (!userId) return 'unknown_user';
    let sanitized = String(userId);
    // Basic sanitization: lowercase, replace non-alphanumeric (except _-) with _, collapse underscores
    sanitized = sanitized.toLowerCase()
                         .replace(/[^a-z0-9_-]/g, '_')
                         .replace(/_+/g, '_');
    // Trim leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    // Truncate if too long
    if (sanitized.length > 50) sanitized = sanitized.substring(0, 50);
    if (!sanitized) return 'invalid_user'; // Handle case where sanitization results in empty string
    return sanitized;
  }
}

module.exports = AssetProcessor;