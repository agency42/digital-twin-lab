/**
 * contentModule.ts - Handles content library functionality
 */
import { state, showStatus } from './utils.js';
// Removed unused import: import { updateGenerateButtonState } from './personalityModule.js'; 

// Simple placeholder for missing images (question mark in gray box)
const PLACEHOLDER_IMAGE_URI = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999">?</text></svg>';

// Define interfaces for data structures
interface Asset {
    id: string;
    userId?: string;
    profileId?: string; // Or derived from userId
    filename?: string; // Prefer fileName
    fileName?: string;
    contentType?: string; // Frontend consistency
    mimetype?: string; // From backend
    sourcePlatform?: string; // Added
    sourceMedium?: string; // Added
    sourceType?: string; // e.g., 'upload', 'scrape', 'linkedin' - Keep temporarily for compatibility?
    source?: string; // e.g., URL for scrape
    createdAt?: string; // ISO Date string
    assetUrl?: string; // Direct URL if available
    filePath?: string; // Relative path if known
    contentPreview?: string; 
    extractedContent?: string;
    extractedContentLength?: number;
    context?: string;
    metadata?: { // Allow flexible metadata
        [key: string]: any;
        sourceType?: string;
        source?: string;
        createdAt?: string;
        preview?: string;
        context?: string;
        userId?: string;
    };
}

// Define a type for the elements passed to this module
interface ContentModuleElements {
    uploadFileInput: HTMLInputElement | null;
    uploadStatusDiv: HTMLDivElement | null;
    contentLibraryPage: HTMLElement | null; // Or more specific if known
    selectionSummarySpan: HTMLSpanElement | null;
    assetDisplayArea: HTMLDivElement | null;
    deleteSelectedButton: HTMLButtonElement | null;
    selectAllTextButton: HTMLButtonElement | null;
    selectAllImagesButton: HTMLButtonElement | null;
    deselectAllButton: HTMLButtonElement | null;
    scrapeUrlInput: HTMLInputElement | null;
    startScrapingButton: HTMLButtonElement | null;
    scrapeStatusDiv: HTMLDivElement | null;
    clearLibraryButton: HTMLButtonElement | null;
    clearLibraryStatusDiv: HTMLDivElement | null;
}

// UI Elements cache - typed
let uploadFileInput: HTMLInputElement | null = null;
let uploadStatusDiv: HTMLDivElement | null = null;
let selectionSummarySpan: HTMLSpanElement | null = null;
let assetDisplayArea: HTMLDivElement | null = null;
let deleteSelectedButton: HTMLButtonElement | null = null;
let selectAllTextButton: HTMLButtonElement | null = null;
let selectAllImagesButton: HTMLButtonElement | null = null;
let deselectAllButton: HTMLButtonElement | null = null;
let scrapeUrlInput: HTMLInputElement | null = null;
let startScrapingButton: HTMLButtonElement | null = null;
let scrapeStatusDiv: HTMLDivElement | null = null;
let clearLibraryButton: HTMLButtonElement | null = null;
let clearLibraryStatusDiv: HTMLDivElement | null = null;

// Debug level: 0 = none, 1 = errors only, 2 = warnings, 3 = info, 4 = verbose
const DEBUG_LEVEL: number = 0; // Changed to number type

/**
 * Debug logger function that respects the debug level
 * @param level - The logging level (1-4)
 * @param message - The message to log
 * @param data - Optional data to log
 */
function log(level: number, message: string, data?: any): void {
    if (level <= DEBUG_LEVEL) {
        switch (level) {
            case 1:
                data ? console.error(message, data) : console.error(message);
                break;
            case 2:
                data ? console.warn(message, data) : console.warn(message);
                break;
            case 3:
                data ? console.log(message, data) : console.log(message);
                break;
            case 4:
                data ? console.debug(message, data) : console.debug(message);
                break;
        }
    }
}

/**
 * Initialize the content module
 * @param elements - UI elements for content management
 */
