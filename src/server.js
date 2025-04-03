require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;

// Import our service modules
const AssetProcessor = require('./services/assetProcessor');
const AbstractionApproach = require('./services/abstractionApproach');
const WebsiteScraper = require('./services/scrapers/websiteScraper');
const ClaudeAPI = require('./api/claude');
const UserDataService = require('./services/userDataService');

// Import route handlers
const createAssetRouter = require('./routes/assetRoutes');
const createPersonalityRouter = require('./routes/personalityRoutes');
const createUserRouter = require('./routes/userRoutes');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Create minimal required directories
const ensureDirectories = async () => {
  const dirs = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../data/assets'),
    path.join(__dirname, '../data/personas')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Directory created or already exists: ${dir}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(morgan('dev')); // Logging

// Add catch-all for removed experimental API endpoints to prevent 404 errors
// IMPORTANT: Place this before other middleware to catch these requests early
app.use('/api/experiment/*', (req, res) => {
  console.log(`[Deprecated API] Request to experimental endpoint: ${req.path}`);
  res.status(200).json({ message: 'This experimental endpoint has been removed.' });
});

app.use('/api/prompt', (req, res) => {
  console.log(`[Deprecated API] Request to prompt endpoint: ${req.path}`);
  res.status(200).json({ message: 'This endpoint has been removed.' });
});

// Add detailed request logging middleware
app.use((req, res, next) => {
  // Log all requests to non-static files
  if (!req.path.startsWith('/css/') && !req.path.startsWith('/js/') && !req.path.startsWith('/img/') && !req.path.startsWith('/assets/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static assets from the data/assets directory with proper MIME types
// NOTE: This complex middleware attempts to find assets in various legacy/current locations.
// It should be simplified *after* migration is complete and paths are consistent.
app.use('/assets', (req, res, next) => {
  const requestPath = req.path.replace(/^\/+/, ''); // Remove leading slashes
    const assetsDir = path.join(__dirname, '../data/assets');
  const fullAssetPath = path.join(assetsDir, requestPath);
  
  // Log asset requests only once per request cycle
  if (!req._assetLogged) {
      console.log(`[Asset Request] Path: ${requestPath}`);
      req._assetLogged = true; // Mark as logged
  }

  // Check if the file exists at the requested path
  fs.access(fullAssetPath)
        .then(() => {
          // File exists, let express.static handle it
          // console.log(`[Asset Found] Serving directly: ${fullAssetPath}`);
          next(); 
        })
        .catch(() => {
          // File doesn't exist at the requested path, try finding it
          // This indicates a potential path mismatch or legacy path request
          console.warn(`[Asset Warning] File not found at direct path: ${fullAssetPath}. Attempting lookup...`);

          // Extract possible asset ID from the request path (UUID format)
          const idMatch = requestPath.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          const requestedId = idMatch ? idMatch[0] : null;

          if (requestedId) {
              // If an ID is found, try to look up the correct path in assets.json
              (async () => {
        try {
          const assetsRegistryFile = path.join(__dirname, '../data/assets.json');
          const assetsData = await fs.readFile(assetsRegistryFile, 'utf-8');
          const assets = JSON.parse(assetsData);
                      const assetInfo = assets.find(a => a.id === requestedId);

                      if (assetInfo && assetInfo.filePath) {
                          const correctRelativePath = assetInfo.filePath.replace(/\\/g, '/');
                          const correctUrl = `/assets/${correctRelativePath}`;
                          
                           // Prevent redirect loop if already at correct URL
                          if (req.originalUrl.split('?')[0] !== correctUrl) {
                               console.log(`[Asset Lookup] Found ID ${requestedId} in registry. Redirecting from ${req.originalUrl} to correct URL: ${correctUrl}`);
                              // Add redirect attempt counter to prevent loops
                              const redirectAttempt = parseInt(req.query.redirectAttempt) || 0;
                              if (redirectAttempt < 3) {
                                  return res.redirect(`${correctUrl}?redirectAttempt=${redirectAttempt + 1}`);
                              } else {
                                  console.error(`[Asset Error] Maximum redirect attempts reached for ${requestedId}.`);
                                  // Fall through to 404 if max redirects hit
                              }
                          } else {
                               // Already at the correct URL but file access failed? Serve 404.
                               console.error(`[Asset Error] Already at correct URL ${correctUrl} but file access failed.`);
                               // Fall through to 404
                          }
                      } else {
                          console.warn(`[Asset Lookup] ID ${requestedId} found in request, but not found or missing filePath in assets.json.`);
                           // Fall through to 404
          }
        } catch (err) {
                      console.error('[Asset Lookup] Error reading or parsing assets.json:', err);
                       // Fall through to 404
                  }
                  // If lookup/redirect fails or not applicable, let express.static handle the 404
        next();
              })();
      } else {
              // No asset ID found in path, let express.static handle the 404
              // console.log(`[Asset Not Found] No ID detected in path: ${requestPath}`);
        next();
      }
      });
}, express.static(path.join(__dirname, '../data/assets'), {
    fallthrough: true, // Important: allows subsequent middleware if file not found
    setHeaders: (res, filePath) => {
      // Set cache policy for assets
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      
      // // Optionally log when serving successfully via static middleware
      // res.on('finish', () => {
      //   if (res.statusCode === 200) {
      //     console.log(`[Asset Served] Successfully served: ${filePath}`);
      //   }
      // });
    }
}));

// Final 404 handler specifically for /assets if static middleware fails
app.use('/assets', (req, res, next) => {
   console.error(`[Asset 404] Asset not found after all checks: ${req.path}`);
   res.status(404).send('Asset Not Found');
});

// Initialize services
const assetProcessor = new AssetProcessor();
const abstractionApproach = new AbstractionApproach();
const websiteScraper = new WebsiteScraper();
const claudeAPI = new ClaudeAPI();
const userDataService = new UserDataService();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Mount user routes
app.use('/api/users', createUserRouter());

// Mount asset routes
app.use('/api/assets', createAssetRouter(assetProcessor, claudeAPI));

// Mount personality routes
app.use('/api/personality', createPersonalityRouter(abstractionApproach));

// --- Standalone Routes (To be potentially moved) ---

// File upload endpoint
app.post('/api/upload', async (req, res) => {
  try {
    // ** Get userId from request body (frontend needs to send this) **
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing required field in body: userId' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }
    
    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    // Pass userId in metadata to AssetProcessor
    const metadata = { ...req.body, userId: userId }; 
    delete metadata.file; // Remove file field if it exists in body

    const results = [];
    console.log(`Processing upload of ${files.length} file(s) for user ${userId}`);
    
    for (const file of files) {
        try {
            const result = await assetProcessor.processAsset(file, metadata);
            results.push(result);
        } catch(fileError) {
             console.error(`Error processing uploaded file ${file.name} for user ${userId}:`, fileError);
             results.push({ filename: file.name, error: fileError.message || 'Failed to process file' });
        }
    }

    const successCount = results.filter(r => r && r.id).length;
    const failureCount = results.length - successCount;
    const overallStatus = failureCount > 0 ? (successCount > 0 ? 207 : 500) : 200;
    const message = failureCount > 0 
        ? `Processed ${successCount} file(s) successfully, ${failureCount} failed.`
        : `Successfully processed ${successCount} file(s).`;

    res.status(overallStatus).json({ message, results });

  } catch (error) {
    console.error('Error in upload endpoint:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during upload.' });
  }
});

// Website scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    // ** Get userId from request body **
    const { url, userId } = req.body; 
    
    if (!url || !userId) {
      return res.status(400).json({ error: 'Missing required fields: url and userId' });
    }
    
    try { new URL(url.startsWith('http') ? url : 'http://' + url); } 
    catch(_) { return res.status(400).json({ error: 'Invalid URL format provided.' }); }

    console.log(`Received scrape request for ${url}, user: ${userId}. Starting background process.`);
    res.status(202).json({ message: 'Scraping started...', url, userId });
    
    setImmediate(async () => {
        try {
          // Pass userId to scrapeWebsite
          const result = await websiteScraper.scrapeWebsite(url, userId); 
          console.log(`Background scrape process completed successfully for ${url}, user ${userId}:`, result);
        } catch (error) {
          console.error(`Error during background website scraping for ${url}, user ${userId}:`, error.stack);
        }
    });

  } catch (error) {
    console.error('Error in /api/scrape endpoint setup:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Failed to initiate scraping process.' });
    }
  }
});

