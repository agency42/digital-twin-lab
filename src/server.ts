import dotenv from 'dotenv';
dotenv.config(); // Load .env file early

import express, { Express, Request, Response, NextFunction } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs/promises';
import cookieParser from 'cookie-parser';

// Import database utilities (now TS)
import { initializeDatabase, closeDatabase } from './lib/database';
import { asyncHandler } from './lib/asyncHandler';

// Import our service modules (now TS)
import AssetProcessor from './services/assetProcessor';
import AbstractionApproach from './services/abstractionApproach';
import WebsiteScraper from './services/scrapers/websiteScraper';
import ClaudeAPI from './api/claude';
import userDataService from './services/userDataService'; // Default export

// Import route handler creators (now TS)
import createAssetRouter from './routes/assetRoutes';
import createPersonalityRouter from './routes/personalityRoutes';
import createUserRouter from './routes/userRoutes';
import createOAuthRouter from './routes/oauthRoutes';
import createAssessmentRouter from './routes/assessmentRoutes';

// Initialize the app
const app: Express = express(); // Type the app instance
const PORT: string | number = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(morgan('dev'));

// Add catch-all for removed experimental API endpoints
app.use('/api/experiment/*', (req: Request, res: Response) => {
  console.log(`[Deprecated API] Request to experimental endpoint: ${req.path}`);
  res.status(200).json({ message: 'This experimental endpoint has been removed.' });
});

app.use('/api/prompt', (req: Request, res: Response) => {
  console.log(`[Deprecated API] Request to prompt endpoint: ${req.path}`);
  res.status(200).json({ message: 'This endpoint has been removed.' });
});

