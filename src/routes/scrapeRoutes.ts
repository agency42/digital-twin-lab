import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import path from 'path';
import fs from 'fs/promises';
import WebsiteScraper from '../services/scrapers/websiteScraper';

/**
 * Creates and configures a router for website scraping endpoints
 */
export default function createScrapeRouter() {
    const router = Router();
    const websiteScraper = new WebsiteScraper();
    
    // Website scraping endpoint
    router.post('/', (req: Request, res: Response, next: NextFunction): void => {
        try {
            const { url, userId } = req.body;
            if (!url || !userId) {
                res.status(400).json({ error: 'URL and userId are required' });
                return;
            }

            console.log(`Received scrape request for ${url}, user: ${userId}. Starting background process.`);
            res.status(202).json({ message: 'Scraping started...', url, userId });

            setImmediate(async () => {
                try {
                    const result = await websiteScraper.scrapeWebsite(url, userId);
                    console.log(`Background scrape process finished successfully for ${url}, user ${userId}.`);
                    
                    // Create or update a file to store the most recent scrape result
                    const resultFile = path.join(__dirname, '../../data/scrape_result.json');
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
    router.get('/status', asyncHandler(async (_, res: Response) => {
        const statusFile = path.join(__dirname, '../../data/scrape_status.json');
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
                    const resultFile = path.join(__dirname, '../../data/scrape_result.json');
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

    return router;
} 