// Get scraping status
app.get('/api/scrape/status', async (req, res) => {
  try {
    const statusFile = path.join(__dirname, '../data/scrape_status.json');
    
    try {
      // Try to read the status file
      const statusData = await fs.readFile(statusFile, 'utf-8');
      const status = JSON.parse(statusData);
      
      // Calculate duration if in progress
      if (status.inProgress) {
        const currentTime = Date.now();
        const duration = Math.floor((currentTime - status.startTime) / 1000);
        status.currentDurationSec = duration;
        status.currentDuration = `${duration} seconds`;
      }
      
      res.status(200).json(status); // Send the full status object

    } catch (error) {
      // If status file doesn't exist or can't be read, return idle status
      if (error.code === 'ENOENT') {
        res.status(200).json({ 
          status: 'idle',
          message: 'No scraping process currently active or recently completed.'
          // Optional: Add default values for other fields if needed by frontend
          // pagesVisited: 0,
          // imagesFound: 0,
          // textAssetsCreated: 0 
        });
      } else {
         console.error('Error reading scrape status file:', error);
         // Don't throw, return error status to client
         res.status(500).json({ error: 'Failed to read scraping status file.', details: error.message });
      }
    }
  } catch (error) {
    console.error('Error getting scraping status:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred while fetching scrape status.' });
  }
});

