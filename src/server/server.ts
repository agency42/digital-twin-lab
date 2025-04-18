import dotenv from 'dotenv';
dotenv.config(); // Load .env file early

import express, { Express, Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AddressInfo } from 'net';

// Import database utilities
import { initializeDatabase, closeDatabase } from './lib/database';

// Import services
import AssetProcessor from './services/assetProcessor';
import AbstractionApproach from './services/abstractionApproach';
import ClaudeAPI from './api/claude';

// Import route handler creators
import createAssetRouter from './routes/assetRoutes';
import createPromptRouter from './routes/promptRoutes';
import createUserRouter from './routes/userRoutes';
import createOAuthRouter from './routes/oauthRoutes';
import createAssessmentRouter from './routes/assessmentRoutes';
import createChatRouter from './routes/chatRoutes';
import createScrapeRouter from './routes/scrapeRoutes';
import createUploadRouter from './routes/uploadRoutes';
import createComponentRouter from './routes/componentRoutes';

// Initialize the app
const app: Express = express();
const DEFAULT_PORT: number = parseInt(process.env.PORT || '3000', 10);

// Initialize services
const assetProcessor = new AssetProcessor();
const abstractionApproach = new AbstractionApproach();
const claudeAPI = new ClaudeAPI();

// Middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', '*'],
                connectSrc: ["'self'", 'api.anthropic.com', '*.linkedin.com'],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
    })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
        useTempFiles: true,
        tempFileDir: '/tmp/',
    })
);
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
    if (
        !req.path.startsWith('/css/') &&
        !req.path.startsWith('/js/') &&
        !req.path.startsWith('/img/') &&
        !req.path.startsWith('/assets/')
    ) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static assets from the data/assets directory
const assetsDataDir = path.join(__dirname, '../../data/assets');
app.use(
    '/assets',
    express.static(assetsDataDir, {
        fallthrough: true,
        setHeaders: (res, _) => {
            // Enhance cache control for better performance
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        },
    })
);

// Final 404 handler specifically for /assets
app.use('/assets', (_, res: Response, __) => {
    res.status(404).send('Asset Not Found');
});

// Health check
app.get('/api/health', (_, res: Response) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Mount API endpoints with proper dependencies
app.use('/api/users', createUserRouter());
app.use('/api/assets', createAssetRouter(assetProcessor, claudeAPI));
app.use('/api/prompts', createPromptRouter(abstractionApproach));
app.use('/api/oauth', createOAuthRouter());
app.use('/api/assessment', createAssessmentRouter());
app.use('/api/chat', createChatRouter());
app.use('/api/scrape', createScrapeRouter());
app.use('/api/upload', createUploadRouter());
app.use('/api/components', createComponentRouter());

// Route aliases for backward compatibility
app.get(
    '/api/users/:userId/character-cards',
    async (req: Request, res: Response): Promise<void> => {
        try {
            console.log(
                `Redirecting /api/users/${req.params.userId}/character-cards to /api/components/${req.params.userId}/character-cards`
            );
            // Forward the request to the component router
            const response = await fetch(
                `http://localhost:${req.socket.localPort}/api/components/${req.params.userId}/character-cards`
            );
            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error('Error in character-cards alias route:', error);
            res.status(500).json({ error: 'Internal server error', details: String(error) });
        }
    }
);

// Direct LinkedIn authentication endpoint - legacy support
app.get('/api/auth/linkedin', (req: Request, res: Response): void => {
    try {
        const userId = req.query.user_id as string | undefined;
        if (!userId) {
            res.status(400).json({ error: 'Missing required query parameter: user_id' });
            return;
        }
        res.redirect(`/api/oauth/linkedin/authorize?userId=${encodeURIComponent(userId)}`);
        return;
    } catch (error: any) {
        console.error('Error redirecting to LinkedIn OAuth:', error);
        res.status(500).json({
            error: `Failed to initiate LinkedIn authorization: ${error.message}`,
        });
        return;
    }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`Error processing request ${req.method} ${req.path}:`, err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: err.message || 'An unexpected error occurred',
        path: req.path,
        method: req.method,
    });
});

// Function to try a port and fallback to next if in use
const tryPort = (port: number, maxAttempts: number = 10): Promise<number> => {
    return new Promise((resolve, reject) => {
        // Try the port
        const server = app
            .listen(port)
            .on('listening', () => {
                const addressInfo = server.address() as AddressInfo;
                const usedPort = addressInfo.port;
                server.close(() => {
                    resolve(usedPort);
                });
            })
            .on('error', (err: any) => {
                if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
                    console.log(`Port ${port} is in use, trying ${port + 1}...`);
                    // Try next port
                    tryPort(port + 1, maxAttempts - 1)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(err);
                }
            });
    });
};

// Start the server asynchronously
async function startServer() {
    try {
        const dbConnection = await initializeDatabase();
        console.log('Database initialized successfully.');

        // Store database connection in app.locals for route handlers to access
        app.locals.db = dbConnection;

        // Find an available port
        const port = await tryPort(DEFAULT_PORT);

        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal: string) => {
            console.log(`\nReceived ${signal}. Closing database connection...`);
            server.close(async () => {
                try {
                    await closeDatabase();
                    console.log('Database connection closed. Exiting process.');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during graceful shutdown:', error);
                    process.exit(1);
                }
            });

            // Force close after 10s
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down.');
                process.exit(1);
            }, 10000);
        };

        // Listen for termination signals
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Export the app instance for potential testing
export default app;
