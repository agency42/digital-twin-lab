import axios from 'axios';
import * as cheerio from 'cheerio'; // Use namespace import for cheerio
import path from 'path';
import fs from 'fs/promises';
import { URL } from 'url';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4
import AssetProcessor from '../assetProcessor'; // Import TS version
import { UploadedFile } from 'express-fileupload'; // Type needed for fake file object

// Interface for the scrape status object
interface ScrapeStatus {
    status: 'idle' | 'inProgress' | 'completed' | 'error';
    message: string;
    url?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
    pagesVisited?: number;
    imagesFound?: number;
    textAssetsCreated?: number;
    lastUpdated?: number;
    errorDetails?: string;
    durationSeconds?: number; // Added field
}

// Interface for the summary returned by scrapeWebsite
interface ScrapeSummary {
    status: 'completed' | 'error';
    message: string;
    pagesVisited: number;
    imagesDownloaded: number;
    textAssetsCreated: number;
    durationSeconds: number;
    assetResults: any[]; // TODO: Define a proper type for asset results
}

class WebsiteScraper {
    private assetProcessor: AssetProcessor;
    private assetsDir: string;
    private baseUrl?: string;
    private baseUrlObj?: URL;
    private personId?: string; // User ID associated with the scrape
    private visitedUrls: Set<string>;
    private urlsToVisit: string[];
    private foundImages: Set<string>;
    private pagesVisited: number;
    private textAssetsCreated: number;
    private imageDownloadCount: number;
    private assetResults: any[]; // TODO: Use proper type
    private statusFilePath: string;

    constructor() {
        this.assetProcessor = new AssetProcessor();
        this.assetsDir = path.join(__dirname, '../../../data/assets'); // Path relative to dist/services/scrapers
        this.visitedUrls = new Set();
        this.urlsToVisit = [];
        this.foundImages = new Set();
        this.pagesVisited = 0;
        this.textAssetsCreated = 0;
        this.imageDownloadCount = 0;
        this.assetResults = [];
        // Status file path - consider making this configurable or user-specific
        this.statusFilePath = path.join(__dirname, '../../../data/scrape_status.json');
    }

    /**
     * Resolves a relative URL against a base URL.
     * @param base The base URL string.
     * @param relative The relative URL string.
     * @returns The absolute URL string or null if resolution fails.
     */
    private resolveUrl(base: string, relative: string): string | null {
        try {
            // Remove fragment identifiers before resolving
            const cleanedRelative = relative.split('#')[0];
            if (!cleanedRelative) return null; // Ignore if only fragment
            return new URL(cleanedRelative, base).href;
        } catch (error) {
            // console.warn(`Failed to resolve URL: ${relative} against base ${base}`);
            return null;
        }
    }

    /**
     * Checks if a URL is internal (same domain) as the base URL.
     * @param urlString The URL to check.
     * @returns True if the URL is internal, false otherwise.
     */
    private isInternalLink(urlString: string): boolean {
        if (!this.baseUrlObj) return false;
        try {
            const url = new URL(urlString);
            // Check if hostname matches exactly
            // More complex logic might be needed for subdomains if required
            return url.hostname === this.baseUrlObj.hostname;
        } catch (error) {
            return false;
        }
    }

    /**
     * Updates the scrape status file.
     * @param status Partial status object to update.
     */
    private async updateStatus(status: Partial<ScrapeStatus>): Promise<void> {
        let currentStatus: ScrapeStatus;
        try {
            const data = await fs.readFile(this.statusFilePath, 'utf-8');
            currentStatus = JSON.parse(data);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                currentStatus = { status: 'idle', message: 'Starting...' }; // Default if file doesn't exist
            } else {
                console.error('Error reading status file:', error);
                currentStatus = { status: 'error', message: 'Failed to read status file' };
            }
        }

        const newStatus: ScrapeStatus = { 
            ...currentStatus, 
            ...status, 
            lastUpdated: Date.now() 
        };

