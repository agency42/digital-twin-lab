const express = require('express');
const path = require('path');
const fs = require('fs').promises;

function createAssetRouter(assetProcessor, claudeAPI) {
  const router = express.Router();

  // GET /api/assets - Get assets, optionally filtered by userId
  router.get('/', async (req, res) => {
    try {
      const { userId } = req.query; // Get userId from query parameter
      
      // Use AssetProcessor method to get assets
      const userAssets = await assetProcessor.getAllAssets(userId);
      
      // Group assets by type (Frontend might prefer this format)
      const groupedAssets = {
        images: [],
        text: [],
        other: []
      };
      
      userAssets.forEach(asset => {
        const safeFilePath = asset.filePath ? asset.filePath.replace(/\\/g, '/') : '';
        const assetWithUrl = {
          ...asset,
          assetUrl: safeFilePath ? `/assets/${safeFilePath}` : null
        };
  
        if (assetWithUrl.mimetype?.startsWith('image/')) {
          groupedAssets.images.push(assetWithUrl);
        } else if (assetWithUrl.mimetype === 'text/plain' || assetWithUrl.mimetype === 'application/json') {
          groupedAssets.text.push(assetWithUrl);
        } else {
          groupedAssets.other.push(assetWithUrl);
        }
      });
      
      res.status(200).json(groupedAssets);
      
    } catch (error) {
      console.error('Error getting grouped assets:', error);
      res.status(500).json({ error: 'Failed to retrieve assets', details: error.message });
    }
  });

  // Get contents for multiple assets
  // NOTE: This endpoint was previously /api/assets/embeddings but no longer deals with embeddings.
  router.post('/contents', async (req, res) => {
    try {
      const { assetIds } = req.body;
  
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return res.status(400).json({ error: 'Missing required assetIds array' });
      }
  
      // Load assets registry file to get asset info
      // TODO: Should AssetProcessor handle this lookup?
      const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
      let assets = [];
  
      try {
        const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
        assets = JSON.parse(assetsData);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({ error: 'No assets found' });
        }
        throw error;
      }
  
      // Filter by provided asset IDs
      const selectedAssets = assets.filter(asset => assetIds.includes(asset.id));
  
      if (selectedAssets.length === 0) {
        return res.status(404).json({ error: 'No matching assets found' });
      }
  
      // Extract content from the assets
      const contents = [];
      const assetFileContent = {};
  
      for (const asset of selectedAssets) {
        try {
          // TODO: Need robust path construction, possibly move to AssetProcessor
          const assetPath = path.join(__dirname, '../../data/assets', asset.filePath); 
          
          // For text files or JSON, read the content
          if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
            const content = await fs.readFile(assetPath, 'utf-8');
            contents.push(content);
            assetFileContent[asset.id] = content;
          }
          // For images, use a placeholder description
          else if (asset.mimetype.startsWith('image/')) {
            const placeholder = `[IMAGE: ${asset.filename}]`;
            contents.push(placeholder);
            assetFileContent[asset.id] = placeholder;
          }
          // For other file types
          else {
            const placeholder = `[DOCUMENT: ${asset.filename}]`;
            contents.push(placeholder);
            assetFileContent[asset.id] = placeholder;
          }
        } catch (error) {
          console.error(`Error reading file for asset ${asset.id} (${asset.filePath}):`, error);
          assetFileContent[asset.id] = `[Error reading content: ${error.code === 'ENOENT' ? 'File not found' : error.message}]`;
          // Continue with other assets if one fails
        }
      }
  
      // Return asset contents
      return res.status(200).json({
        success: true,
        assets: selectedAssets.map(asset => ({
          id: asset.id,
          filename: asset.filename,
          content: assetFileContent[asset.id] || '[Content not available]'
        })),
        count: selectedAssets.length
      });
    } catch (error) {
      console.error('Error fetching asset contents:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch asset contents' });
    }
  });

  // Get single asset by ID
  router.get('/:assetId', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      if (!assetId) {
        return res.status(400).json({ error: 'Missing required assetId parameter' });
      }
      
      // Fetch ALL assets and filter - Inefficient, but simple for now
      // TODO: AssetProcessor could have a getAssetById method
      const allAssets = await assetProcessor.getAllAssets(); 
      const asset = allAssets.find(a => a.id === assetId);
      
      if (asset) {
        res.status(200).json(asset);
      } else {
        res.status(404).json({ error: 'Asset not found' });
      }
    } catch (error) {
      console.error('Error getting single asset:', error);
      res.status(500).json({ error: 'Failed to retrieve asset info', details: error.message });
    }
  });

  // Get asset content (serves the actual file)
  router.get('/:assetId/content', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      if (!assetId) {
        return res.status(400).json({ error: 'Missing required assetId parameter' });
      }
      
      // Load assets registry file to get asset info
      // TODO: Should AssetProcessor handle this lookup?
      const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
      let assets = [];
      
      try {
        const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
        assets = JSON.parse(assetsData);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({ error: 'No assets found' });
        }
        console.error('Error reading assets registry file:', error);
        throw error;
      }
      
      // Find the specific asset
      const asset = assets.find(asset => asset.id === assetId);
      
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Get the file path
      // TODO: Need robust path construction, possibly move to AssetProcessor
      const assetPath = path.join(__dirname, '../../data/assets', asset.filePath);
      console.log(`Attempting to serve asset: ${assetId}, Path: ${assetPath}`);
      
      // Check if file exists before attempting to serve it
      try {
        await fs.access(assetPath);
      } catch (error) {
        console.error(`File not found at path: ${assetPath}`, error);
        return res.status(404).json({ error: `File not found: ${assetPath}` });
      }
      
      // Serve the file based on its type
      if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
        // For text files, send the content
        try {
          const content = await fs.readFile(assetPath, 'utf-8');
          res.setHeader('Content-Type', asset.mimetype);
          return res.send(content);
        } catch (error) {
          console.error(`Error reading text file: ${assetPath}`, error);
          return res.status(500).json({ error: `Error reading file: ${error.message}` });
        }
      } 
      else if (asset.mimetype.startsWith('image/')) {
        // For images, stream the file
        try {
          console.log(`Serving image file: ${assetPath} with mimetype: ${asset.mimetype}`);
          res.setHeader('Content-Type', asset.mimetype);
          return res.sendFile(assetPath, (err) => {
            if (err) {
              console.error(`Error sending file: ${assetPath}`, err);
              // Avoid sending status 500 if headers already sent
              if (!res.headersSent) {
                res.status(500).send({ error: `Error sending file: ${err.message}` });
              }
            }
          });
        } catch (error) {
          console.error(`Error serving image file: ${assetPath}`, error);
           if (!res.headersSent) {
             return res.status(500).json({ error: `Error serving image: ${error.message}` });
           }
        }
      }
      else {
        // For other types
        return res.status(400).json({ error: `Unsupported file type: ${asset.mimetype}` });
      }
    } catch (error) {
      console.error('Error getting asset content:', error);
       if (!res.headersSent) {
         res.status(500).json({ error: error.message });
       }
    }
  });
  
  // Get preview content for a specific asset (handles redirects and complex path finding)
  // NOTE: This logic is very complex and might need simplification after migration/cleanup
  router.get('/:assetId/preview', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      if (!assetId) {
        return res.status(400).json({ error: 'Missing required assetId parameter' });
      }
      
      // Load assets registry file to get asset info
      // TODO: AssetProcessor should handle this lookup?
      const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
      let assets = [];
      
      try {
        const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
        assets = JSON.parse(assetsData);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({ error: 'No assets found' });
        }
        console.error('Error reading assets registry file:', error);
        throw error;
      }
      
      // Find the specific asset
      const asset = assets.find(asset => asset.id === assetId);
      
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // If it's a text file or JSON, send the contents
      if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
        try {
          // TODO: Simplify this path finding logic - use AssetProcessor?
          let possiblePaths = [];
          const assetsBaseDir = path.join(__dirname, '../../data/assets');
          
          // Try original path first
          if (asset.filePath) {
            possiblePaths.push(path.join(assetsBaseDir, asset.filePath));
          }
          // Try with the asset ID directly in case filePath is incorrect
          possiblePaths.push(path.join(assetsBaseDir, `${assetId}_${asset.filename}`));
          // Try with personId subfolder
          if (asset.metadata && asset.metadata.personId) {
            possiblePaths.push(path.join(assetsBaseDir, asset.metadata.personId, `${assetId}_${asset.filename}`));
            possiblePaths.push(path.join(assetsBaseDir, asset.metadata.personId, `${asset.filename}_${assetId}.txt`));
          }
          
          // Try each path until one works
          let content = null;
          let foundPath = null;
          for (const possiblePath of possiblePaths) {
            try {
              // console.log(`Trying to read text file from: ${possiblePath}`);
              content = await fs.readFile(possiblePath, 'utf-8');
              if (content !== null) {
                  foundPath = possiblePath;
                  break; // If successful, stop trying
              }
            } catch (err) {
              // Continue to next path
              // console.log(`Path failed: ${possiblePath}`);
            }
          }
          
          if (!content) {
             console.warn(`Text file for asset ${assetId} not found after trying multiple paths.`);
            return res.status(404).json({ error: 'Text file not found after trying multiple paths' });
          }
          
          console.log(`Found text content for ${assetId} at ${foundPath}`);
          return res.status(200).json({ 
            id: asset.id,
            content,
            mimetype: asset.mimetype,
            filename: asset.filename,
            metadata: asset.metadata,
            preview: true
          });
        } catch (error) {
          console.error(`Error reading text file for preview:`, error);
          return res.status(500).json({ error: `Error reading file: ${error.message}` });
        }
      }
      // If it's an image, return the URL path to the image (with complex fallback logic)
      else if (asset.mimetype.startsWith('image/')) {
        try {
           // TODO: Drastically simplify this after migration/cleanup. Rely on asset.filePath.
          let possiblePaths = [];
          let foundPathInfo = null;
          const assetsBaseDir = path.join(__dirname, '../../data/assets');
          
          // Function to check path and return info if exists
          const checkPath = async (fsPath) => {
             try {
                 await fs.access(fsPath);
                 const relativePath = path.relative(assetsBaseDir, fsPath).replace(/\\/g, '/');
                 return { fsPath, urlPath: `/assets/${relativePath}` };
             } catch {
                 return null;
             }
          };

          // 1. Try the stored filePath
          if (asset.filePath) {
             foundPathInfo = await checkPath(path.join(assetsBaseDir, asset.filePath));
             if (foundPathInfo) console.log(`Preview: Found image via asset.filePath: ${foundPathInfo.fsPath}`);
          }
          
          // 2. Try common variations if not found yet
          if (!foundPathInfo) {
             const variations = [
                 path.join(assetsBaseDir, `${assetId}_${asset.filename}`), // ID_filename in root
             ];
             if (asset.metadata && asset.metadata.personId) {
                 const personDir = path.join(assetsBaseDir, asset.metadata.personId);
                 variations.push(
                     path.join(personDir, `${assetId}_${asset.filename}`), // ID_filename in person dir
                     path.join(personDir, `${asset.filename.split('.')[0]}_${assetId}.png`) // filename_ID.png in person dir
                 );
                 // image-X_assetId.png format
                 const imageNumMatch = asset.filename.match(/image-(\d+)/);
                 if (imageNumMatch) {
                     variations.push(path.join(personDir, `image-${imageNumMatch[1]}_${assetId}.png`));
                 }
             }
             for (const p of variations) {
                 foundPathInfo = await checkPath(p);
                 if (foundPathInfo) {
                     console.log(`Preview: Found image via variation: ${foundPathInfo.fsPath}`);
                     break;
                 }
             }
          }

          // 3. Recursive search as last resort (limited depth)
          if (!foundPathInfo) {
             console.warn(`Preview: Image ${assetId} (${asset.filename}) not found via standard paths, starting recursive search...`);
             const findInDirectory = async (dir, namePattern, maxDepth = 1, currentDepth = 0) => {
                if (currentDepth > maxDepth) return null;
                try {
                   const entries = await fs.readdir(dir, { withFileTypes: true });
                   for (const entry of entries) {
                      const fullPath = path.join(dir, entry.name);
                      if (entry.isFile() && entry.name.includes(namePattern)) {
                         return await checkPath(fullPath);
                      } else if (entry.isDirectory()) {
                         const result = await findInDirectory(fullPath, namePattern, maxDepth, currentDepth + 1);
                         if (result) return result;
                      }
                   }
                   return null;
                } catch { return null; }
             };
             foundPathInfo = await findInDirectory(assetsBaseDir, assetId, 1);
             if (foundPathInfo) console.log(`Preview: Found image via recursive search: ${foundPathInfo.fsPath}`);
          }

          if (!foundPathInfo) {
             console.error(`Preview: Image file for asset ${assetId} (${asset.filename}) not found after all checks.`);
            return res.status(404).json({ 
              error: 'Image file not found after trying multiple paths and search', 
              assetId, 
              filename: asset.filename,
            });
          }
          
          // Check for redirect loops
          const redirectAttempt = parseInt(req.query.redirectAttempt) || 0;
          if (redirectAttempt >= 3) {
            console.log(`Maximum redirect attempts (${redirectAttempt}) reached for asset ${assetId}`);
            return res.status(404).json({ error: 'Maximum redirect attempts reached', assetId });
          }
          
          console.log(`Preview: Redirecting to image URL: ${foundPathInfo.urlPath} (attempt ${redirectAttempt + 1})`);
          return res.redirect(`${foundPathInfo.urlPath}?redirectAttempt=${redirectAttempt + 1}`); 

        } catch (error) {
          console.error(`Error handling image preview:`, error);
          return res.status(500).json({ error: `Error handling image: ${error.message}` });
        }
      }
      // For other file types, just return metadata
      else {
        return res.status(200).json({ 
          id: asset.id,
          mimetype: asset.mimetype,
          filename: asset.filename,
          metadata: asset.metadata,
          content: `File preview not available for type: ${asset.mimetype}`,
          preview: false
        });
      }
    } catch (error) {
      console.error('Error getting asset preview:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate detailed description of an image using Claude (and save as new asset)
  router.post('/:assetId/describe', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      if (!assetId) {
        return res.status(400).json({ error: 'Missing required assetId parameter' });
      }
      
      // TODO: AssetProcessor should handle asset lookup and path finding
      const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
      let assets = [];
      try {
        const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
        assets = JSON.parse(assetsData);
      } catch (error) {
        if (error.code === 'ENOENT') return res.status(404).json({ error: 'No assets found' });
        throw error;
      }
      const asset = assets.find(asset => asset.id === assetId);
      
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      if (!asset.mimetype || !asset.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Asset is not an image' });
      }
      
      // TODO: AssetProcessor should provide the definitive path
      const imagePath = path.join(__dirname, '../../data/assets', asset.filePath); 
      
      // Check if image exists before calling Claude
       try {
         await fs.access(imagePath);
       } catch (err) {
         console.error(`Describe Error: Image file not found at ${imagePath} for asset ${assetId}`);
         return res.status(404).json({ error: `Image file not found at path: ${asset.filePath}` });
       }

      // Generate description using Claude
      console.log(`Generating description for image asset: ${assetId}`);
      const descriptionText = await claudeAPI.generateImageDescription(imagePath);
      console.log(`Generated description text (length: ${descriptionText.length})`);
      
      // Create a new text asset for the description
      const descriptionAssetName = `${path.basename(asset.filename, path.extname(asset.filename))}-desc.txt`;
      const descriptionBuffer = Buffer.from(descriptionText, 'utf-8');
      
      // Create a file-like object for AssetProcessor
      const descriptionFile = {
        name: descriptionAssetName,
        data: descriptionBuffer,
        size: descriptionBuffer.length,
        mimetype: 'text/plain',
        // provide mv function stub, AssetProcessor handles the real move
        mv: async (dest) => { console.log('(mv stub for description asset)'); return true; } 
      };
      
      // Create metadata for the new text asset
      const descriptionMetadata = {
        // Use sanitized personId if available, otherwise fallback
        personId: asset.metadata?.personId || 'unknown', 
        sourceAssetId: assetId, // Link back to the original image
        context: 'image-description', 
        title: `Description for ${asset.filename}`
      };
      
      console.log(`Processing description as new text asset: ${descriptionAssetName}`);
      const newTextAsset = await assetProcessor.processAsset(descriptionFile, descriptionMetadata);
      console.log(`Created new text asset for description: ${newTextAsset.id}`);
      
      // Return the info about the *new* text asset created
      return res.status(201).json({ 
        message: 'Description generated and saved as a new text asset.',
        originalAssetId: assetId,
        descriptionAssetId: newTextAsset.id,
        description: descriptionText, // Include the description text in the response
        newAsset: newTextAsset // Include the full new asset info
      });
      
    } catch (error) {
      console.error('Error generating image description and creating asset:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate image description endpoint (only generates, doesn't save as asset)
  // NOTE: Consider consolidating with the POST /:assetId/describe endpoint
  router.post('/:assetId/describe-image', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      // TODO: AssetProcessor should handle asset lookup and path finding
      const assetsRegistryFile = path.join(__dirname, '../../data/assets.json');
      let assets = [];
      try {
        const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
        assets = JSON.parse(assetsData);
      } catch (error) {
        if (error.code === 'ENOENT') return res.status(404).json({ error: 'Assets registry file not found' });
        throw error;
      }
      
      const asset = assets.find(asset => asset.id === assetId);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      if (!asset.mimetype || !asset.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Asset is not an image' });
      }
      
      // TODO: AssetProcessor should provide the definitive path
      const assetPath = path.join(__dirname, '../../data/assets', asset.filePath);

      // Check if image exists before calling Claude
       try {
         await fs.access(assetPath);
       } catch (err) {
         console.error(`Describe-Image Error: Image file not found at ${assetPath} for asset ${assetId}`);
         return res.status(404).json({ error: `Image file not found at path: ${asset.filePath}` });
       }
      
      // Generate description using Claude
      const description = await claudeAPI.generateImageDescription(assetPath, {
        system: "Generate a detailed, vivid description of this image, focusing on what's visually present. Capture colors, objects, people, text, composition, and overall impression. Be specific and descriptive, writing 2-3 paragraphs of rich imagery.",
        temperature: 0.5
      });
      
      return res.status(200).json({
        assetId,
        description,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating image description:', error);
      res.status(500).json({ error: error.message || 'An error occurred generating the image description' });
    }
  });

  // Delete a specific asset
  router.delete('/:assetId', async (req, res) => {
    try {
      const { assetId } = req.params;
      
      if (!assetId) {
        return res.status(400).json({ error: 'Missing required assetId parameter' });
      }
      
      console.log(`Attempting to delete asset: ${assetId}`);
      // Use AssetProcessor to handle deletion (updates registry and deletes file)
      const deleted = await assetProcessor.deleteAsset(assetId); 
      
      if (deleted) {
        console.log(`Successfully deleted asset ${assetId}`);
        return res.status(200).json({ success: true, message: 'Asset deleted successfully.' });
      } else {
        // AssetProcessor handles logging reasons for failure (e.g., not found)
        console.log(`Failed to delete asset ${assetId} (likely not found or file system error).`);
        return res.status(404).json({ success: false, error: 'Asset not found or could not be deleted.' });
      }
    } catch (error) {
      console.error(`Error deleting asset ${req.params.assetId}:`, error);
      res.status(500).json({ success: false, error: 'An unexpected error occurred during deletion.' });
    }
  });

  return router;
}

module.exports = createAssetRouter; 