export function initContentModule(elements: ContentModuleElements): void {
    uploadFileInput = elements.uploadFileInput;
    uploadStatusDiv = elements.uploadStatusDiv;
    selectionSummarySpan = elements.selectionSummarySpan;
    assetDisplayArea = elements.assetDisplayArea;
    deleteSelectedButton = elements.deleteSelectedButton;
    selectAllTextButton = elements.selectAllTextButton;
    selectAllImagesButton = elements.selectAllImagesButton; // Corrected variable name
    deselectAllButton = elements.deselectAllButton;
    scrapeUrlInput = elements.scrapeUrlInput;
    startScrapingButton = elements.startScrapingButton;
    scrapeStatusDiv = elements.scrapeStatusDiv;
    clearLibraryButton = elements.clearLibraryButton;
    clearLibraryStatusDiv = elements.clearLibraryStatusDiv;

    // Set up event listeners with null checks
    uploadFileInput?.addEventListener('change', handleFileUpload);
    deleteSelectedButton?.addEventListener('click', deleteSelectedAssets);
    selectAllTextButton?.addEventListener('click', selectAllTextAssets);
    selectAllImagesButton?.addEventListener('click', selectAllImageAssets);
    deselectAllButton?.addEventListener('click', deselectAllAssets);
    startScrapingButton?.addEventListener('click', startScraping);
    clearLibraryButton?.addEventListener('click', clearContentLibrary);

    // Listen for content library page activation
    document.addEventListener('content-library-page-activated', () => {
        log(3, 'Content Library page activated, refreshing assets');
        if (state.currentUserId) {
            loadAssets(state.currentUserId);
        }
    });

    // Listen for user selection/data loaded to load initial assets
    document.addEventListener('user-data-loaded', (event: Event) => {
        const detail = (event as CustomEvent).detail;
        log(3, 'Content module received user-data-loaded event', detail);
        if (detail && detail.userId) {
            // Check if the content library is the active page before loading
            const contentPage = document.getElementById('content-library-page');
            if (contentPage && contentPage.classList.contains('active')) {
                 log(3, `User data loaded for ${detail.userId}, loading assets as content page is active.`);
                 loadAssets(detail.userId);
            } else {
                log(3, `User data loaded for ${detail.userId}, but content page is not active. Assets will load on activation.`);
            }
        } else {
            log(2, 'User data loaded event received, but no userId found in detail.');
            // Potentially clear assets if user is deselected?
            // clearAssetsDisplay(); 
        }
    });

    log(3, 'Content module initialized');
}

/**
 * Start website scraping
 */