// Chat endpoint (Refactored)
app.post('/api/chat', async (req, res) => {
  try {
    // ** Get userId, systemPrompt, userMessage, temperature from request body **
    const { userId, systemPrompt, userMessage, temperature = 0.7 } = req.body; // Default temp if not provided

    if (!userId) {
         return res.status(400).json({ error: 'Missing required field: userId' });
    }
    // System prompt is now required from the client
    if (!systemPrompt) { 
        return res.status(400).json({ error: 'Missing required field: systemPrompt' });
    }
    if (!userMessage) {
      return res.status(400).json({ error: 'Missing required field: userMessage' });
    }

    // Load user data primarily to get chat history and save updates
    const userData = await userDataService.getUserData(userId);
    if (!userData) {
        return res.status(404).json({ error: `User '${userId}' not found.` });
    }
    
    // --- System Prompt is now provided by the client --- 
    // The complex construction logic below is REMOVED
    /*
    let finalSystemPrompt = "You are the digital twin. Use the following context to inform your responses.\n";
    finalSystemPrompt += "====================\nPERSONALITY PROFILE:\n====================\n";
    const profileJson = userData.generation?.lastGeneratedProfile?.json;
    finalSystemPrompt += profileJson ? JSON.stringify(profileJson, null, 2) : "(Not Generated)";
    finalSystemPrompt += "\n\n";

    const lore = userData.chatContext?.lore;
    if (lore) {
        finalSystemPrompt += "====================\nLORE / BACKGROUND:\n====================\n";
        finalSystemPrompt += `${lore}\n\n`; 
    }
    const params = userData.chatContext?.simulationParams;
    if (params) {
        finalSystemPrompt += "========================\nSIMULATION PARAMETERS:\n========================\n";
        finalSystemPrompt += `${params}\n\n`; 
    }
    finalSystemPrompt += "====================\nINSTRUCTIONS:\n====================\n";
    finalSystemPrompt += "Respond to the user\'s message based *only* on the Personality Profile, Lore, and Simulation Parameters provided above. Maintain the persona consistently.";
    */
    // --- End System Prompt Construction ---

    // Prepare messages including history
    // For assessment, the client might choose to send only the user message without history
    const messageHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : []; // Ensure it's an array before spreading
    const messagesToSend = [
        ...messageHistory, // Include past messages
        { role: 'user', content: userMessage }
    ];
    
    // Keep message history length manageable (apply before sending to API)
    const maxApiHistory = 40; // Limit context sent to API (adjust as needed)
    if (messagesToSend.length > maxApiHistory) {
        messagesToSend.splice(0, messagesToSend.length - maxApiHistory);
    }

    console.log(`Chat request for user ${userId}. System prompt length: ${systemPrompt.length}. Temperature: ${temperature}. History length: ${messageHistory.length}`);

    // Call Claude API with provided system prompt, history, and temperature
    const responseText = await claudeAPI.generateCompletion(messagesToSend, { 
        system: systemPrompt,
        temperature: parseFloat(temperature) // Ensure temperature is a number
    });

    // ** Save chat history (append user message and response) **
    const updatedHistory = messageHistory.concat([ // Append to original history
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseText }
    ]);
    // Keep stored history length manageable (apply after getting response)
    const maxStoredHistory = 50; 
    if (updatedHistory.length > maxStoredHistory) {
        updatedHistory.splice(0, updatedHistory.length - maxStoredHistory);
    }
    await userDataService.updateUserData(userId, { chatHistory: updatedHistory });

    res.status(200).json({ response: responseText });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: error.message || 'An error occurred during chat generation.' });
  }
});

// Start the server
app.listen(PORT, async () => {
  await ensureDirectories();
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // Export the app for testing or other uses