        try {
            await fs.writeFile(this.statusFilePath, JSON.stringify(newStatus, null, 2), 'utf-8');
        } catch (writeError: any) {
            console.error('Error writing status file:', writeError);
        }
    }

    /**
     * Main method to initiate and manage the website crawl.
     * @param url The starting URL to scrape.
     * @param personId The user ID associated with this scrape.
     * @returns {Promise<ScrapeSummary>}
     */
    async scrapeWebsite(url: string, personId: string): Promise<ScrapeSummary> {
        if (!url || !personId) {
            throw new Error('URL and Person ID are required for scraping');
        }
        this.baseUrl = url.startsWith('http') ? url : `https://` + url;
        this.personId = this.assetProcessor.sanitizeUserId(personId);
        this.baseUrlObj = new URL(this.baseUrl);
        
        // Reset state for new scrape
        this.visitedUrls.clear();
        this.urlsToVisit = [this.baseUrl]; // Start with the base URL
        this.foundImages.clear();
        this.pagesVisited = 0;
        this.textAssetsCreated = 0;
        this.imageDownloadCount = 0;
        this.assetResults = [];

        const startTime = Date.now();
        await this.updateStatus({
            status: 'inProgress',
            message: `Scraping started for ${this.baseUrl}`,
            url: this.baseUrl,
            userId: this.personId, 
            startTime,
            pagesVisited: 0,
            imagesFound: 0,
            textAssetsCreated: 0,
            errorDetails: undefined
        });

        try {
            await this.crawl();
            
            // Download images after crawling
            if (this.foundImages.size > 0) {
                 await this.downloadAllImages();
            }

            const endTime = Date.now();
            const durationSeconds = Math.round((endTime - startTime) / 1000);
            const summary: ScrapeSummary = {
                status: 'completed',
                message: `Scraping completed successfully. Visited ${this.pagesVisited} pages.`, 
                pagesVisited: this.pagesVisited,
                imagesDownloaded: this.imageDownloadCount,
                textAssetsCreated: this.textAssetsCreated,
                durationSeconds: durationSeconds,
                assetResults: this.assetResults
            };
            await this.updateStatus({ status: 'completed', message: summary.message, endTime, durationSeconds });
            return summary;

        } catch (error: any) {
            const endTime = Date.now();
            const durationSeconds = Math.round((endTime - startTime) / 1000);
            console.error(`Critical error during scrapeWebsite for ${url} (User: ${personId}):`, error);
            const summary: ScrapeSummary = {
                 status: 'error',
                 message: `Scraping failed: ${error.message}`,
                 pagesVisited: this.pagesVisited,
                 imagesDownloaded: this.imageDownloadCount,
                 textAssetsCreated: this.textAssetsCreated,
                 durationSeconds: durationSeconds,
                 assetResults: this.assetResults
            };
            await this.updateStatus({ status: 'error', message: summary.message, endTime, durationSeconds, errorDetails: error.stack });
            throw error; // Re-throw the error after updating status
        }
    }

    /**
     * Recursive crawl function.
     * @param url The current URL to crawl.
     */
    private async crawl(): Promise<void> {
        const maxPages = 100; // Limit crawl depth/breadth

        while (this.urlsToVisit.length > 0 && this.pagesVisited < maxPages) {
            const currentUrl = this.urlsToVisit.shift();
            if (!currentUrl || this.visitedUrls.has(currentUrl)) {
                continue;
            }

            this.visitedUrls.add(currentUrl);
            this.pagesVisited++;
            console.log(`Crawling page ${this.pagesVisited}/${maxPages}: ${currentUrl}`);
            await this.updateStatus({ pagesVisited: this.pagesVisited, imagesFound: this.foundImages.size });

            try {
                const response = await axios.get<string>(currentUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' // Be a good bot
                    },
                    timeout: 10000, // 10 second timeout
                    responseType: 'text' // Ensure data is string
                });

                // Only process HTML content
                const contentType = response.headers['content-type'];
                if (!contentType || !contentType.includes('text/html')) {
                    console.warn(`Skipping non-HTML content at ${currentUrl} (Type: ${contentType})`);
                    continue;
                }

                const html = response.data;
                const $ = cheerio.load(html);

                // Discover links
                this.discoverLinks($, currentUrl);

                // Process content (text and images)
                await this.processPageContent($, currentUrl);

            } catch (error: any) {
                console.error(`Error processing ${currentUrl}:`, error.message);
                // Continue crawling other URLs even if one fails
            }
        }
         console.log(`Crawl finished. Visited ${this.pagesVisited} pages.`);
    }

    /**
     * Discovers internal links on a page and adds them to the queue.
     * @param $ Cheerio Root object.
     * @param currentUrl The URL of the current page.
     */
    private discoverLinks($: cheerio.Root, currentUrl: string): void {
        $('a').each((/* i */ _, el) => { // Mark i as unused
            const href = $(el).attr('href');
            if (href) {
                const resolvedUrl = this.resolveUrl(currentUrl, href);
                if (resolvedUrl && this.isInternalLink(resolvedUrl) && !this.visitedUrls.has(resolvedUrl) && !this.urlsToVisit.includes(resolvedUrl)) {
                    this.urlsToVisit.push(resolvedUrl);
                }
            }
        });
    }

    /**
     * Extracts text and finds images on the page, processing them as assets.
     * @param $ Cheerio Root object.
     * @param currentUrl The URL of the current page.
     */
    private async processPageContent($: cheerio.Root, currentUrl: string): Promise<void> {
        // --- Text Extraction ---
        // Remove non-content elements
        $('script, style, nav, header, footer, aside, .sidebar, .menu, .ad, #ad, .comment, .comments, #comments, noscript').remove();
        const pageTitle = $('title').text().trim();
        let extractedText = $('body').text(); // Simple extraction for now
        // Basic cleaning
        extractedText = extractedText.replace(/\s\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

        if (extractedText.length > 100) { // Minimum length to be considered content
            const textAssetName = sanitize(`${this.baseUrlObj?.hostname || 'website'}-${pageTitle || path.basename(currentUrl) || 'page'}.txt`);
            const textBuffer = Buffer.from(extractedText, 'utf-8');
            
            // Create a structure mimicking UploadedFile for processAsset
            const textFile: UploadedFile = {
                name: textAssetName,
                data: textBuffer,
                size: textBuffer.length,
                encoding: 'utf8',
                tempFilePath: '', // Not applicable
                truncated: false,
                mimetype: 'text/plain',
                md5: '', // Not applicable
                mv: async (path: string) => { await fs.writeFile(path, textBuffer); } // Simple mv implementation
            };

            try {
                const result = await this.assetProcessor.processAsset(textFile, {
                    userId: this.personId!, // Use non-null assertion as personId is set in scrapeWebsite
                    sourceUrl: currentUrl,
                    title: pageTitle,
                    sourceType: 'website-scrape',
                    context: 'website-text',
                    wordCount: extractedText.split(/\s+/).length,
                    sourcePlatform: 'website',
                    sourceMedium: 'article'
                });
                this.assetResults.push(result); // Store asset result
                this.textAssetsCreated++;
                await this.updateStatus({ textAssetsCreated: this.textAssetsCreated });
            } catch (assetError: any) {
                console.error(`Error processing text asset for ${currentUrl}:`, assetError);
            }
        } else {
             // console.log(`Skipping text asset creation - not enough content found (${extractedText.length} chars)`);
        }

        // --- Image Discovery ---
        $('img').each((/* i */ _, el) => { // Mark i as unused
            const imgSrc = $(el).attr('src') || $(el).attr('data-src'); // Check src and data-src
            if (imgSrc) {
                const imgUrl = this.resolveUrl(currentUrl, imgSrc);
                if (imgUrl && !this.foundImages.has(imgUrl)) { // Avoid duplicates
                     // Basic check for common image extensions
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(imgUrl.split('?')[0])) {
                        this.foundImages.add(imgUrl);
                    }
                }
            }
            // TODO: Add srcset handling if needed
        });
        await this.updateStatus({ imagesFound: this.foundImages.size });
    }

    /**
     * Downloads all discovered images.
     */
    private async downloadAllImages(): Promise<void> {
        if (!this.personId) return;
        const userImageDir = path.join(this.assetsDir, this.personId, 'images');
        await fs.mkdir(userImageDir, { recursive: true });

        console.log(`Attempting to download ${this.foundImages.size} unique images...`);
        const downloadPromises: Promise<void>[] = [];

        for (const imgUrl of this.foundImages) {
            downloadPromises.push(
                (async () => {
                    try {
                        const response = await axios.get(imgUrl, {
                            responseType: 'arraybuffer',
                            timeout: 15000
                        });

                        // Create Buffer directly from ArrayBuffer without encoding
                        const buffer = Buffer.from(response.data as ArrayBuffer);
                        const contentType = response.headers['content-type'] || 'image/jpeg';
                        const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'; // Handle potential charset in content-type
                        const imageName = sanitize(path.basename(new URL(imgUrl).pathname) || `${uuidv4()}.${extension}`);
                        
                         // Create a structure mimicking UploadedFile for processAsset
                         const imageFile: UploadedFile = {
                            name: imageName,
                            data: buffer,
                            size: buffer.length,
                            encoding: 'binary',
                            tempFilePath: '', 
                            truncated: false,
                            mimetype: contentType,
                            md5: '', 
                            mv: async (path: string) => { await fs.writeFile(path, buffer); }
                        };

                        const result = await this.assetProcessor.processAsset(imageFile, {
                            userId: this.personId!, // Non-null assertion
                            sourceUrl: imgUrl,
                            sourceType: 'website-scrape',
                            context: 'website-image',
                            sourcePlatform: 'website',
                            sourceMedium: 'image'
                        });
                        this.assetResults.push(result);
                        this.imageDownloadCount++;

                    } catch (error: any) {
                        console.warn(`Failed to download or process image ${imgUrl}: ${error.message}`);
                    }
                })()
            );
            
            // Limit concurrent downloads if necessary
            if (downloadPromises.length >= 10) { // Process in batches of 10
                 await Promise.all(downloadPromises);
                 downloadPromises.length = 0; // Clear the array
            }
        }
        // Wait for any remaining downloads
        if (downloadPromises.length > 0) {
             await Promise.all(downloadPromises);
        }
        console.log(`Finished image download process. Downloaded: ${this.imageDownloadCount}`);
    }

    /**
     * Saves extracted text content as a new asset.
     * @param content The text content.
     * @param pageUrl The URL the text was extracted from.
     * @param pageTitle Optional title of the page.
     */
    private async saveTextContent(content: string, pageUrl: string, pageTitle?: string): Promise<void> {
        if (!this.personId) return;

        const filename = sanitize(pageTitle || new URL(pageUrl).hostname || 'scraped_text') + '.txt';
        const buffer = Buffer.from(content, 'utf8');

        // Create a fake UploadedFile object for assetProcessor
        const fakeFile: any = {
            name: filename,
            data: buffer,
            size: buffer.length,
            encoding: 'utf8',
            tempFilePath: '',
            truncated: false,
            mimetype: 'text/plain',
            md5: '',
            mv: async (dest: string) => {
                try {
                    const destDir = path.dirname(dest);
                    await fs.mkdir(destDir, { recursive: true });
                    await fs.writeFile(dest, content, 'utf8');
                } catch (mvError: any) {
                    console.error(`Error writing scraped text file during mv (${filename}):`, mvError);
                    throw mvError;
                }
            }
        };

        const metadata = {
            userId: this.personId,
            personId: this.personId,
            sourceUrl: pageUrl,
            sourcePlatform: 'website',
            sourceMedium: 'article',
            context: `Scraped from ${pageUrl}`,
            title: pageTitle || pageUrl
        };

        try {
            const asset = await this.assetProcessor.processAsset(fakeFile, metadata);
            this.textAssetsCreated++;
            this.assetResults.push({ type: 'text', id: asset.asset_id, url: pageUrl });
            await this.updateStatus({ textAssetsCreated: this.textAssetsCreated });
            console.log(`Saved text asset for ${pageUrl}, ID: ${asset.asset_id}`);
        } catch (error) {
            console.error(`Failed to save text asset for ${pageUrl}:`, error);
            // Continue scraping other content
        }
    }

    /**
     * Downloads an image and saves it as a new asset.
     * @param imageUrl The URL of the image to download.
     */
    private async saveImageContent(imageUrl: string): Promise<void> {
        if (!this.personId) return;

        try {
            const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer', 
                timeout: 15000, // Longer timeout for image downloads
                headers: { 'User-Agent': 'Mozilla/5.0' } // Basic user agent
            });
            // Create Buffer directly from ArrayBuffer without encoding
            const buffer = Buffer.from(response.data as ArrayBuffer);
            const mimeType = response.headers['content-type'] || 'image/jpeg'; // Default MIME type
            const extension = mimeType.split('/')[1]?.split(';')[0] || 'jpg'; // Extract extension
            
            // Create a filename (can be improved)
            const urlParts = new URL(imageUrl);
            const baseFilename = path.basename(urlParts.pathname) || `image_${uuidv4().substring(0, 8)}`;
            const safeFilename = sanitize(baseFilename);
            const filename = path.parse(safeFilename).name + '.' + extension;

            // Create fake UploadedFile object
            const fakeFile: any = {
                name: filename,
                data: buffer,
                size: buffer.length,
                encoding: 'binary',
                tempFilePath: '',
                truncated: false,
                mimetype: mimeType,
                md5: '',
                mv: async (dest: string) => {
                    try {
                        const destDir = path.dirname(dest);
                        await fs.mkdir(destDir, { recursive: true });
                        await fs.writeFile(dest, buffer);
                    } catch (mvError: any) {
                        console.error(`Error writing scraped image file during mv (${filename}):`, mvError);
                        throw mvError;
                    }
                }
            };

            const metadata = {
                userId: this.personId,
                personId: this.personId,
                sourceUrl: imageUrl,
                sourcePlatform: 'website',
                sourceMedium: 'image',
                context: `Scraped image from ${this.baseUrl}`
            };

            const asset = await this.assetProcessor.processAsset(fakeFile, metadata);
            this.imageDownloadCount++;
            this.assetResults.push({ type: 'image', id: asset.asset_id, url: imageUrl });
            console.log(`Saved image asset from ${imageUrl}, ID: ${asset.asset_id}`);

        } catch (error: any) {
            console.error(`Failed to download or save image ${imageUrl}:`, error.message);
             // Continue with other images
        }
    }
}

export default WebsiteScraper; 