export function startScraping(): void {
    if (!scrapeUrlInput || !scrapeStatusDiv) return;

    log(3, 'startScraping function called');

    const url = scrapeUrlInput.value.trim();
    if (!url) {
        showStatus(scrapeStatusDiv, 'Please enter a URL to scrape', 'error');
        return;
    }

    // Check for user ID in state or try to get it from UI
    if (!state.currentUserId) {
        const userDisplaySpan = document.getElementById('current-user-display') as HTMLSpanElement | null;
        if (userDisplaySpan?.textContent && userDisplaySpan.textContent !== 'None Selected') {
            log(3, 'Restoring lost user context for scraping:', userDisplaySpan.textContent);
            state.currentUserId = userDisplaySpan.textContent;
        } else {
            showStatus(scrapeStatusDiv, 'Please select a user first', 'error');
            return;
        }
    }
    const currentUserId = state.currentUserId; // Use const after check

    // Check if the URL is valid
    try {
        new URL(url);
    } catch (error) {
        showStatus(scrapeStatusDiv, 'Please enter a valid URL (e.g., https://example.com)', 'error');
        return;
    }

    showStatus(scrapeStatusDiv, 'Starting to scrape website...', 'loading');
    log(3, `Starting to scrape ${url} for user ${currentUserId}`);

    // Send scrape request to the server
    log(3, `Sending scrape request to /api/scrape with URL: ${url} and user: ${currentUserId}`);

    fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userId: currentUserId })
    })
    .then(async response => {
        if (!response.ok) {
            let errorMsg = `Failed to start scraping (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        return response.json();
    })
    .then(data => {
        log(3, 'Scrape result:', data);
        if (data.status === 'started' && data.jobId) {
            showStatus(scrapeStatusDiv, `Scraping in progress. This may take a minute...`, 'loading');
            pollScrapeStatus(data.jobId, 1);
        } else {
            showStatus(scrapeStatusDiv, `Scrape complete. ${data.assetsCreated ?? 0} assets created.`, 'success');
            loadAssets(currentUserId); // Refresh assets
        }
    })
    .catch(error => {
        log(1, 'Error starting scrape:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(scrapeStatusDiv, `Error: ${message}`, 'error');
    });
}

/**
 * Poll scrape job status
 * @param jobId - The scrape job ID
 * @param attempt - The polling attempt number (for exponential backoff)
 */
function pollScrapeStatus(jobId: string, attempt: number): void {
    if (attempt > 10) {
        showStatus(scrapeStatusDiv, 'Scraping is taking longer than expected. Please check back later.', 'info');
        return;
    }

    // Exponential backoff with jitter: Start at 1s, max at 5s
    const delay = Math.min(Math.pow(1.5, attempt) * 1000, 5000) + (Math.random() * 1000);

    log(4, `Polling scrape status for job ${jobId} (attempt ${attempt}, delay ${delay}ms)`);

    setTimeout(() => {
        fetch(`/api/scrape/status/${jobId}`)
            .then(async response => {
                if (!response.ok) {
                    let errorMsg = `Failed to get scrape status (${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorMsg;
                    } catch { /* Ignore */ }
                    throw new Error(errorMsg);
                }
                return response.json();
            })
            .then(data => {
                log(3, 'Scrape status:', data);
                if (data.status === 'completed') {
                    showStatus(scrapeStatusDiv, `Scrape complete. ${data.assetsCreated ?? 0} assets created.`, 'success');
                    if (state.currentUserId) loadAssets(state.currentUserId); // Refresh assets
                } else if (data.status === 'failed') {
                    showStatus(scrapeStatusDiv, `Scrape failed: ${data.error || 'Unknown error'}`, 'error');
                } else { // Status is still 'in_progress' or similar
                    showStatus(scrapeStatusDiv, `Scraping in progress (${attempt}/10)...`, 'loading');
                    pollScrapeStatus(jobId, attempt + 1); // Continue polling
                }
            })
            .catch(error => {
                log(1, 'Error checking scrape status:', error);
                const message = error instanceof Error ? error.message : String(error);
                showStatus(scrapeStatusDiv, `Error checking status: ${message}`, 'error');
                // Continue polling despite error (might be temporary)
                pollScrapeStatus(jobId, attempt + 1);
            });
    }, delay);
}

/**
 * Handle file upload
 */