// Add detailed request logging middleware
app.use((req: Request, _: Response, next: NextFunction) => {
  if (!req.path.startsWith('/css/') && !req.path.startsWith('/js/') && !req.path.startsWith('/img/') && !req.path.startsWith('/assets/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Serve static files from public directory
// __dirname will be ./dist. ./public was copied to ./dist/public.
app.use(express.static(path.join(__dirname, 'public'))); // Serve from dist/public directory

// Serve static assets from the data/assets directory
// __dirname is ./dist. Target is ./data/assets (sibling to ./dist)
const assetsDataDir = path.join(__dirname, '../data/assets'); // Path should resolve correctly
app.use('/assets', express.static(assetsDataDir, {
    fallthrough: true, 
    setHeaders: (res, /* filePath */ _) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
}));

// Final 404 handler specifically for /assets
app.use('/assets', (/* req: Request */ _, res: Response, /* next: NextFunction */ __) => {
   res.status(404).send('Asset Not Found');
});

// Initialize services
const assetProcessor = new AssetProcessor();
const abstractionApproach = new AbstractionApproach();
const websiteScraper = new WebsiteScraper();
const claudeAPI = new ClaudeAPI();
// userDataService is imported directly as an instance

// API Routes

// Health check
app.get('/api/health', (/* req: Request */ _, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Mount API endpoints
// First, register specific asset content/preview routes
app.get('/api/assets/:assetId/content', asyncHandler(async (req: Request, res: Response) => {
    const { assetId } = req.params;
    if (!assetId) {
        res.status(400).json({ error: 'Asset ID parameter is required' });
        return;
    }
    
    try {
        const asset = await assetProcessor.getAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        
        // For text assets, read the file and return its content
        if (asset.type === 'text') {
            const assetsDir = path.join(__dirname, '../data/assets');
            const filePath = path.join(assetsDir, asset.filepath);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                res.status(200).send(content);
            } catch (error: any) {
                console.error(`Error reading asset content for ${assetId}:`, error);
                res.status(500).json({ error: `Failed to read asset content: ${error.message}` });
            }
        } else {
            // For non-text assets, return a 404 or redirect to the asset URL
            res.status(404).json({ error: 'Content not available for this asset type' });
        }
    } catch (error: any) {
        console.error(`Error retrieving asset content for ${assetId}:`, error);
        res.status(500).json({ error: `Failed to retrieve asset: ${error.message}` });
    }
}));

app.get('/api/assets/:assetId/preview', asyncHandler(async (req: Request, res: Response) => {
    const { assetId } = req.params;
    if (!assetId) {
        res.status(400).json({ error: 'Asset ID parameter is required' });
        return;
    }
    
    try {
        const asset = await assetProcessor.getAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        
        // For text assets, get a short preview
        if (asset.type === 'text') {
            const assetsDir = path.join(__dirname, '../data/assets');
            const filePath = path.join(assetsDir, asset.filepath);
            try {
                const content = await fs.readFile(filePath, 'utf8');
                // Take first 200 characters as preview
                const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
                res.status(200).send(preview);
            } catch (error: any) {
                console.error(`Error reading asset preview for ${assetId}:`, error);
                res.status(500).json({ error: `Failed to read asset preview: ${error.message}` });
            }
        } else {
            // For non-text assets, return a 404 or redirect to the asset URL
            res.status(404).json({ error: 'Preview not available for this asset type' });
        }
    } catch (error: any) {
        console.error(`Error retrieving asset preview for ${assetId}:`, error);
        res.status(500).json({ error: `Failed to retrieve asset: ${error.message}` });
    }
}));

// Now mount the API routes
app.use('/api/users', createUserRouter());
app.use('/api/assets', createAssetRouter(assetProcessor, claudeAPI));
app.use('/api/personality', createPersonalityRouter(abstractionApproach));
app.use('/api/oauth', createOAuthRouter());
app.use('/api/assessment', createAssessmentRouter());

// Direct LinkedIn authentication endpoint
app.get('/api/auth/linkedin', (req: Request, res: Response): void => {
  try {
    const userId = req.query.user_id as string | undefined;
    if (!userId) {
       res.status(400).json({ error: 'Missing required query parameter: user_id' });
       return; // Explicit return
    }
     res.redirect(`/api/oauth/linkedin/authorize?userId=${encodeURIComponent(userId)}`);
     return; // Explicit return
  } catch (error: any) {
    console.error('Error redirecting to LinkedIn OAuth:', error);
     res.status(500).json({ error: `Failed to initiate LinkedIn authorization: ${error.message}` });
     return; // Explicit return
  }
});

// --- Standalone Routes ---

// File upload endpoint
app.post('/api/upload', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
        throw new Error('Missing required field in body: userId');
    }

    if (!req.files || !req.files.file) {
        throw new Error('No files uploaded under the key \'file\'.');
    }

    const filesToProcess: UploadedFile[] = Array.isArray(req.files.file)
        ? req.files.file
        : [req.files.file];

    const metadata = { ...req.body };
    delete metadata.file;

    const results: any[] = [];
    console.log(`Processing upload of ${filesToProcess.length} file(s) for user ${userId}`);

    for (const file of filesToProcess) {
        if (!file || typeof file !== 'object' || !('mv' in file)) {
             console.warn('Skipping an item that does not appear to be an uploaded file.');
             continue;
        }
        try {
            const result = await assetProcessor.processAsset(file, metadata);
            results.push(result);
        } catch (fileError: any) {
            console.error(`Error processing uploaded file ${file.name} for user ${userId}:`, fileError);
            results.push({ filename: file.name, error: fileError.message || 'Failed to process file' });
        }
    }

    const successCount = results.filter(r => r && r.asset_id).length;
    const failureCount = results.length - successCount;
    const overallStatus = failureCount > 0 ? (successCount > 0 ? 207 : 500) : 200;
    const message = failureCount > 0
        ? `Processed ${successCount} file(s) successfully, ${failureCount} failed.`
        : `Successfully processed ${successCount} file(s).`;

    res.status(overallStatus).json({ message, results });
}));

// Website scraping endpoint
app.post('/api/scrape', (req: Request, res: Response, next: NextFunction): void => {
    try {
        const { url, userId } = req.body;
        if (!url || !userId) {
            res.status(400).json({ error: 'URL and userId are required' });
            return; // Return after sending response
        }

        console.log(`Received scrape request for ${url}, user: ${userId}. Starting background process.`);
        res.status(202).json({ message: 'Scraping started...', url, userId });

        setImmediate(async () => {
            try {
                const result = await websiteScraper.scrapeWebsite(url, userId);
                console.log(`Background scrape process finished successfully for ${url}, user ${userId}.`);
                
                // Create or update a file to store the most recent scrape result
                const resultFile = path.join(__dirname, '../data/scrape_result.json');
                await fs.writeFile(resultFile, JSON.stringify({
                    url,
                    userId,
                    timestamp: new Date().toISOString(),
                    textAssetsCreated: result.textAssetsCreated,
                    imagesDownloaded: result.imagesDownloaded,
                    totalAssetsCreated: result.textAssetsCreated + result.imagesDownloaded,
                    pagesVisited: result.pagesVisited
                }));
            } catch (error: any) {
                console.error(`Error during background website scraping for ${url}, user ${userId}:`, error.stack);
            }
        });

    } catch (error: any) {
        console.error('Error in /api/scrape endpoint setup:', error);
        if (!res.headersSent) {
            next(error); 
        }
    }
});

// Get scraping status
app.get('/api/scrape/status', asyncHandler(async (/* req: Request */ _, res: Response) => {
    const statusFile = path.join(__dirname, '../data/scrape_status.json');
    try {
        const statusData = await fs.readFile(statusFile, 'utf-8');
        const status = JSON.parse(statusData);
        
        // Calculate duration if timestamps exist
        if (typeof status.startTime === 'number' && typeof status.endTime === 'number') {
            status.durationSeconds = Math.round((status.endTime - status.startTime) / 1000);
        }
        
        // Include asset counts in the response
        if (status.status === 'completed') {
            // Try to read the result file to get more details
            try {
                const resultFile = path.join(__dirname, '../data/scrape_result.json');
                const resultData = await fs.readFile(resultFile, 'utf-8');
                const result = JSON.parse(resultData);
                status.assetsCreated = result.totalAssetsCreated || 0;
                status.textAssetsCreated = result.textAssetsCreated || 0;
                status.imagesDownloaded = result.imagesDownloaded || 0;
            } catch (resultError) {
                // If result file doesn't exist, use the counts from status
                status.assetsCreated = (status.textAssetsCreated || 0) + (status.imagesFound || 0);
            }
        }
        
        res.status(200).json(status);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(200).json({
                status: 'idle',
                message: 'No scraping process currently active or recently completed.'
            });
        } else {
            console.error('Error reading/parsing scrape status file:', error);
            throw new Error(`Failed to read or parse scraping status file: ${error.message}`);
        }
    }
}));

// Chat endpoint
app.post('/api/chat', asyncHandler(async (req: Request, res: Response) => {
    const { userId, systemPrompt, userMessage, temperature = 0.7, stream = true } = req.body;

    if (!userId || !userMessage) {
        throw new Error('Missing required fields: userId and userMessage');
    }
    const tempValue = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (typeof tempValue !== 'number' || isNaN(tempValue) || tempValue < 0 || tempValue > 1) {
        throw new Error('Invalid temperature provided. Must be a number between 0 and 1');
    }

    console.log(`Chat request for user ${userId}. Stream: ${stream}`);

    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let fullResponseText = '';
        try {
            const streamResponse = await claudeAPI.generateCompletion(
                [{ role: 'user', content: userMessage }],
                { system: systemPrompt, temperature: tempValue, stream: true }
            );

            for await (const event of streamResponse as AsyncIterable<any>) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    const textChunk = event.delta.text;
                    fullResponseText += textChunk;
                    res.write(`data: ${JSON.stringify({ type: 'chunk', data: textChunk })}\n\n`);
                } else if (event.type === 'message_stop') {
                    res.write(`data: ${JSON.stringify({ type: 'complete', data: fullResponseText })}\n\n`);
                    res.end();
                    console.log('SSE Stream completed successfully.');
                    return;
                } else if (event.type === 'error') {
                     console.error('Error event received from Claude stream:', event.error);
                     throw new Error(event.error?.message || 'Received error event from stream');
                }
            }
            console.warn('SSE Stream ended without a proper message_stop event.');
             if (!res.writableEnded) {
                 res.end();
             }
        } catch (streamError: any) {
            console.error('Error during SSE stream processing:', streamError);
            if (!res.writableEnded) {
                try {
                    res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message || 'Stream error' })}\n\n`);
                } catch { /* Ignore */ }
                res.end();
            }
        }

    } else {
        const responseText = await claudeAPI.generateCompletion(
            [{ role: 'user', content: userMessage }],
            { system: systemPrompt, temperature: tempValue, stream: false }
        ) as string;

        console.log('Non-stream response generated.');
        res.status(200).json({ response: responseText });
    }
}));

// Add the endpoint expected by frontend
app.post('/api/chat/:userId/response', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const { message, history, systemPrompt, personaId } = req.body;
    
    if (!userId || !message) {
        throw new Error('Missing required fields: userId (in path) and message (in body)');
    }
    
    console.log(`Chat response request for user ${userId}`);
    
    try {
        // Use the Claude API directly
        const responseText = await claudeAPI.generateCompletion(
            history && history.length > 0 ? history : [{ role: 'user', content: message }],
            { system: systemPrompt, temperature: 0.7, stream: false }
        ) as string;
        
        // Return the response in the format expected by the frontend
        const updatedHistory = [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: responseText }];
        
        res.status(200).json({ 
            response: responseText,
            updatedHistory: updatedHistory.slice(-20), // Keep history size reasonable
            sessionId: personaId // Use personaId as sessionId for simplicity
        });
    } catch (error: any) {
        console.error(`Error generating chat response for ${userId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to generate chat response' });
    }
}));

// --- Deprecated Chat History Routes (Remove or Keep based on final decision) ---
/* 
app.post('/api/users/:userId/chat', async (req: Request, res: Response) => { ... });
app.get('/api/users/:userId/chat', async (req: Request, res: Response) => { ... });
*/

// --- Deprecated System Prompt Routes (Remove or Keep based on final decision) ---
/*
app.post('/api/users/:userId/system-prompts', async (req: Request, res: Response) => { ... });
app.get('/api/users/:userId/system-prompts', async (req: Request, res: Response) => { ... });
*/

// --- General Error Handler --- (req is unused, but needs type)
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
    console.error("[Unhandled Error]", err.stack); 
    if (res.headersSent) {
        return next(err);
    }
    let statusCode = 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : err.message || 'An unexpected error occurred';
    res.status(statusCode).json({ error: message });
});

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing database connection...`);
  try {
    await closeDatabase();
    console.log('Database connection closed. Exiting process.');
    process.exit(0);
  } catch (error: any) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start the server asynchronously
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully.');

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Listen for termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Export the app instance primarily for potential testing setups
export default app; 