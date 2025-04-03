const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const URL = require('url-parse');
const { v4: uuidv4 } = require('uuid');
const sizeOf = require('image-size');
const AssetProcessor = require('../assetProcessor');

// Simple sanitize function in case the module isn't working
const sanitize = (filename) => {
  // If the sanitize-filename module is available, use it
  try {
    const sanitizeModule = require('sanitize-filename');
    return sanitizeModule(filename);
  } catch (e) {
    // Otherwise use a simple sanitizer
    return filename
      .replace(/[^a-z0-9_\-.]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }
};

class WebsiteScraper {
  constructor() {
    this.assetProcessor = new AssetProcessor();
    this.assetsDir = path.join(__dirname, '../../../data/assets');
    this.visitedUrls = new Set();
    this.foundImages = new Set();
    this.urlsToVisit = [];
    this.baseUrl = '';
    this.baseUrlObj = null;
    this.personId = '';
    this.maxPagesToVisit = 50; // Limit to avoid excessive scraping
    this.pagesVisited = 0;
    this.textAssetsCreated = 0; // Add counter for text assets
  }

  /**
   * Main method to scrape a website
   * @param {string} url - The website URL to scrape (e.g., kenneth.computer)
   * @param {string} personId - The person ID to associate with the assets
   * @returns {Promise<object>} Summary of the scraping results
   */
  async scrapeWebsite(url, personId) {
    console.log(`WebsiteScraper.scrapeWebsite(${url}, ${personId}) called`);
    
    // Ensure URL has http/https prefix
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    this.baseUrl = url;
    this.baseUrlObj = new URL(url);
    
    // Use the correct sanitization method: sanitizeUserId
    const sanitizedUserId = this.assetProcessor.sanitizeUserId(personId);
    this.personId = sanitizedUserId; // Store the sanitized ID for internal use in this class
    console.log(`Sanitized userId from "${personId}" to "${sanitizedUserId}" for consistent directory naming`);
    
    // Reset state
    this.visitedUrls.clear();
    this.foundImages.clear();
    this.urlsToVisit = [url];
    this.pagesVisited = 0;
    this.textAssetsCreated = 0; // Add counter for text assets
    
    // Create a status file to persist scraping state across server restarts
    const statusFile = path.join(__dirname, '../../../data/scrape_status.json');
    
    // Set initial status
    const scrapeStatus = {
      inProgress: true,
      startTime: Date.now(),
      url: url,
      userId: this.personId, // Use sanitized ID in status
      originalUserId: personId, // Keep original for reference
      pagesVisited: 0,
      imagesFound: 0,
      textAssetsCreated: 0,
      lastUpdated: Date.now()
    };
    
    // Write initial status
    await fs.writeFile(statusFile, JSON.stringify(scrapeStatus, null, 2), 'utf-8');
    
    console.log(`Starting to scrape ${this.baseUrl} for user ID: ${this.personId}`);
    
    // Use the sanitized userId for output directory
    const scrapeDir = path.join(this.assetsDir, this.personId);
    
    try {
      console.log(`Creating directory at ${scrapeDir}`);
      await fs.mkdir(scrapeDir, { recursive: true });
      
      // ===== IMPROVED CRAWLING IMPLEMENTATION =====
      
      // Continue while we have URLs to visit and haven't reached the limit
      const maxPages = 100; // Increased limit to crawl more pages
      
      while (this.urlsToVisit.length > 0 && this.pagesVisited < maxPages) {
        const currentUrl = this.urlsToVisit.shift();
        
        // Skip if already visited
        if (this.visitedUrls.has(currentUrl)) {
          continue;
        }
        
        // Mark as visited
        this.visitedUrls.add(currentUrl);
        this.pagesVisited++;
        
        // Update status file
        scrapeStatus.pagesVisited = this.pagesVisited;
        scrapeStatus.imagesFound = this.foundImages.size;
        scrapeStatus.textAssetsCreated = this.textAssetsCreated;
        scrapeStatus.lastUpdated = Date.now();
        await fs.writeFile(statusFile, JSON.stringify(scrapeStatus, null, 2), 'utf-8');
        
        console.log(`Crawling page ${this.pagesVisited}/${maxPages}: ${currentUrl}`);
        
        try {
          // Fetch the page
          const response = await axios.get(currentUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
          });
          
          const html = response.data;
          console.log(`Fetched HTML content from ${currentUrl}, length: ${html.length} bytes`);
          
          // Parse with cheerio
          const $ = cheerio.load(html);
          
          // ENHANCED LINK DISCOVERY - Look for links before removing elements
          console.log(`===== LINK DISCOVERY - URL: ${currentUrl} =====`);
          // Enhanced link finding
          $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
              const resolvedUrl = this.resolveUrl(currentUrl, href);
              
              // Only add internal links that are in the same domain
              if (resolvedUrl && this.isInternalLink(resolvedUrl) && !this.visitedUrls.has(resolvedUrl) && !this.urlsToVisit.includes(resolvedUrl)) {
                console.log(`Found internal link: ${resolvedUrl}`);
                this.urlsToVisit.push(resolvedUrl);
              }
            }
          });
          
          // Find pagination links specifically
          $('.pagination a, .nav-links a, .pager a, a.page-numbers, a.next, a.prev, a[rel="next"], a[rel="prev"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
              const resolvedUrl = this.resolveUrl(currentUrl, href);
              if (resolvedUrl && this.isInternalLink(resolvedUrl) && !this.visitedUrls.has(resolvedUrl) && !this.urlsToVisit.includes(resolvedUrl)) {
                console.log(`Found pagination link: ${resolvedUrl}`);
                this.urlsToVisit.push(resolvedUrl);
              }
            }
          });
          
          // Also look for blog archive/category links
          $('.archive a, .categories a, .category a, .tags a, .tag-cloud a, .menu a, .navbar a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
              const resolvedUrl = this.resolveUrl(currentUrl, href);
              if (resolvedUrl && this.isInternalLink(resolvedUrl) && !this.visitedUrls.has(resolvedUrl) && !this.urlsToVisit.includes(resolvedUrl)) {
                console.log(`Found category/menu link: ${resolvedUrl}`);
                this.urlsToVisit.push(resolvedUrl);
              }
            }
          });
          console.log(`Queue length after finding links: ${this.urlsToVisit.length}`);
          console.log(`===== END LINK DISCOVERY =====`);
          
          // Now remove non-content elements for text extraction
          $('script, style, nav, header, footer, aside, .sidebar, .menu, .ad, #ad, .comment, .comments, #comments').remove();
          
          // Extract page title
          const pageTitle = $('title').text().trim();
          console.log(`Page title: ${pageTitle}`);

          // --- Improved Text Extraction ---
          console.log(`===== TEXT EXTRACTION - URL: ${currentUrl} =====`);
          let extractedText = '';
          // Prioritize common main content containers
          const contentSelectors = ['article', 'main', '.post-content', '.entry-content', '.content', '#content', '.main-content', '.article', '.post', '.blog-post', 'section.article', 'section.post'];
          let foundContent = false;
          
          for (const selector of contentSelectors) {
            console.log(`Checking selector: ${selector}`);
            const elements = $(selector);
            console.log(`Found ${elements.length} elements matching ${selector}`);
            
            elements.each((i, el) => {
              // Get text from paragraph children specifically
              const paragraphs = $(el).find('p');
              console.log(`Found ${paragraphs.length} paragraphs in ${selector}`);
              
              if (paragraphs.length > 0) {
                paragraphs.each((pi, pEl) => {
                  const pText = $(pEl).text().trim();
                  if (pText.length > 20) { // Only substantial paragraphs
                    extractedText += pText + '\n\n';
                  }
                });
              }
              
              // Also get headings
              $(el).find('h1, h2, h3, h4, h5, h6').each((hi, hEl) => {
                extractedText += $(hEl).text().trim() + '\n\n';
              });
              
              // And list items
              $(el).find('li').each((li, liEl) => {
                extractedText += '- ' + $(liEl).text().trim() + '\n';
              });
              
              foundContent = extractedText.length > 100; // Consider content found if we have substantial text
            });
            
            if (foundContent) {
              console.log(`Found content using selector ${selector}`);
              break; // Stop if we found significant content with this selector
            }
          }
          
          // Fallback to body if no specific content found
          if (!foundContent) {
             console.log(`No content found with specific selectors, falling back to body text`);
             // Try to get text directly from paragraphs in the body
             $('body p').each((i, pEl) => {
                const pText = $(pEl).text().trim();
                if (pText.length > 20) { // Only substantial paragraphs
                  extractedText += pText + '\n\n';
                }
             });
             
             // If still no content, use the entire body text
             if (extractedText.length < 100) {
                extractedText = $('body').text().trim();
             }
          }
          
          // Trim whitespace and verify length
          extractedText = extractedText.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();
          console.log(`Extracted text length: ${extractedText.length} characters`);
          console.log(`Text extract sample: ${extractedText.substring(0, 150)}...`);
          console.log(`===== END TEXT EXTRACTION =====`);

          // --- Process Extracted Text as Asset --- 
          if (extractedText.length > 100) { // Only process if we have substantial text
              // Create a unique filename based on the URL path
              const urlObj = new URL(currentUrl);
              // Get a cleaner slug with simple-slug if possible
              let pathSlug = '';
              try {
                const simpleSlug = require('simple-slug');
                pathSlug = simpleSlug(urlObj.pathname) || 'page-' + this.pagesVisited;
              } catch (e) {
                // Fall back to basic sanitization if simple-slug isn't available
                pathSlug = urlObj.pathname.split('/').filter(Boolean).join('-') || 'page-' + this.pagesVisited;
              }
              
              // Add page title to the filename for clarity
              let shortTitle = '';
              if (pageTitle) {
                shortTitle = pageTitle.substring(0, 30).trim().replace(/\s+/g, '-').toLowerCase();
                if (shortTitle) shortTitle = '-' + shortTitle;
              }
              
              const textAssetName = sanitize(`${urlObj.hostname}${shortTitle}-${pathSlug}.txt`);

              try {
                 // Create a fake file object with the text buffer
                 const textBuffer = Buffer.from(extractedText, 'utf-8');
                 const textFile = {
                   name: textAssetName,
                   data: textBuffer,
                   size: textBuffer.length,
                   mimetype: 'text/plain',
                   // Provide a conforming mv function for assetProcessor
                   mv: async (dest) => { 
                     try {
                       // Actually write the file to the destination as the asset processor expects
                       await fs.writeFile(dest, textBuffer);
                       return true;
                     } catch (err) {
                       console.error(`Error in mv function for text asset:`, err);
                       return false;
                     }
                   }
                 };

                 console.log(`Processing text asset: ${textAssetName} (${textBuffer.length} bytes) for user ${this.personId}`);
                 
                 // Call assetProcessor with the correct metadata key: userId
                 const result = await this.assetProcessor.processAsset(textFile, {
                    userId: this.personId, // Use the sanitized ID with the correct key
                    sourceUrl: currentUrl,
                    title: pageTitle || pathSlug,
                    context: 'website-text',
                    contentType: 'text/plain',
                    wordCount: extractedText.split(/\s+/).length
                 });
                 
                 console.log(`Text asset processed successfully: ${JSON.stringify(result || 'No result')}`);
                 this.textAssetsCreated++; // Increment counter
              } catch (assetError) {
                  console.error(`Error processing text asset for user ${this.personId}:`, assetError);
              }
          } else {
              console.log(`Skipping text asset creation - not enough content found (${extractedText.length} chars)`);
          }

          // Find images - more comprehensive search
          console.log(`===== IMAGE DISCOVERY - URL: ${currentUrl} =====`);
          $('img').each((i, el) => {
            // Check standard src attribute
            const imgSrc = $(el).attr('src');
            if (imgSrc) {
              const imgUrl = this.resolveUrl(currentUrl, imgSrc);
              if (imgUrl) {
                this.foundImages.add(imgUrl);
                console.log(`Found image (src): ${imgUrl}`);
              }
            }
            
            // Check data-src (lazy loading)
            const dataSrc = $(el).attr('data-src');
            if (dataSrc) {
              const imgUrl = this.resolveUrl(currentUrl, dataSrc);
              if (imgUrl) {
                this.foundImages.add(imgUrl);
                console.log(`Found image (data-src): ${imgUrl}`);
              }
            }
            
            // Check srcset attribute
            const srcset = $(el).attr('srcset');
            if (srcset) {
              // Parse srcset to get the highest quality image
              const srcsetParts = srcset.split(',');
              for (const part of srcsetParts) {
                const url = part.trim().split(' ')[0];
                if (url) {
                  const imgUrl = this.resolveUrl(currentUrl, url);
                  if (imgUrl) {
                    this.foundImages.add(imgUrl);
                    console.log(`Found image (srcset): ${imgUrl}`);
                  }
                }
              }
            }
          });
          
          // Find background images in style attributes
          $('[style*="background"]').each((i, el) => {
            const style = $(el).attr('style');
            if (style) {
              const match = style.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/i);
              if (match && match[1]) {
                const imgUrl = this.resolveUrl(currentUrl, match[1]);
                if (imgUrl) {
                  this.foundImages.add(imgUrl);
                  console.log(`Found background image: ${imgUrl}`);
                }
              }
            }
          });
          console.log(`Found ${this.foundImages.size} images so far`);
          console.log(`===== END IMAGE DISCOVERY =====`);
          
        } catch (error) {
          console.error(`Error processing ${currentUrl}:`, error.message);
          // Continue with next URL
        }
      }
      
      // Download all images
      if (this.foundImages.size > 0) {
        console.log(`Found ${this.foundImages.size} images to download`);
        await this.downloadAllImages(scrapeDir);
      }
      
      // Calculate duration
      const endTime = Date.now();
      const duration = ((endTime - scrapeStatus.startTime) / 1000).toFixed(2);
      
      // Create summary
      const summary = {
        baseUrl: this.baseUrl,
        pagesVisited: this.pagesVisited,
        imagesFound: this.foundImages.size, // Update with final count if images were processed
        textAssetsCreated: this.textAssetsCreated,
        duration: `${duration} seconds`,
        userId: this.personId, // Include userId in summary
        originalUserId: personId
      };
      
      // Update final status
      scrapeStatus.inProgress = false;
      scrapeStatus.status = 'completed';
      scrapeStatus.summary = summary;
      scrapeStatus.endTime = endTime;
      scrapeStatus.lastUpdated = endTime;
      await fs.writeFile(statusFile, JSON.stringify(scrapeStatus, null, 2), 'utf-8');
      console.log(`Scraping completed for ${url}. Summary:`, summary);
      
      return summary;
      
    } catch (error) {
        console.error(`Critical error during scrapeWebsite for ${url} (User: ${personId}):`, error);
        // Update status to reflect error
        scrapeStatus.inProgress = false;
        scrapeStatus.status = 'error';
        scrapeStatus.error = error.message || 'Unknown scraping error';
        scrapeStatus.endTime = Date.now();
        scrapeStatus.lastUpdated = Date.now();
        try {
            await fs.writeFile(statusFile, JSON.stringify(scrapeStatus, null, 2), 'utf-8');
        } catch (writeError) {
            console.error('Failed to write error status to file:', writeError);
        }
        // Re-throw the error so the caller knows it failed
        throw error; 
    }
  }

  /**
   * Process a single page to extract content and discover links
   * @param {string} url - The URL to process
   * @param {string} outputDir - Directory to store assets
   * @returns {Promise<void>}
   */
  async processPage(url, outputDir) {
    try {
      // First try a simple fetch with axios
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        },
        timeout: 10000
      });
      
      const html = response.data;
      
      // Process the HTML
      await this.processHtml(url, html, outputDir);
    } catch (error) {
      console.log(`Simple fetch failed for ${url}, trying with puppeteer: ${error.message}`);
      
      // If simple fetch fails, try with puppeteer for dynamic content
      try {
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36');
        
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait a bit for any dynamic content to load
        await page.waitForTimeout(2000);
        
        const html = await page.content();
        
        await browser.close();
        
        // Process the HTML from puppeteer
        await this.processHtml(url, html, outputDir);
      } catch (puppeteerError) {
        console.error(`Puppeteer also failed for ${url}:`, puppeteerError);
        throw puppeteerError;
      }
    }
  }

  /**
   * Process HTML content to extract text, links and images
   * @param {string} url - The source URL
   * @param {string} html - The HTML content
   * @param {string} outputDir - Directory to store assets
   * @returns {Promise<void>}
   */
  async processHtml(url, html, outputDir) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, iframe, noscript').remove();
    
    // Get the page title
    const title = $('title').text().trim() || new URL(url).pathname;
    
    // Find all internal links
    $('a').each((i, element) => {
      const href = $(element).attr('href');
      if (href) {
        const absoluteUrl = this.resolveUrl(url, href);
        if (this.isInternalLink(absoluteUrl)) {
          if (!this.visitedUrls.has(absoluteUrl) && !this.urlsToVisit.includes(absoluteUrl)) {
            this.urlsToVisit.push(absoluteUrl);
          }
        }
      }
    });
    
    // Find all images
    $('img').each((i, element) => {
      const src = $(element).attr('src');
      if (src) {
        const imgUrl = this.resolveUrl(url, src);
        this.foundImages.add(imgUrl);
      }
    });
    
    // Extract texts from common content areas
    const contentSelectors = [
      'main', 'article', '.content', '.post', '.entry',
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'section', '.main-content', '#content', '.post-content'
    ];
    
    let textBlocks = [];
    
    // Try to find content in specific content areas first
    let mainContent = '';
    contentSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        const text = $(element).text().trim();
        if (text.length > 100) { // Only consider substantial content
          textBlocks.push({
            selector,
            text,
            wordCount: text.split(/\s+/).length
          });
          mainContent += text + '\n\n';
        }
      });
    });
    
    // If no significant content found, fallback to body text
    if (textBlocks.length === 0) {
      const bodyText = $('body').text().trim();
      if (bodyText) {
        textBlocks.push({
          selector: 'body',
          text: bodyText,
          wordCount: bodyText.split(/\s+/).length
        });
        mainContent = bodyText;
      }
    }
    
    // Save text content as an asset if there's any meaningful content
    if (mainContent.length > 50) {
      const urlObj = new URL(url);
      const pathSlug = urlObj.pathname
        .split('/')
        .filter(Boolean)
        .join('-') || 'home';
      
      const filename = sanitize(`${urlObj.hostname}-${pathSlug}.txt`);
      const filePath = path.join(outputDir, filename);
      
      try {
        await fs.writeFile(filePath, mainContent, 'utf-8');
        console.log(`Saved text content from ${url} to ${filename}`);
        
        // Process text as asset
        // Using already sanitized personId from scrapeWebsite
        await this.createTextAsset(filePath, {
          personId: this.personId, // Using sanitized personId
          sourceUrl: url,
          title: title,
          context: 'website',
          path: urlObj.pathname,
          wordCount: mainContent.split(/\s+/).length,
          domain: urlObj.hostname
        });
      } catch (error) {
        console.error(`Error saving text content from ${url}:`, error);
      }
    }
  }

  /**
   * Download all unique images found during scraping
   * @param {string} outputDir - Directory to save images
   */
  async downloadAllImages(outputDir) {
    console.log(`Starting image download process for ${this.foundImages.size} unique images`);
    const imagesToDownload = Array.from(this.foundImages);
    const downloadPromises = [];
    let downloadedCount = 0;

    for (let i = 0; i < imagesToDownload.length; i++) {
      const imageUrl = imagesToDownload[i];
      const imageFilename = sanitize(`image-${i}${path.extname(new URL(imageUrl).pathname) || '.png'}`);
      const imagePath = path.join(outputDir, imageFilename);

      console.log(`Downloading image ${i + 1}/${imagesToDownload.length}: ${imageUrl}`);
      
      const downloadPromise = axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 15000, // Increased timeout for images
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      .then(async (response) => {
        try {
          await fs.writeFile(imagePath, response.data);
          console.log(`Successfully downloaded image: ${imageFilename} (${i + 1}/${imagesToDownload.length})`);
          downloadedCount++;

          // Get image dimensions
          let dimensions = { width: null, height: null };
          try {
            dimensions = sizeOf(response.data);
          } catch (sizeError) {
            console.warn(`Could not determine dimensions for ${imageFilename}: ${sizeError.message}`);
          }

          // Pass the sanitized personId to createImageAsset
          // Since we've already sanitized this.personId at the beginning of scrapeWebsite,
          // we can use it directly to ensure consistent directory naming
          const metadata = {
            personId: this.personId, // Using the already sanitized personId
            sourceUrl: imageUrl,
            originalFilename: path.basename(new URL(imageUrl).pathname) || imageFilename,
            context: 'website-image',
            domain: this.baseUrlObj.hostname,
            width: dimensions.width,
            height: dimensions.height
          };
          
          // Create asset after download
          await this.createImageAsset(imagePath, metadata);
        } catch (writeError) {
          console.error(`Error writing image ${imageFilename}:`, writeError);
        }
      })
      .catch(error => {
        console.error(`Failed to download ${imageUrl}: ${error.message}`);
      });
      
      downloadPromises.push(downloadPromise);
      
      // Limit concurrency slightly to avoid overwhelming servers/network
      if (downloadPromises.length >= 5) {
        await Promise.all(downloadPromises);
        downloadPromises.length = 0; // Clear the array
      }
    }
    
    // Wait for any remaining downloads
    if (downloadPromises.length > 0) {
      await Promise.all(downloadPromises);
    }
    
    console.log(`Download complete. Downloaded ${downloadedCount}/${imagesToDownload.length} images.`);
  }

  /**
   * Create text asset using AssetProcessor
   * @param {string} filePath - Path to the text file
   * @param {object} metadata - Metadata for the asset
   * @returns {Promise<void>}
   */
  async createTextAsset(filePath, metadata) {
    // This function is likely no longer called directly by the main loop,
    // but keep it in case it's used elsewhere or for manual testing.
    console.warn('createTextAsset called, potentially redundant now.');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Create a fake file object similar to what express-fileupload provides
      const file = {
        name: path.basename(filePath),
        data: Buffer.from(content),
        tempFilePath: filePath,
        size: content.length,
        mimetype: 'text/plain',
        mv: async (dest) => await fs.copyFile(filePath, dest)
      };
      
      await this.assetProcessor.processAsset(file, metadata);
    } catch (error) {
      console.error(`Error creating text asset from ${filePath}:`, error);
    }
  }

  /**
   * Create image asset using AssetProcessor
   * Requires the image file to already exist at filePath
   * @param {string} filePath - Path to the existing image file
   * @param {object} metadata - Metadata for the asset (MUST include personId)
   * @returns {Promise<void>}
   */
  async createImageAsset(filePath, metadata) {
    // Ensure personId is present in metadata
    if (!metadata || !metadata.personId) {
      console.error(`Error creating image asset: personId is missing in metadata for ${filePath}`);
      return; // Cannot process without personId
    }
    
    try {
      const data = await fs.readFile(filePath);
      
      // Create a fake file object similar to what express-fileupload provides
      const file = {
        name: metadata.originalFilename || path.basename(filePath), // Use original name if available
        data: data,
        tempFilePath: filePath, // Use the actual path as temp path for AssetProcessor logic
        size: data.length,
        mimetype: this.getMimeType(filePath),
        // AssetProcessor expects an mv function. This function needs to actually
        // move/rename the temporary scraped file (filePath) to the final destination (dest)
        // calculated by AssetProcessor.
        mv: async (dest) => { 
            console.log(`(mv for createImageAsset: renaming ${filePath} to ${dest})`);
            try {
                await fs.rename(filePath, dest); // Ensure the temp file is renamed to the final path
                return true; 
            } catch (renameError) {
                console.error(`Error renaming temporary image file ${filePath} to ${dest}:`, renameError);
                // Attempt a copy as a fallback if rename fails (e.g., across devices)
                try {
                    await fs.copyFile(filePath, dest);
                    console.log(`Successfully copied ${filePath} to ${dest} after rename failed.`);
                    // Optionally delete the original temp file after copy
                    // await fs.unlink(filePath);
                    return true;
                } catch (copyError) {
                    console.error(`Error copying temporary image file ${filePath} to ${dest} after rename failed:`, copyError);
                    return false; // Indicate failure
                }
            }
        }
      };
      
      console.log(`Processing image asset: ${file.name} for person: ${metadata.personId}`);
      await this.assetProcessor.processAsset(file, metadata); // Pass metadata containing personId
    } catch (error) {
      console.error(`Error creating image asset from ${filePath} for person ${metadata.personId}:`, error);
    }
  }

  /**
   * Check if a URL is internal to the site being scraped
   * @param {string} url - URL to check
   * @returns {boolean} True if URL is internal
   */
  isInternalLink(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === this.baseUrlObj.hostname;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   * @param {string} base - Base URL
   * @param {string} href - Relative or absolute URL
   * @returns {string} Absolute URL
   */
  resolveUrl(base, href) {
    try {
      // Skip invalid inputs
      if (!href || typeof href !== 'string') {
        return '';
      }
      
      // Clean the href - remove whitespace and quotes
      href = href.trim().replace(/['"]/g, '');
      
      // Handle data URLs
      if (href.startsWith('data:')) {
        return ''; // Skip data URLs
      }
      
      // Handle different URL formats
      if (href.startsWith('//')) {
        return `${this.baseUrlObj.protocol}${href}`;
      }
      
      // Skip anchor links and javascript
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        return '';
      }
      
      // Enhanced URL normalization for blog platforms
      // Strip query parameters that don't affect content (common in blogs)
      if (href.includes('?') && !href.includes('/wp-admin/') && !href.includes('/wp-login.php')) {
        // Keep parameters that are likely part of the content path in common CMS systems
        const paramsToKeep = ['p=', 'page_id=', 'cat=', 'tag=', 'category=', 'post=', 'postid='];
        const [urlPart, queryPart] = href.split('?');
        
        // If no important query params, remove them all
        if (!paramsToKeep.some(param => queryPart && queryPart.includes(param))) {
          href = urlPart;
        }
      }
      
      // Resolve the URL against the base
      const resolvedUrl = new URL(href, base).href;
      
      // Filter out non-http protocols and remove fragment identifiers
      if (!resolvedUrl.startsWith('http')) {
        return '';
      }
      
      // Remove fragment identifiers
      const urlWithoutFragment = resolvedUrl.split('#')[0];
      
      // More thorough normalization for blogs
      let normalizedUrl = urlWithoutFragment;
      
      // Remove common tracking parameters
      if (normalizedUrl.includes('?')) {
        const url = new URL(normalizedUrl);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'ref'];
        paramsToRemove.forEach(param => url.searchParams.delete(param));
        normalizedUrl = url.toString();
      }
      
      return normalizedUrl;
    } catch (error) {
      console.error(`Error resolving URL ${href} from ${base}:`, error.message);
      return '';
    }
  }

  /**
   * Get MIME type based on file extension
   * @param {string} filePath - Path to the file
   * @returns {string} MIME type
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = WebsiteScraper;