function handleFileUpload(): void {
    if (!uploadFileInput?.files?.length || !state.currentUserId) {
        showStatus(uploadStatusDiv, 'Please select a user and file(s) first', 'error');
        return;
    }
    const currentUserId = state.currentUserId; // Use const after check
    const files = uploadFileInput.files;

    // Get source platform and medium from the new select elements
    const sourcePlatformSelect = document.getElementById('upload-source-platform') as HTMLSelectElement | null;
    const sourceMediumSelect = document.getElementById('upload-source-medium') as HTMLSelectElement | null;
    const sourcePlatform = sourcePlatformSelect?.value || 'direct_upload';
    const sourceMedium = sourceMediumSelect?.value || 'file';

    const formData = new FormData();
    formData.append('userId', currentUserId);
    // Append the new source fields
    formData.append('sourcePlatform', sourcePlatform);
    formData.append('sourceMedium', sourceMedium);

    for (let i = 0; i < files.length; i++) {
        // Use 'file' as the key, as expected by the backend
        formData.append('file', files[i]); 
    }

    showStatus(uploadStatusDiv, `Uploading ${files.length} file(s) (Platform: ${sourcePlatform}, Medium: ${sourceMedium})...`, 'loading');
    log(3, `Uploading ${files.length} file(s) for user ${currentUserId} with source: ${sourcePlatform}/${sourceMedium}`);

    // Fetch endpoint is /api/upload/ according to uploadRoutes.ts
    fetch('/api/upload/', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        if (!response.ok) {
            let errorMsg = `Failed to upload (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        return response.json();
    })
    .then(data => {
        log(3, 'Upload result:', data);
        showStatus(uploadStatusDiv, `Successfully uploaded ${data.uploaded ?? 0} file(s)`, 'success', 3000);
        if (uploadFileInput) uploadFileInput.value = ''; // Reset input
        loadAssets(currentUserId); // Refresh assets
    })
    .catch(error => {
        log(1, 'Error uploading files:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(uploadStatusDiv, `Error uploading: ${message}`, 'error');
    });
}

/**
 * Load assets for a user
 * @param userId - The user ID to load assets for
 */
export function loadAssets(userId: string): void {
    if (!userId) {
        log(1, 'Missing userId for loadAssets');
        return;
    }
    if (!assetDisplayArea) {
        log(1, 'Asset display area not found');
        return;
    }

    // Assign to const after null check
    const displayArea = assetDisplayArea;

    // Clear asset selection
    state.selectedAssets.clear();
    updateSelectionInfo();

    // Use the const variable
    displayArea.innerHTML = '<p>Loading assets...</p>'; // Show loading message

    fetch(`/api/assets/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load assets (${response.status} ${response.statusText})`);
            }
            return response.json();
        })
        .then((assets: Asset[]) => {
            log(3, `Loaded ${assets.length} assets for user ${userId}`);
            // Re-check the const variable
            if (!displayArea) return; 

            if (assets.length === 0) {
                // Use the const variable
                displayArea.innerHTML = '<p>No assets found. Upload files or scrape websites to add assets.</p>';
                return;
            }

            // Group assets by profile ID (usually same as userId for now)
            const assetsByProfile: { [key: string]: Asset[] } = {};
            assets.forEach(asset => {
                const profileId = asset.profileId || asset.userId || 'unknown';
                if (!assetsByProfile[profileId]) {
                    assetsByProfile[profileId] = [];
                }
                assetsByProfile[profileId].push(asset);
            });

            // Use the const variable
            displayArea.innerHTML = ''; // Clear display area

            const assetGroupTemplate = document.getElementById('asset-group-template') as HTMLTemplateElement | null;
            const assetCardTemplate = document.getElementById('asset-card-template') as HTMLTemplateElement | null;

            if (!assetGroupTemplate || !assetCardTemplate) {
                log(1, 'Asset templates not found');
                // Use the const variable
                displayArea.innerHTML = '<p>Error: UI templates missing.</p>';
                return;
            }

            const sortedProfileIds = Object.keys(assetsByProfile).sort();

            sortedProfileIds.forEach(profileId => {
                const profileAssets = assetsByProfile[profileId];
                const groupElement = assetGroupTemplate.content.cloneNode(true) as DocumentFragment;
                const groupTitle = groupElement.querySelector('.profile-id-display') as HTMLSpanElement | null;
                if (groupTitle) groupTitle.textContent = profileId;

                const textGrid = groupElement.querySelector('.text-content-grid') as HTMLDivElement | null;
                const imageGrid = groupElement.querySelector('.image-content-grid') as HTMLDivElement | null;

                if (!textGrid || !imageGrid) return; // Skip if grid containers missing

                const textAssets = profileAssets.filter(isTextAsset);
                const imageAssets = profileAssets.filter(isImageAsset);

                textGrid.innerHTML = textAssets.length > 0 ? '' : '<p>No text assets for this profile.</p>';
                imageGrid.innerHTML = imageAssets.length > 0 ? '' : '<p>No image assets for this profile.</p>';

                textAssets.forEach(asset => {
                    const cardElement = createAssetCard(asset, assetCardTemplate);
                    textGrid.appendChild(cardElement);
                });
                imageAssets.forEach(asset => {
                    const cardElement = createAssetCard(asset, assetCardTemplate);
                    imageGrid.appendChild(cardElement);
                });

                // Use the const variable
                displayArea.appendChild(groupElement);
            });
        })
        .catch(error => {
            log(1, 'Error loading assets:', error);
            // Use the const variable, checking again just in case
            if (displayArea) { 
                const message = error instanceof Error ? error.message : String(error);
                displayArea.innerHTML = `<p style="color: red;">Error loading assets: ${message}</p>`;
            }
        });
}

/** Type guard to check if an asset is a text asset */
function isTextAsset(asset: Asset): boolean {
    return (
        asset.contentType === 'text' || 
        asset.contentType?.startsWith('text/') || 
        asset.mimetype === 'text/plain' || 
        asset.mimetype === 'application/json' || 
        asset.sourceType === 'linkedin'
    );
}

/** Type guard to check if an asset is an image asset */
function isImageAsset(asset: Asset): boolean {
    // Add !! to coerce the result to a strict boolean
    return !!(
        asset.contentType === 'image' || 
        asset.contentType?.startsWith('image/') || 
        asset.mimetype?.startsWith('image/')
    );
}


/**
 * Create an asset card element
 * @param asset - The asset data
 * @param template - The card template element
 * @returns The created card element (HTMLElement)
 */
function createAssetCard(asset: Asset, template: HTMLTemplateElement): HTMLElement {
    const cardFragment = template.content.cloneNode(true) as DocumentFragment;
    const cardElement = cardFragment.firstElementChild as HTMLElement; // Get the root element from the fragment

    // Get card sub-elements (use type assertions cautiously)
    const typeSpan = cardElement.querySelector('.content-type') as HTMLSpanElement | null;
    const titleDiv = cardElement.querySelector('.content-title') as HTMLDivElement | null;
    const sourceDiv = cardElement.querySelector('.source') as HTMLDivElement | null;
    const dateDiv = cardElement.querySelector('.date') as HTMLDivElement | null;
    const previewDiv = cardElement.querySelector('.content-preview') as HTMLDivElement | null;
    const selectCheckbox = cardElement.querySelector('.content-select') as HTMLInputElement | null;
    const previewButton = cardElement.querySelector('.preview-button') as HTMLButtonElement | null;

    if (!typeSpan || !titleDiv || !sourceDiv || !dateDiv || !previewDiv || !selectCheckbox || !previewButton) {
        log(1, 'Card template is missing required elements', asset.id);
        // Return an empty div or similar fallback to prevent errors
        return document.createElement('div'); 
    }

    // Set content type
    if (isTextAsset(asset)) {
        typeSpan.textContent = 'Text';
        typeSpan.classList.add('text');
    } else if (isImageAsset(asset)) {
        typeSpan.textContent = 'Image';
        typeSpan.classList.add('image');
    } else {
        typeSpan.textContent = asset.mimetype || asset.contentType || 'Unknown';
    }

    // Set title
    const title = asset.fileName || asset.filename || asset.context || asset.metadata?.context || `Asset ${asset.id.substring(0, 8)}`;
    titleDiv.textContent = title;
    titleDiv.title = title; // Add tooltip

    // Set source
    let sourceText = asset.sourcePlatform || 'Unknown Platform';
    if (asset.sourceMedium) {
        sourceText += ` (${asset.sourceMedium})`;
    }
    if (asset.source) { // Add original URL if available (e.g., for scrapes)
        sourceText += `: ${asset.source}`;
    }
    sourceDiv.textContent = sourceText;
    sourceDiv.title = asset.source || sourceText; // Tooltip with URL or full text

    // Set date
    const createdDate = asset.createdAt || asset.metadata?.createdAt;
    dateDiv.textContent = createdDate ? new Date(createdDate).toLocaleDateString() : 'Unknown date';

    // Set preview
    previewDiv.innerHTML = ''; // Clear previous preview
    if (isTextAsset(asset)) {
        const textPreview = document.createElement('div');
        textPreview.className = 'text-preview';
        const isLinkedIn = asset.sourceType === 'linkedin' || asset.metadata?.sourceType === 'linkedin' || asset.fileName?.toLowerCase().includes('linkedin');
        if (isLinkedIn) {
            textPreview.textContent = 'LinkedIn Profile Data';
        } else {
            const previewText = asset.contentPreview || 
                              asset.extractedContent?.substring(0, 100) + (asset.extractedContent && asset.extractedContent.length > 100 ? '...' : '') || 
                              asset.metadata?.preview || 
                              (typeof asset.extractedContentLength === 'number' ? 
                                `Text content (${asset.extractedContentLength} chars)` : 
                                'No preview available');
            textPreview.textContent = previewText;
        }
        previewDiv.appendChild(textPreview);
    } else if (isImageAsset(asset)) {
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        const image = document.createElement('img');
        // Construct the potential paths for the image, prioritizing direct paths
        const paths = [
            // 1. Direct asset path (preferred)
            asset.filePath ? `/assets/${asset.filePath}` : undefined,
            // 2. Fallback using userId and fileName (less reliable)
            (asset.userId || state.currentUserId) && asset.fileName ? `/assets/${asset.userId || state.currentUserId}/${asset.fileName}` : undefined,
            // 3. Fallback using profileId (legacy?)
            (asset.profileId || asset.userId || state.currentUserId) && (asset.fileName || asset.filename) ? `/data/assets/${asset.profileId || asset.userId || state.currentUserId}/${asset.fileName || asset.filename}` : undefined,
             // 4. Explicit assetUrl if provided (might be external)
            asset.assetUrl
            // Removed API paths: /api/assets/${asset.id}/content and /preview
        ].filter((p): p is string => typeof p === 'string' && p.length > 0); // Filter out null/undefined/empty strings
        
        if (paths.length > 0) {
            loadImageWithFallbacks(image, paths, 0);
        } else {
            // If no valid path constructed, show fallback immediately
            image.src = PLACEHOLDER_IMAGE_URI;
            image.alt = 'Image path not found';
            image.style.width = '32px'; 
            image.style.height = '32px';
        }
        imagePreview.appendChild(image);
        previewDiv.appendChild(imagePreview);
    }

    // Set checkbox data and state
    selectCheckbox.dataset.assetId = asset.id;
    selectCheckbox.checked = state.selectedAssets.has(asset.id);
    // Add explicit null check and assign checked value to intermediate variable
    if (selectCheckbox) {
      const isChecked = selectCheckbox.checked; // Assign here
      cardElement.classList.toggle('selected', isChecked); // Use the variable
    }

    // Add checkbox listener
    selectCheckbox.addEventListener('change', () => {
        if (selectCheckbox.checked) {
            state.selectedAssets.add(asset.id);
            cardElement.classList.add('selected');
        } else {
            state.selectedAssets.delete(asset.id);
            cardElement.classList.remove('selected');
        }
        updateSelectionInfo();
    });

    // Add preview button listener
    previewButton.addEventListener('click', () => {
        previewAsset(asset);
    });

    return cardElement;
}


/**
 * Load an image with fallback paths if the primary path fails
 * @param imgElement - The image element to load
 * @param paths - Array of paths to try
 * @param index - The current path index
 */
function loadImageWithFallbacks(imgElement: HTMLImageElement, paths: string[], index: number): void {
    // Just use placeholder immediately and never try to load real images
    imgElement.onload = null;
    imgElement.onerror = null;
    
    // Set the placeholder image
    imgElement.src = PLACEHOLDER_IMAGE_URI;
    imgElement.alt = 'Image placeholder';
    imgElement.style.width = '32px';
    imgElement.style.height = '32px';
}

/**
 * Update the selection information UI
 */
function updateSelectionInfo(): void {
    if (!selectionSummarySpan) return;
    const count = state.selectedAssets.size;
    selectionSummarySpan.textContent = `${count} item${count === 1 ? '' : 's'} selected`;

    if (deleteSelectedButton) {
        deleteSelectedButton.disabled = count === 0;
    }

    // Dispatch event for personality module
    const event = new CustomEvent('assets-selection-changed', {
        detail: { count }
    });
    document.dispatchEvent(event);
}

/**
 * Select all text assets currently displayed
 */
function selectAllTextAssets(): void {
    document.querySelectorAll('.content-card .content-type.text').forEach(typeElement => {
        const card = typeElement.closest('.content-card') as HTMLElement | null;
        if (card) {
            const checkbox = card.querySelector('.content-select') as HTMLInputElement | null;
            const assetId = checkbox?.dataset.assetId;
            if (checkbox && assetId && !checkbox.checked) {
                checkbox.checked = true;
                state.selectedAssets.add(assetId);
                card.classList.add('selected');
            }
        }
    });
    updateSelectionInfo();
}

/**
 * Select all image assets currently displayed
 */
function selectAllImageAssets(): void {
    document.querySelectorAll('.content-card .content-type.image').forEach(typeElement => {
        const card = typeElement.closest('.content-card') as HTMLElement | null;
        if (card) {
            const checkbox = card.querySelector('.content-select') as HTMLInputElement | null;
            const assetId = checkbox?.dataset.assetId;
            if (checkbox && assetId && !checkbox.checked) {
                checkbox.checked = true;
                state.selectedAssets.add(assetId);
                card.classList.add('selected');
            }
        }
    });
    updateSelectionInfo();
}

/**
 * Deselect all assets currently displayed
 */
function deselectAllAssets(): void {
    document.querySelectorAll('.content-card .content-select').forEach(element => {
        const checkbox = element as HTMLInputElement;
        checkbox.checked = false;
        const card = checkbox.closest('.content-card');
        card?.classList.remove('selected');
    });
    state.selectedAssets.clear();
    updateSelectionInfo();
}

/**
 * Delete selected assets
 */
async function deleteSelectedAssets(): Promise<void> {
    if (state.selectedAssets.size === 0) {
        showStatus(uploadStatusDiv, 'No assets selected for deletion', 'info');
        return;
    }
    if (!state.currentUserId) {
        showStatus(uploadStatusDiv, 'No user selected', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${state.selectedAssets.size} asset(s)? This cannot be undone.`)) {
        return;
    }

    const currentUserId = state.currentUserId;
    const assetsToDelete = Array.from(state.selectedAssets); // Copy the set before clearing

    showStatus(uploadStatusDiv, `Deleting ${assetsToDelete.length} asset(s)...`, 'loading');
    log(3, `Deleting ${assetsToDelete.length} assets for user ${currentUserId}`);

    const deletePromises = assetsToDelete.map(assetId => 
        fetch(`/api/assets/${assetId}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    // Log individual errors but continue with others
                    response.json().then(err => log(1, `Failed to delete asset ${assetId}: ${err.error || response.status}`)).catch(() => {});
                    return { success: false, id: assetId }; 
                }
                log(4, `Successfully deleted asset ${assetId}`);
                return { success: true, id: assetId };
            })
            .catch(error => {
                log(1, `Network error deleting asset ${assetId}:`, error);
                return { success: false, id: assetId };
            })
    );

    try {
        const results = await Promise.all(deletePromises);
        const deletedCount = results.filter(r => r.success).length;
        const failedCount = assetsToDelete.length - deletedCount;

        log(3, `Deletion finished: ${deletedCount} succeeded, ${failedCount} failed for user ${currentUserId}`);

        if (failedCount > 0) {
            showStatus(uploadStatusDiv, `Deleted ${deletedCount} assets. Failed to delete ${failedCount}.`, 'error');
        } else {
            showStatus(uploadStatusDiv, `Successfully deleted ${deletedCount} asset(s)`, 'success', 3000);
        }

        // Clear selection ONLY for successfully deleted assets (state might have changed)
        results.filter(r => r.success).forEach(r => state.selectedAssets.delete(r.id));
        
        loadAssets(currentUserId); // Refresh assets list

    } catch (error) {
        // This catch is unlikely to be hit due to individual catches in map
        log(1, 'Unexpected error during bulk delete:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(uploadStatusDiv, `Error during deletion: ${message}`, 'error');
        loadAssets(currentUserId); // Still refresh assets
    }
}

/**
 * Preview an asset in a modal
 * @param asset - The asset to preview
 */
async function previewAsset(asset: Asset): Promise<void> {
    const previewModal = document.getElementById('preview-modal') as HTMLDivElement | null;
    const modalTitle = document.getElementById('modal-title') as HTMLElement | null;
    const modalBody = document.getElementById('modal-body') as HTMLDivElement | null;
    const closeModalButton = document.getElementById('close-modal') as HTMLSpanElement | null;

    if (!previewModal || !modalTitle || !modalBody || !closeModalButton) {
        log(1, 'Preview modal elements not found');
        return;
    }

    modalTitle.textContent = asset.fileName || asset.filename || asset.context || 'Asset Preview';
    modalBody.innerHTML = '<p>Loading preview...</p>'; // Clear and show loading
    previewModal.style.display = 'block';

    // Close on clicking outside the modal content
    previewModal.onclick = (event: MouseEvent) => {
        if (event.target === previewModal) {
            previewModal.style.display = 'none'; 
        }
    };

    try {
        // Fetch full content for preview
        const response = await fetch(`/api/assets/${asset.id}/content`);
        if (!response.ok) {
            throw new Error(`Failed to load asset content (${response.status})`);
        }

        // Handle based on type
        if (isImageAsset(asset)) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            modalBody.innerHTML = `<img src="${imageUrl}" alt="Asset Preview" style="max-width: 100%; max-height: 70vh; display: block; margin: auto;">`;
            
            const originalModalHandlerForRevoke = previewModal.onclick;

            // Override handlers to include revokeObjectURL
            closeModalButton.onclick = () => { 
                URL.revokeObjectURL(imageUrl);
                if (previewModal) previewModal.style.display = 'none'; // Ensure modal hides
            };
             previewModal.onclick = (event: MouseEvent) => {
                if (event.target === previewModal) {
                    URL.revokeObjectURL(imageUrl);
                    // Use .call() for original handler if it existed
                    if (typeof originalModalHandlerForRevoke === 'function') originalModalHandlerForRevoke.call(previewModal, event);
                } else {
                     if (typeof originalModalHandlerForRevoke === 'function') originalModalHandlerForRevoke.call(previewModal, event);
                }
            };

        } else { // Assume text-based
            const content = await response.text();
            const preElement = document.createElement('pre');
            preElement.style.whiteSpace = 'pre-wrap';
            preElement.style.wordBreak = 'break-word';
            preElement.style.maxHeight = '70vh';
            preElement.style.overflowY = 'auto';

            // Attempt to format if JSON
            let formattedContent = content;
            if (asset.mimetype === 'application/json' || asset.contentType === 'application/json' || asset.fileName?.endsWith('.json')) {
                 try {
                    formattedContent = JSON.stringify(JSON.parse(content), null, 2);
                } catch { /* Keep original text if parsing fails */ }
            }
            preElement.textContent = formattedContent;
            modalBody.innerHTML = ''; // Clear loading
            modalBody.appendChild(preElement);
        }

    } catch (error) {
        log(1, 'Error loading asset preview content:', error);
        const message = error instanceof Error ? error.message : String(error);
        modalBody.innerHTML = `<p style="color: red;">Error loading preview: ${message}</p>`;
    }
}

/**
 * Clear the entire content library for the current user
 */
async function clearContentLibrary(): Promise<void> {
    if (!state.currentUserId) {
        showStatus(clearLibraryStatusDiv, 'Please select a user first', 'error');
        return;
    }

    if (!confirm(`ARE YOU SURE you want to delete ALL assets and generated profiles for user '${state.currentUserId}'? This cannot be undone.`)) {
        return;
    }

    const currentUserId = state.currentUserId;
    showStatus(clearLibraryStatusDiv, 'Clearing content library...', 'loading');
    log(2, `Clearing content library for user ${currentUserId}`);

    try {
        const response = await fetch(`/api/users/${currentUserId}/clear-library`, { method: 'POST' });

        if (!response.ok) {
            let errorMsg = `Failed to clear library (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore */ }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        log(3, 'Clear library result:', result);

        showStatus(clearLibraryStatusDiv, 'Content library cleared successfully.', 'success', 3000);

        // Reset relevant state
        state.selectedAssets.clear();
        // if (state.currentBasePromptText) { // Potential reference
        //     state.currentBasePromptText = null;
        // }

        // Reload assets (which will show empty state)
        loadAssets(currentUserId);
        updateSelectionInfo(); // Update selection count display
        
        // Dispatch event so personality module clears its state too
        document.dispatchEvent(new CustomEvent('library-cleared', { detail: { userId: currentUserId } }));

    } catch (error) {
        log(1, 'Error clearing content library:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(clearLibraryStatusDiv, `Error clearing library: ${message}`, 'error');
    }
}

// The handleCharacterCardResponse function is removed as it duplicates functionality 
// that exists in promptModule.ts and contains multiple undefined references
// If this functionality is needed, it should be imported from promptModule.ts instead 