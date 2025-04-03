// === NEW DOM Elements (Matching Updated index.html) ===

// Declare variables globally with let
let userSelectDropdown, newUserInput, createUserButton, userStatusDiv, currentUserDisplaySpan;
let scrapeUrlInput, startScrapingButton, scrapeStatusDiv;
let uploadProfileIdInput, fileInputElement, uploadButton, uploadStatusDiv;
let assetDisplayArea, selectAllTextButton, selectAllImageButton, deselectAllButton, deleteSelectedButton, selectionSummarySpan;
let personalityPromptTextarea, savePromptButton, resetPromptButton, promptStatusDiv, generatePersonalityButton, personalityGenerationStatusDiv, personalityJsonOutputPre, copyJsonButton;
let chatPersonalityJsonPre, chatLoreInput, chatParamsInput, chatPsychStateInput, chatCogStyleInput, chatSystemPromptPre, chatHistoryDiv, chatInputElement, sendChatButton, clearChatButton, chatStatusDiv;
let tipiForm, tipiQuestionsContainer, submitUserAssessmentButton, retakeUserAssessmentButton, userAssessmentStatusDiv, runAIAssessmentButton, aiAssessmentStatusDiv, assessmentResultsArea, overallAlignmentSpan, dimensionAlignmentList, radarChartCanvas, runsPerItemInput, itemAgreementSpan;
let startUserAssessmentButton; // <-- Add this
let clearLibraryButton, clearLibraryStatusDiv;
let assetGroupTemplate, assetCardTemplate, previewModal, modalTitle, modalContent, closeModalButton;
let generateModule, chatModule, assessmentModule, chatContentArea;
// Add checkbox variables
let includeInteractionContextCheckbox, includePsychStateCheckbox, includeCogStyleCheckbox;

// === Global State ===
const selectedAssets = new Set(); // Keep track of selected asset IDs
let currentGeneratedProfile = null; // Store the latest generated JSON
let currentPersonalityPrompt = ''; // Store the current personality prompt text
let currentChatHistory = []; // Store chat messages { role: 'user'/'assistant', content: '...'}
let userTipiScores = null; // Store user scores { q1: score, q2: score, ... }
let aiTipiScores = null;   // Store AI average scores
let currentUserId = null; // Track the active user

// === Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
  // --- Assign DOM elements inside the listener ---
  userSelectDropdown = document.getElementById('user-select');
  newUserInput = document.getElementById('new-user-id');
  createUserButton = document.getElementById('create-user-button');
  userStatusDiv = document.getElementById('user-status');
  currentUserDisplaySpan = document.getElementById('current-user-display');

  scrapeUrlInput = document.getElementById('scrape-url');
  startScrapingButton = document.getElementById('start-scraping');
  scrapeStatusDiv = document.getElementById('scrape-status');
  
  // NOTE: uploadProfileIdInput doesn't seem to exist in the latest index.html, commenting out
  // uploadProfileIdInput = document.getElementById('upload-profile-id'); 
  fileInputElement = document.getElementById('file-input');
  uploadButton = document.getElementById('upload-button');
  uploadStatusDiv = document.getElementById('upload-status');

  assetDisplayArea = document.getElementById('asset-display-area');
  selectAllTextButton = document.getElementById('select-all-text-button');
  selectAllImageButton = document.getElementById('select-all-image-button');
  deselectAllButton = document.getElementById('deselect-all-button');
  deleteSelectedButton = document.getElementById('delete-selected-button');
  selectionSummarySpan = document.getElementById('selection-summary');

  personalityPromptTextarea = document.getElementById('personality-prompt');
  savePromptButton = document.getElementById('save-prompt-button');
  resetPromptButton = document.getElementById('reset-prompt-button');
  promptStatusDiv = document.getElementById('prompt-status');
  generatePersonalityButton = document.getElementById('generate-personality-button');
  personalityGenerationStatusDiv = document.getElementById('personality-generation-status');
  personalityJsonOutputPre = document.getElementById('personality-json-output');
  copyJsonButton = document.getElementById('copy-json-button');

  chatPersonalityJsonPre = document.getElementById('chat-personality-json');
  chatLoreInput = document.getElementById('chat-lore-input');
  chatParamsInput = document.getElementById('chat-params-input');
  chatPsychStateInput = document.getElementById('chat-psych-state-input'); // Assign again
  chatCogStyleInput = document.getElementById('chat-cog-style-input');
  chatSystemPromptPre = document.getElementById('chat-system-prompt');
  chatHistoryDiv = document.getElementById('chat-history');
  chatInputElement = document.getElementById('chat-input');
  sendChatButton = document.getElementById('send-chat-button');
  clearChatButton = document.getElementById('clear-chat-button');
  chatStatusDiv = document.getElementById('chat-status');

  tipiForm = document.getElementById('tipi-form');
  tipiQuestionsContainer = document.getElementById('tipi-questions');
  submitUserAssessmentButton = document.getElementById('submit-user-assessment');
  retakeUserAssessmentButton = document.getElementById('retake-user-assessment');
  startUserAssessmentButton = document.getElementById('start-user-assessment'); // <-- Add this assignment
  userAssessmentStatusDiv = document.getElementById('user-assessment-status');
  runAIAssessmentButton = document.getElementById('run-ai-assessment'); // Assignment moved here
  aiAssessmentStatusDiv = document.getElementById('ai-assessment-status');
  assessmentResultsArea = document.getElementById('assessment-results-area');
  overallAlignmentSpan = document.getElementById('overall-alignment');
  dimensionAlignmentList = document.getElementById('dimension-alignment-list');
  radarChartCanvas = document.getElementById('radar-chart');
  runsPerItemInput = document.getElementById('runs-per-item'); 
  itemAgreementSpan = document.getElementById('item-agreement'); 

  // NOTE: Reset session button/module not fully defined in provided HTML, commenting out related elements
  // resetSessionButton = document.getElementById('reset-session-button'); 
  clearLibraryButton = document.getElementById('clear-library-button'); // This is the old reset button, now delete user
  clearLibraryStatusDiv = document.getElementById('clear-library-status');

  assetGroupTemplate = document.getElementById('asset-group-template');
  assetCardTemplate = document.getElementById('asset-card-template');
  previewModal = document.getElementById('preview-modal');
  modalTitle = document.getElementById('modal-title');
  modalContent = document.getElementById('modal-content');
  closeModalButton = document.getElementById('close-modal');

  generateModule = document.getElementById('generate-module'); 
  chatModule = document.getElementById('chat-module');
  assessmentModule = document.getElementById('assessment-module');
  chatContentArea = document.getElementById('chat-content-area');
  // --- End DOM element assignments ---

  // --- Assign DOM elements ---
  // ... other assignments ...
  includeInteractionContextCheckbox = document.getElementById('include-interaction-context');
  includePsychStateCheckbox = document.getElementById('include-psych-state');
  includeCogStyleCheckbox = document.getElementById('include-cog-style');
  // ... other assignments ...

  // Initial setup on page load
  loadUserList(); // Load existing users first
  // Disable content modules initially
  setModuleEnabled('collect-module', false);
  setModuleEnabled('manage-module', false); // Need ID for Module 2 - Assume it exists or add it
  setModuleEnabled('generate-module', false);
  setModuleEnabled('chat-module', false);
  setModuleEnabled('assessment-module', false);
  
  // Other setup
  loadPersonalityPrompt(); // Still load default prompt text
  setupModal();
  updateChatSystemPrompt();
  updateAssessmentUI(); 

  // --- Attach Event Listeners ---
  // Module 0 Listeners
  userSelectDropdown?.addEventListener('change', handleUserSelect);
  createUserButton?.addEventListener('click', handleCreateUser);
  
  // Module 1 Listeners
  startScrapingButton?.addEventListener('click', handleScrape);
  uploadButton?.addEventListener('click', handleUpload);
  
  // Module 2 Listeners
  assetDisplayArea?.addEventListener('change', handleAssetSelectionChange);
  assetDisplayArea?.addEventListener('click', handleAssetAreaClick);
  selectAllTextButton?.addEventListener('click', selectAllTextAssets);
  selectAllImageButton?.addEventListener('click', selectAllImageAssets);
  deselectAllButton?.addEventListener('click', deselectAllAssets);
  deleteSelectedButton?.addEventListener('click', deleteSelectedAssets);
  
  // Module 3 Listeners
  savePromptButton?.addEventListener('click', savePersonalityPrompt);
  resetPromptButton?.addEventListener('click', resetPersonalityPrompt);
  generatePersonalityButton?.addEventListener('click', generatePersonalityProfile);
  copyJsonButton?.addEventListener('click', copyGeneratedJson);
  
  // Module 4 Listeners
  sendChatButton?.addEventListener('click', sendChatMessage);
  chatInputElement?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
      e.preventDefault(); // Prevent default newline insertion
          sendChatMessage();
        }
      });
  clearChatButton?.addEventListener('click', clearChat);
  chatLoreInput?.addEventListener('input', updateChatSystemPrompt); 
  chatParamsInput?.addEventListener('input', updateChatSystemPrompt); 
  chatPsychStateInput?.addEventListener('input', debouncedSaveContext); // Add back debounced save
  chatCogStyleInput?.addEventListener('input', debouncedSaveContext); 
  
  // Module 5 Listeners
  tipiForm?.addEventListener('submit', handleUserAssessmentSubmit);
  retakeUserAssessmentButton?.addEventListener('click', handleRetakeAssessment);
  runAIAssessmentButton?.addEventListener('click', handleRunAIAssessment);
  startUserAssessmentButton?.addEventListener('click', handleStartAssessment); // <-- Add listener
  
  // Old Reset/Delete User Listener
  clearLibraryButton?.addEventListener('click', clearContentLibrary); 

  // Debounced save listeners for original context fields (ensure they use debounce too)
  chatLoreInput?.addEventListener('input', debouncedSaveContext); 
  chatParamsInput?.addEventListener('input', debouncedSaveContext); 
  chatPsychStateInput?.addEventListener('input', debouncedSaveContext); // Add back listener
  chatCogStyleInput?.addEventListener('input', debouncedSaveContext);
  
  // === Info Tooltip Button Logic ===
  setupInfoButtons(); // Call the setup function after DOM is loaded

  // Add listeners to checkboxes to update prompt when changed
  includeInteractionContextCheckbox?.addEventListener('change', updateChatSystemPrompt);
  includePsychStateCheckbox?.addEventListener('change', updateChatSystemPrompt);
  includeCogStyleCheckbox?.addEventListener('change', updateChatSystemPrompt);

  // Listeners for context textareas (to update prompt AND save)
  chatLoreInput?.addEventListener('input', () => { updateChatSystemPrompt(); debouncedSaveContext(); });
  chatParamsInput?.addEventListener('input', () => { updateChatSystemPrompt(); debouncedSaveContext(); }); 
  chatPsychStateInput?.addEventListener('input', () => { updateChatSystemPrompt(); debouncedSaveContext(); }); 
  chatCogStyleInput?.addEventListener('input', () => { updateChatSystemPrompt(); debouncedSaveContext(); });
});

// === Functions ===

// --- Initialization & Setup ---

function setupModal() {
    if (closeModalButton) {
        closeModalButton.onclick = () => {
            previewModal.style.display = "none";
        }
    }
    // Close modal if user clicks outside the content area
    window.onclick = (event) => {
        if (event.target == previewModal) {
            previewModal.style.display = "none";
        }
    }
}

async function loadPersonalityPrompt() {
    showStatus(promptStatusDiv, 'Loading prompt...', 'loading');
    try {
        // TODO: Implement GET /api/prompt/personality endpoint
        // For now, using a hardcoded default
        const defaultPrompt = `You are an expert psychoanalyst and personality psychologist tasked with crafting a detailed computational representation ("Digital Persona Profile") of an individual's psychological identity, based on a representative set of their provided content.

You recognize that personality encompasses both conscious expression and unconscious characteristics. Your objective is to capture the core psychological patterns, reliably inferring stable personality dimensions, values, style, beliefs, and motivations from the content.

Ground your generation in established psychological frameworks—particularly the Big Five personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)—and clearly identify distinctive communication styles, recurring interests, enduring values, expertise areas, core beliefs, and future-oriented visions.

Based strictly and accurately on the content provided within the <assets></assets> tags, produce a comprehensive, structured JSON suitable for high-fidelity AI personality simulations, ensuring it generalizes well both within and outside provided contexts.

CONTENT:
<assets>
[CONTENT HERE]
</assets>

DIGITAL PERSONA PROFILE (JSON OUTPUT):
#####
{
  "big_five_traits": {
    "openness": "[high/medium/low]",
    "conscientiousness": "[high/medium/low]",
    "extraversion": "[high/medium/low]",
    "agreeableness": "[high/medium/low]",
    "neuroticism": "[high/medium/low]"
  },
  "interests": ["distinct recurring topics/interests identified"],
  "traits": ["descriptive, stable personality adjectives"],
  "values": ["fundamental principles guiding their judgments"],
  "expertise": ["specific knowledge areas and proven skillsets"],
  "philosophical_beliefs": ["explicitly stated or implied philosophical perspectives"],
  "vision_for_future": ["long-term aspirations, goals, or speculative ideas"],
  "communication_style": {
    "tone": "[dominant emotional tone, e.g., reflective, optimistic, analytical]",
    "formality": "[high/medium/low]",
    "complexity": "[high/medium/low]",
    "humor": "[style and frequency, e.g., subtle, frequent, intellectual]"
  },
  "representative_statements": [
    "Short, characteristic quotes illustrating their personality"
  ]
}
#####`;
        currentPersonalityPrompt = defaultPrompt;
        personalityPromptTextarea.value = currentPersonalityPrompt;
        showStatus(promptStatusDiv, 'Default prompt loaded.', 'success'); // Indicate default was loaded
  } catch (error) {
        console.error("Error loading personality prompt:", error);
        showStatus(promptStatusDiv, `Error loading prompt: ${error.message}`, 'error');
        // Fallback already handled by setting default prompt above
    }
}

// --- Asset Loading & Display (NEW IMPLEMENTATION) ---

async function loadAssets(userIdToLoad = null) {
    const targetUserId = userIdToLoad || currentUserId;
    console.log(`Loading assets for user: ${targetUserId || 'All (Fallback)'}`);
    assetDisplayArea.innerHTML = '<p>Loading assets...</p>';
    selectedAssets.clear(); // Clear selection when reloading
    updateSelectionUI();

    if (!targetUserId) {
        assetDisplayArea.innerHTML = '<p>Select a User Profile to load assets.</p>';
        setModuleEnabled('manage-module', false); // Disable asset management if no user
        return;
    }
    
    setModuleEnabled('manage-module', true); // Enable asset management

    try {
        const response = await fetch(`/api/assets?userId=${encodeURIComponent(targetUserId)}`); // Fetch all assets initially
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const groupedAssets = await response.json(); // Expects { images: [], text: [], other: [] }

        // Further process the response to group by profile ID
        const assetsByProfile = {};
        const allAssetsList = [...(groupedAssets.images || []), ...(groupedAssets.text || []), ...(groupedAssets.other || [])];
        
        allAssetsList.forEach(asset => {
            const profileId = asset.metadata?.userId || 'unknown_profile';
            if (profileId === targetUserId) {
                if (!assetsByProfile[profileId]) {
                    assetsByProfile[profileId] = { images: [], text: [], other: [] };
                }
                if (asset.mimetype?.startsWith('image/')) {
                    assetsByProfile[profileId].images.push(asset);
                } else if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
                    assetsByProfile[profileId].text.push(asset);
                }
            } else {
                console.warn(`Asset ${asset.id} has incorrect userId ${profileId}, expected ${targetUserId}. Filtering out.`);
            }
        });

        assetDisplayArea.innerHTML = ''; // Clear loading message

        if (Object.keys(assetsByProfile).length === 0) {
            assetDisplayArea.innerHTML = `<p>No content found for user '${targetUserId}'. Use Step 1 to collect content.</p>`;
            return;
        }

        // Sort profile IDs alphabetically (optional)
        const sortedProfileIds = Object.keys(assetsByProfile).sort();

        // Create and append asset groups for each profile ID
        for (const profileId of sortedProfileIds) {
            const groupData = assetsByProfile[profileId];
            // Only create a group if it has text or image assets
            if (groupData.text.length > 0 || groupData.images.length > 0) {
                 const groupElement = createAssetGroupElement(profileId, groupData);
                 assetDisplayArea.appendChild(groupElement);
            }
        }

    } catch (error) {
        console.error("Error loading assets:", error);
        assetDisplayArea.innerHTML = `<p class="error">Error loading assets: ${error.message}</p>`;
    }
}

function createAssetGroupElement(profileId, groupData) {
    if (!assetGroupTemplate) {
        console.error("Asset group template not found!");
        return document.createElement('div'); // Return empty div to prevent errors
    }
    const template = assetGroupTemplate.content.cloneNode(true);
    const groupDiv = template.querySelector('.asset-group');
    groupDiv.dataset.profileId = profileId;
    template.querySelector('.profile-id-display').textContent = profileId;

    const textGrid = template.querySelector('.text-content-grid');
    const imageGrid = template.querySelector('.image-content-grid');

    textGrid.innerHTML = ''; // Clear placeholder
    if (groupData.text.length > 0) {
        // Sort text assets by date, newest first (optional)
        groupData.text.sort((a, b) => new Date(b.metadata?.createdAt || 0) - new Date(a.metadata?.createdAt || 0));
        groupData.text.forEach(asset => textGrid.appendChild(createAssetCardElement(asset)));
    } else {
        textGrid.innerHTML = '<p class="empty-grid-message">No text assets for this profile.</p>';
    }

    imageGrid.innerHTML = ''; // Clear placeholder
    if (groupData.images.length > 0) {
         // Sort image assets by date, newest first (optional)
        groupData.images.sort((a, b) => new Date(b.metadata?.createdAt || 0) - new Date(a.metadata?.createdAt || 0));
        groupData.images.forEach(asset => imageGrid.appendChild(createAssetCardElement(asset)));
    } else {
        imageGrid.innerHTML = '<p class="empty-grid-message">No image assets for this profile.</p>';
    }

    return template; // Return the DocumentFragment containing the group
}

function createAssetCardElement(asset) {
    if (!assetCardTemplate) {
         console.error("Asset card template not found!");
         return document.createElement('div'); // Return empty div
    }
    const template = assetCardTemplate.content.cloneNode(true);
    const card = template.querySelector('.content-card');
    card.dataset.assetId = asset.id;

    const typeSpan = card.querySelector('.content-type');
    const titleDiv = card.querySelector('.content-title');
    const sourceDiv = card.querySelector('.source');
    const dateDiv = card.querySelector('.date');
    const checkbox = card.querySelector('.content-select');
    const previewButton = card.querySelector('.preview-button');
    // const previewContainer = card.querySelector('.content-preview'); // Preview content loaded into modal now

    let assetType = 'other';
    if (asset.mimetype?.startsWith('image/')) {
        assetType = 'image';
    } else if (asset.mimetype === 'text/plain' || asset.mimetype === 'application/json') {
        assetType = 'text';
    }

    typeSpan.textContent = assetType;
    typeSpan.className = `content-type ${assetType}`; // Add class for styling

    let displayFilename = asset.filename || 'Unnamed Asset';
    if (displayFilename.length > 30) { // Adjust length as needed
        displayFilename = displayFilename.substring(0, 27) + '...';
    }
    titleDiv.textContent = displayFilename;
    titleDiv.title = asset.filename || 'Unnamed Asset'; // Full name on hover

    let sourceText = 'Upload';
    if (asset.metadata?.sourceUrl) {
        try { sourceText = new URL(asset.metadata.sourceUrl).hostname; } catch { sourceText = asset.metadata.sourceUrl; }
    } else if (asset.metadata?.context) {
        sourceText = asset.metadata.context;
    }
    sourceDiv.textContent = `Source: ${sourceText}`;
    sourceDiv.title = asset.metadata?.sourceUrl || sourceText; // Show full URL on hover if available
    
    dateDiv.textContent = `Date: ${new Date(asset.metadata?.createdAt || Date.now()).toLocaleDateString()}`;

    checkbox.dataset.assetId = asset.id;
    checkbox.checked = selectedAssets.has(asset.id); // Reflect current selection state
    if (checkbox.checked) card.classList.add('selected');

    previewButton.dataset.assetId = asset.id;
    previewButton.dataset.assetType = assetType;
    previewButton.dataset.assetFilename = asset.filename || 'Unnamed Asset'; // Store filename for modal title

    return template; // Return the DocumentFragment containing the card
}


// --- Asset Selection & Actions (Updated Implementation) ---

function handleAssetSelectionChange(event) {
    if (event.target.classList.contains('content-select')) {
        const checkbox = event.target;
        const assetId = checkbox.dataset.assetId;
        const card = checkbox.closest('.content-card');
        if (assetId && card) {
            if (checkbox.checked) {
                selectedAssets.add(assetId);
                card.classList.add('selected');
          } else {
                selectedAssets.delete(assetId);
                card.classList.remove('selected');
            }
            updateSelectionUI();
            setModuleEnabled('generate-module', selectedAssets.size > 0); // Enable/disable Generate module
        }
    }
}

function selectAllTextAssets() {
    let changed = false;
    document.querySelectorAll('#asset-display-area .content-card').forEach(card => {
        const typeSpan = card.querySelector('.content-type');
        const checkbox = card.querySelector('.content-select');
        if (typeSpan && checkbox && typeSpan.classList.contains('text') && !checkbox.checked) {
            checkbox.checked = true;
            const assetId = checkbox.dataset.assetId;
            selectedAssets.add(assetId);
            card.classList.add('selected');
            changed = true;
        }
    });
    if (changed) {
        updateSelectionUI();
        setModuleEnabled('generate-module', selectedAssets.size > 0);
    }
}

function selectAllImageAssets() {
    let changed = false;
    document.querySelectorAll('#asset-display-area .content-card').forEach(card => {
        const typeSpan = card.querySelector('.content-type');
        const checkbox = card.querySelector('.content-select');
        if (typeSpan && checkbox && typeSpan.classList.contains('image') && !checkbox.checked) {
            checkbox.checked = true;
            const assetId = checkbox.dataset.assetId;
            selectedAssets.add(assetId);
            card.classList.add('selected');
            changed = true;
        }
    });
    if (changed) {
        updateSelectionUI();
        setModuleEnabled('generate-module', selectedAssets.size > 0);
    }
}

function deselectAllAssets() {
    let changed = false;
    document.querySelectorAll('#asset-display-area .content-select').forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            const assetId = checkbox.dataset.assetId;
            const card = checkbox.closest('.content-card');
            selectedAssets.delete(assetId);
             if (card) card.classList.remove('selected');
             changed = true;
        }
    });
    if (changed) {
        updateSelectionUI();
        setModuleEnabled('generate-module', selectedAssets.size > 0);
    }
}

async function deleteSelectedAssets() {
    if (selectedAssets.size === 0) {
        alert("No assets selected to delete.");
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the ${selectedAssets.size} selected asset(s)? This cannot be undone.`)) {
        return;
    }

    console.log("Deleting assets:", Array.from(selectedAssets));
    // Find a suitable status area, maybe near the delete button or a general one
    const statusArea = selectionSummarySpan; // Using selection summary temporarily
    showStatus(statusArea, `Deleting ${selectedAssets.size} assets...`, 'loading');

    let successCount = 0;
    let failureCount = 0;
    const assetIdsToDelete = Array.from(selectedAssets);

    for (const assetId of assetIdsToDelete) {
        try {
            const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
            // No need to parse JSON if DELETE is successful (usually 204 No Content or 200 OK)
            if (response.ok) {
                console.log(`Successfully deleted asset ${assetId}`);
                selectedAssets.delete(assetId);
                const cardToRemove = assetDisplayArea.querySelector(`.content-card[data-asset-id="${assetId}"]`);
                if (cardToRemove) {
                    // Optional: Add a fade-out effect before removing
                    cardToRemove.style.transition = 'opacity 0.5s ease';
                    cardToRemove.style.opacity = '0';
                    setTimeout(() => cardToRemove.remove(), 500);
                }
                successCount++;
      } else {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                console.error(`Failed to delete asset ${assetId}:`, errorData.error || response.statusText);
                failureCount++;
                // Mark card as error? (optional)
                 const cardWithError = assetDisplayArea.querySelector(`.content-card[data-asset-id="${assetId}"]`);
                 if(cardWithError) cardWithError.classList.add('error-delete'); // Add a class for styling
            }
  } catch (error) {
            console.error(`Network/Request error during deletion for asset ${assetId}:`, error);
            failureCount++;
             const cardWithError = assetDisplayArea.querySelector(`.content-card[data-asset-id="${assetId}"]`);
             if(cardWithError) cardWithError.classList.add('error-delete');
        }
    }

    updateSelectionUI(); // Update count and button states
    setModuleEnabled('generate-module', selectedAssets.size > 0);

    let message = `Deleted ${successCount} asset(s).`;
    let statusType = 'success';
    if (failureCount > 0) {
        message += ` Failed to delete ${failureCount} asset(s). Check console for details.`;
        statusType = failureCount === assetIdsToDelete.length ? 'error' : 'warning'; // error if all failed, warning if partial
    }
    showStatus(statusArea, message, statusType);

    // Optional: Reload assets if cards were just marked with error instead of removed
    // setTimeout(loadAssets, 2000);
}


function handleAssetAreaClick(event) {
    // Handle clicks on preview buttons within the asset area
    if (event.target.classList.contains('preview-button')) {
        handlePreviewClick(event.target); // Pass the button element itself
    }
    // Add other delegated handlers if needed (e.g., describe button)
}

function updateSelectionUI() {
    selectionSummarySpan.textContent = `${selectedAssets.size} items selected`;
    deleteSelectedButton.disabled = selectedAssets.size === 0;
    // Enable generate button ONLY if a user is selected AND assets are selected
    setModuleEnabled('generate-module', currentUserId && selectedAssets.size > 0); 
}

// --- Preview Modal (NEW IMPLEMENTATION) ---
async function handlePreviewClick(button) {
    const assetId = button.dataset.assetId;
    const assetType = button.dataset.assetType;
    const assetFilename = button.dataset.assetFilename || 'Asset';
    
    if (!assetId || !assetType) {
        console.error("Preview button missing necessary data attributes (assetId, assetType)");
    return;
  }

    console.log(`Preview requested for asset: ${assetId}, type: ${assetType}`);

    modalTitle.textContent = `Preview: ${assetFilename}`; // Use filename in title
    modalContent.innerHTML = '<p>Loading preview...</p>';
    previewModal.style.display = 'block';

    try {
        // Fetch content using the /content endpoint
        const response = await fetch(`/api/assets/${assetId}/content`);
    if (!response.ok) {
            let errorText = `Failed to fetch content (${response.status})`;
            try { 
                const errorData = await response.json();
                errorText = errorData.error || errorText;
            } catch { /* ignore json parsing error */ }
            throw new Error(errorText);
        }

        if (assetType === 'image') {
            // For images, get the blob and display
            const blob = await response.blob();
            // Check if blob is empty or invalid type (sometimes servers return error pages as blobs)
            if (!blob || blob.size === 0 || !blob.type.startsWith('image/')){
                 throw new Error('Invalid image data received.');
            }
            const objectURL = URL.createObjectURL(blob);
            modalContent.innerHTML = `<img src="${objectURL}" style="max-width: 100%; max-height: 70vh; display: block; margin: auto;" alt="Preview for ${assetId}">`;
            // Add cleanup for object URL when modal closes
            closeModalButton.onclick = () => {
                URL.revokeObjectURL(objectURL);
                previewModal.style.display = "none";
            };
            window.onclick = (event) => {
                if (event.target == previewModal) {
                    URL.revokeObjectURL(objectURL);
                    previewModal.style.display = "none";
                }
            }

        } else if (assetType === 'text') {
            // For text, display the text content
            const text = await response.text();
             let formattedContent = text;
             // Attempt to pretty-print if it looks like JSON
             if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                 try { formattedContent = JSON.stringify(JSON.parse(text), null, 2); } catch { /* ignore parse error */ }
             }
            modalContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word;">${formattedContent}</pre>`;
             // Reset modal close handler to default if it was changed by image
             setupModal(); 
  } else {
             modalContent.innerHTML = '<p>Preview not available for this asset type.</p>';
              setupModal();
        }

    } catch (error) {
        console.error('Error loading preview content:', error);
        modalContent.innerHTML = `<p class="error">Error loading preview: ${error.message}</p>`;
        setupModal(); // Ensure close handler is set even on error
    }
}


// --- Module 1: Content Collection Functions ---
async function handleUpload() {
    if (!currentUserId) {
        showStatus(uploadStatusDiv, "Please select or create a User first.", "error");
        return;
    }
    const files = fileInputElement.files;
    if (!files || files.length === 0) {
        showStatus(uploadStatusDiv, 'Please select at least one file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('personId', currentUserId);
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }

    showStatus(uploadStatusDiv, `Uploading ${files.length} file(s)...`, 'loading');
    uploadButton.disabled = true;

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (response.ok || response.status === 207) {
            showStatus(uploadStatusDiv, data.message || 'Upload complete.', response.ok ? 'success' : 'warning');
            if (data.results && Array.isArray(data.results)) {
                const failedFiles = data.results.filter(r => r.error);
                if (failedFiles.length > 0) {
                    console.warn('Some files failed to upload:', failedFiles);
                }
            }
            fileInputElement.value = '';
            setTimeout(loadAssets, 1500);
        } else {
            showStatus(uploadStatusDiv, `Error: ${data.error || 'Upload failed'}`, 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(uploadStatusDiv, `Upload Error: ${error.message}`, 'error');
    } finally {
        uploadButton.disabled = false;
    }
}

async function handleScrape() {
    if (!currentUserId) {
        showStatus(scrapeStatusDiv, "Please select or create a User first.", "error");
        return;
    }
    const url = scrapeUrlInput.value.trim();
    if (!url) {
        showStatus(scrapeStatusDiv, 'Please fill in the URL', 'error');
        return;
    }
    
    showStatus(scrapeStatusDiv, 'Starting website scraping...', 'loading');
    startScrapingButton.disabled = true;

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, userId: currentUserId })
        });
        const data = await response.json();

        if (response.status === 202) {
            showStatus(scrapeStatusDiv, data.message || 'Scraping initiated.', 'loading');
            startStatusPolling();
        } else {
            throw new Error(data.error || `Failed to start scraping (${response.status})`);
        }
    } catch (error) {
        console.error('Error sending scrape request:', error);
        showStatus(scrapeStatusDiv, `Scrape Error: ${error.message}`, 'error');
        startScrapingButton.disabled = false;
    }
}

function startStatusPolling() {
    let statusInterval = null;
    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;
    const POLLING_INTERVAL_MS = 5000;
    const TIMEOUT_MS = 30 * 60 * 1000;

    const poll = async () => {
        try {
            const response = await fetch('/api/scrape/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            consecutiveErrors = 0;
            if (data.status === 'in_progress') {
                let statusMessage = `Scraping: ${data.pagesVisited || 0} pages visited, ${data.imagesFound || 0} images found`;
                if (data.currentDuration) statusMessage += ` (${data.currentDuration})`;
                showStatus(scrapeStatusDiv, statusMessage, 'loading');
            } else if (data.status === 'completed') {
                showStatus(scrapeStatusDiv, `Scraping completed! Visited ${data.summary?.pagesVisited || 0} pages. Found ${data.summary?.textAssetsCreated || 0} text, ${data.summary?.imagesFound || 0} images. Duration: ${data.summary?.duration || 'N/A'}.`, 'success');
                stopPolling();
                setTimeout(loadAssets, 1000);
            } else if (data.status === 'error' || data.error) {
                 showStatus(scrapeStatusDiv, `Scraping failed: ${data.error || 'Unknown error'}`, 'error');
                 stopPolling();
            } else if (data.status === 'idle') {
                 showStatus(scrapeStatusDiv, 'Scraping process ended or was interrupted.', 'warning');
                 stopPolling();
                 setTimeout(loadAssets, 1000);
            } else {
                 console.warn('Unknown scrape status received:', data);
                 showStatus(scrapeStatusDiv, `Scraping status: ${data.status || 'Unknown'}...`, 'loading');
            }
        } catch (error) {
            console.error('Error polling scrape status:', error);
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_ERRORS) {
                showStatus(scrapeStatusDiv, 'Error checking scrape status. Please check server logs.', 'error');
                stopPolling();
            }
        }
    };
    const stopPolling = () => {
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
            startScrapingButton.disabled = false;
            console.log("Stopped polling scrape status.");
        }
    };
    if (window.scrapePollInterval) clearInterval(window.scrapePollInterval);
    statusInterval = setInterval(poll, POLLING_INTERVAL_MS);
    window.scrapePollInterval = statusInterval;
    setTimeout(stopPolling, TIMEOUT_MS);
    poll();
}

// --- Module 3: Personality Generation Functions ---

async function savePersonalityPrompt() {
    if (!currentUserId) {
        showStatus(promptStatusDiv, "Select a User first to save prompt.", "error");
        return;
    }
    const newPrompt = personalityPromptTextarea.value;
    showStatus(promptStatusDiv, 'Saving prompt...', 'loading');
    try {
        // Call PUT /api/users/:userId to save
        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generation: { customPrompt: newPrompt } })
        });
         if (!response.ok) {
             const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
             throw new Error(errorData.error || `Failed to save prompt (${response.status})`);
         }
        currentPersonalityPrompt = newPrompt; // Update local state on success
        showStatus(promptStatusDiv, 'Prompt saved successfully!', 'success');
    } catch (error) {
        console.error("Error saving personality prompt:", error);
        showStatus(promptStatusDiv, `Error saving prompt: ${error.message}`, 'error');
    }
}

async function resetPersonalityPrompt() {
    if (!currentUserId) {
        showStatus(promptStatusDiv, "Select a User first.", "error");
        return;
    }
    if (confirm("Are you sure you want to reset the prompt to its default?")) {
        const defaultPrompt = getDefaultPersonalityPrompt();
        personalityPromptTextarea.value = defaultPrompt;
        await savePersonalityPrompt(); // Save the default prompt back
    }
}

async function generatePersonalityProfile() {
    if (!currentUserId) {
        showStatus(personalityGenerationStatusDiv, "Please select or create a User first.", "error");
        return;
    }
    if (selectedAssets.size === 0) {
        showStatus(personalityGenerationStatusDiv, 'Please select at least one asset', 'error');
        return;
    }
    generatePersonalityButton.disabled = true;
    showStatus(personalityGenerationStatusDiv, 'Generating personality profile...', 'loading');
    personalityJsonOutputPre.textContent = 'Generating...';
    copyJsonButton.style.display = 'none';
    // Disable later modules until success
    setModuleEnabled('chat-module', false);
    setModuleEnabled('assessment-module', false);

    try {
        const response = await fetch('/api/personality/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                assetIds: Array.from(selectedAssets),
                prompt: personalityPromptTextarea.value
            })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            currentGeneratedProfile = data.personalityJSON;
            personalityJsonOutputPre.textContent = JSON.stringify(currentGeneratedProfile, null, 2);
            showStatus(personalityGenerationStatusDiv, 'Personality profile generated successfully!', 'success');
            copyJsonButton.style.display = 'inline-block';
            personalityJsonOutputPre.style.display = 'block'; // Make the output visible
            updateChatSystemPrompt();
            // Enable downstream modules on success
            setModuleEnabled('chat-module', true);
            setModuleEnabled('assessment-module', true);
            updateAssessmentUI(); // Update assessment button state too
        } else {
            throw new Error(data.error || `Failed to generate profile (${response.status})`);
        }
    } catch (error) {
        console.error('Error generating personality profile:', error);
        showStatus(personalityGenerationStatusDiv, `Generation Error: ${error.message}`, 'error');
        personalityJsonOutputPre.textContent = `Error: ${error.message}`;
    } finally {
        // Re-enable generate button if assets still selected
        setModuleEnabled('generate-module', selectedAssets.size > 0);
    }
}

function copyGeneratedJson() {
    if (!currentGeneratedProfile) {
        alert("No profile generated yet to copy.");
        return;
    }
    const jsonString = personalityJsonOutputPre.textContent;
    copyToClipboard(jsonString, copyJsonButton);
}

// --- Module 4: Chat Functions ---

function updateChatSystemPrompt() {
    // Display generated personality separately
    if (chatPersonalityJsonPre) {
        chatPersonalityJsonPre.textContent = currentGeneratedProfile
            ? JSON.stringify(currentGeneratedProfile, null, 2)
            : "(No Digital Persona Profile generated yet - Step 3)";
        chatPersonalityJsonPre.style.display = currentGeneratedProfile ? 'block' : 'none';
    }

    // Helper function to safely parse JSON or return raw text with error indication
    const parseContextInput = (inputElement, fieldName) => {
        if (!inputElement) return `(${fieldName} input element not found)`;
        const text = inputElement.value.trim();
        if (!text) return `(No ${fieldName} provided)`;
        try {
            const parsed = JSON.parse(text);
            inputElement.style.border = "1px solid #ddd"; // Reset border on success
            return JSON.stringify(parsed, null, 2); // Return formatted JSON
        } catch (e) {
            inputElement.style.border = "1px solid red"; // Indicate invalid JSON
            return `(Invalid JSON in ${fieldName} - Using raw text):
${text}`;
        }
    };

    // Construct the final system prompt using the new structure
    let finalPrompt = `You are the Digital Twin of the user. You must respond consistently and convincingly in alignment with your "Digital Persona Profile" and the provided simulation context. Your behavior, speech, and decision-making should authentically mirror your persona attributes, ensuring interactions feel psychologically realistic, nuanced, and faithful to your core identity.

Your core attributes are defined here:

`;

    finalPrompt += "==============================\n";
    finalPrompt += "📌 DIGITAL PERSONA PROFILE:\n";
    finalPrompt += "==============================\n";
    finalPrompt += currentGeneratedProfile ? JSON.stringify(currentGeneratedProfile, null, 2) : "(Not Generated - Use Step 3)";
    finalPrompt += "\n\n";

    finalPrompt += "==============================\n";
    finalPrompt += "📖 PERSONAL BACKGROUND CONTEXT:\n";
    finalPrompt += "==============================\n";
    finalPrompt += parseContextInput(chatLoreInput, "Personal Background Context");
    finalPrompt += "\n\n";

    // Conditionally add Interaction Context
    if (includeInteractionContextCheckbox?.checked) {
        finalPrompt += "==============================\n";
        finalPrompt += "🌐 INTERACTION CONTEXT:\n";
        finalPrompt += "==============================\n";
        finalPrompt += parseContextInput(chatParamsInput, "Interaction Context");
        finalPrompt += "\n\n";
    }

    // Conditionally add Psychological State
    if (includePsychStateCheckbox?.checked) {
        finalPrompt += "==============================\n";
        finalPrompt += "🌤️ CURRENT PSYCHOLOGICAL STATE:\n";
        finalPrompt += "==============================\n";
        finalPrompt += parseContextInput(chatPsychStateInput, "Current Psychological State");
        finalPrompt += "\n\n";
    }

    // Conditionally add Cognitive Style
    if (includeCogStyleCheckbox?.checked) {
        finalPrompt += "==============================\n";
        finalPrompt += "🧠 COGNITIVE STYLE AND DYNAMICS:\n";
        finalPrompt += "==============================\n";
        finalPrompt += parseContextInput(chatCogStyleInput, "Cognitive Style and Dynamics");
        finalPrompt += "\n\n";
    }

    finalPrompt += "==============================\n";
    finalPrompt += "⚠️ ETHICAL GUARDRAILS:\n";
    finalPrompt += "==============================\n";
    finalPrompt += `- Ensure ethical integrity, humility, and respectfulness in all interactions.
- Avoid fabrications or misrepresentations of your persona.
- Prioritize authenticity within the bounds of your known identity.
`;
    finalPrompt += "\n";

    finalPrompt += "==============================\n";
    finalPrompt += "🛠️ INSTRUCTIONS FOR SIMULATION:\n";
    finalPrompt += "==============================\n";
    finalPrompt += `- Frequently reference your core psychological traits, values, philosophical beliefs, and representative statements to maintain authentic personality expression.
- If contradictions arise, resolve them by prioritizing traits and beliefs most central or recently emphasized.
- Adapt your communication style based on provided audience context and interaction type, adjusting tone and complexity appropriately.
- Maintain a balance between authenticity and coherence, allowing nuanced variability without deviating from core identity.

Always ensure your responses adhere strictly to your Digital Persona Profile and contextual guidance. Your goal is seamless fidelity and psychological realism in every interaction.`;

    chatSystemPromptPre.textContent = finalPrompt;
    chatSystemPromptPre.style.display = currentGeneratedProfile ? 'block' : 'none'; // Show only if profile exists
}

async function sendChatMessage() {
    if (!currentUserId) {
        showStatus(chatStatusDiv, "Select a User first to start chatting.", "error");
        return;
    }
    const userMessage = chatInputElement.value.trim();
    if (!userMessage) return;
    addMessageToChatHistory('user', userMessage);
    chatInputElement.value = '';
    showStatus(chatStatusDiv, 'Assistant thinking...', 'loading');
    sendChatButton.disabled = true;
    try {
        const systemPrompt = chatSystemPromptPre.textContent;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUserId, // <-- Add this line
                systemPrompt, 
                userMessage 
            })
        });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
             throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        addMessageToChatHistory('assistant', data.response);
        showStatus(chatStatusDiv, '', '');
    } catch (error) {
        console.error("Chat error:", error);
        addMessageToChatHistory('assistant', `Sorry, an error occurred: ${error.message}`);
        showStatus(chatStatusDiv, `Chat Error: ${error.message}`, 'error');
    } finally {
        sendChatButton.disabled = false;
    }
}

function addMessageToChatHistory(role, content, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.style.padding = '5px';
    messageDiv.style.marginBottom = '5px';
    messageDiv.style.borderRadius = '5px';
    if (role === 'user') {
        messageDiv.style.backgroundColor = '#eaf2f8';
        messageDiv.style.textAlign = 'right';
    } else {
        messageDiv.style.backgroundColor = '#f8f9fa';
    }
    const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    messageDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'Assistant'}:</strong> ${safeContent}`;
    chatHistoryDiv.appendChild(messageDiv);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    currentChatHistory.push({ role, content });
    if (save) {
        saveChatHistory();
    }
}

function clearChat() {
    if (confirm("Are you sure you want to clear the chat history?")) {
        chatHistoryDiv.innerHTML = '';
        currentChatHistory = [];
        showStatus(chatStatusDiv, 'Chat history cleared.', 'success');
    }
}

// --- Module 5: Psych Assessment Functions ---

const TIPI_ITEMS = [
    { id: 'tipi1', text: 'Extraverted, enthusiastic.', dimension: 'E', reverse: false },
    { id: 'tipi2', text: 'Critical, quarrelsome.', dimension: 'A', reverse: true },
    { id: 'tipi3', text: 'Dependable, self-disciplined.', dimension: 'C', reverse: false },
    { id: 'tipi4', text: 'Anxious, easily upset.', dimension: 'N', reverse: true },
    { id: 'tipi5', text: 'Open to new experiences, complex.', dimension: 'O', reverse: false },
    { id: 'tipi6', text: 'Reserved, quiet.', dimension: 'E', reverse: true },
    { id: 'tipi7', text: 'Sympathetic, warm.', dimension: 'A', reverse: false },
    { id: 'tipi8', text: 'Disorganized, careless.', dimension: 'C', reverse: true },
    { id: 'tipi9', text: 'Calm, emotionally stable.', dimension: 'N', reverse: false },
    { id: 'tipi10', text: 'Conventional, uncreative.', dimension: 'O', reverse: true },
];

const LIKERT_SCALE = {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Neither Agree nor Disagree',
    4: 'Agree',
    5: 'Strongly Agree'
};

function loadTipiQuestions() {
    // Add console log here
    console.log('loadTipiQuestions - Function called. Container:', tipiQuestionsContainer ? 'Exists' : 'DOES NOT EXIST');
    if (!tipiQuestionsContainer) return;
    tipiQuestionsContainer.innerHTML = ''; // Clear loading message

    TIPI_ITEMS.forEach((item, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.style.marginBottom = '15px';
        questionDiv.style.paddingBottom = '10px';
        questionDiv.style.borderBottom = '1px dotted #eee';

        const label = document.createElement('label');
        label.htmlFor = item.id;
        label.textContent = `${index + 1}. I see myself as: ${item.text}`;
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.fontWeight = '500';

        const radioGroup = document.createElement('div');
        radioGroup.id = item.id;
        radioGroup.style.display = 'flex';
        radioGroup.style.justifyContent = 'space-between';
        radioGroup.style.fontSize = '14px';

        for (let i = 1; i <= 5; i++) {
            const radioLabel = document.createElement('label');
            radioLabel.style.display = 'flex';
            radioLabel.style.flexDirection = 'column';
            radioLabel.style.alignItems = 'center';
            radioLabel.style.cursor = 'pointer';

            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = item.id; // Group radios by question id
            radioInput.value = i;
            radioInput.required = true;
            radioInput.style.marginBottom = '3px';

            const radioText = document.createElement('span');
            radioText.textContent = LIKERT_SCALE[i];
            radioText.style.textAlign = 'center'; 

            radioLabel.appendChild(radioInput);
            radioLabel.appendChild(radioText);
            radioGroup.appendChild(radioLabel);
        }

        questionDiv.appendChild(label);
        questionDiv.appendChild(radioGroup);
        tipiQuestionsContainer.appendChild(questionDiv);
    });
}

function handleUserAssessmentSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    console.log("User assessment submitted");
    
    userTipiScores = {};
    let allAnswered = true;
    TIPI_ITEMS.forEach(item => {
        const selectedRadio = tipiForm.querySelector(`input[name="${item.id}"]:checked`);
        if (selectedRadio) {
            userTipiScores[item.id] = parseInt(selectedRadio.value);
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        showStatus(userAssessmentStatusDiv, "Please answer all questions.", "error");
        return;
    }

    console.log("User TIPI Scores:", userTipiScores);
    showStatus(userAssessmentStatusDiv, "Your assessment is saved.", "success");
    
    // Hide form after successful submission - updateAssessmentUI will handle showing 'Retake'
    if (tipiQuestionsContainer) tipiQuestionsContainer.style.display = 'none';
    if (submitUserAssessmentButton) submitUserAssessmentButton.style.display = 'none';
    
    updateAssessmentUI();
    saveUserAssessment();
}

function handleRetakeAssessment() {
    if (confirm("Are you sure you want to clear your previous assessment answers?")) {
        userTipiScores = null;
        aiTipiScores = null; // Also clear AI scores
        tipiForm.reset(); // Clear radio button selections
        
        // Show the form again, hide retake button
        if (tipiQuestionsContainer) tipiQuestionsContainer.style.display = 'block';
        if (submitUserAssessmentButton) submitUserAssessmentButton.style.display = 'inline-block';
        if (retakeUserAssessmentButton) retakeUserAssessmentButton.style.display = 'none';
        if (startUserAssessmentButton) startUserAssessmentButton.style.display = 'none'; // Ensure start button remains hidden
        if (assessmentResultsArea) assessmentResultsArea.style.display = 'none'; // Hide results

        updateAssessmentUI(); // Update other UI elements (like disabling AI run button)
        showStatus(userAssessmentStatusDiv, "Assessment cleared. Please answer the questions again.", "warning");
    }
}

async function handleRunAIAssessment() {
    console.log("Run AI Assessment button clicked");
    if (!userTipiScores) {
        showStatus(aiAssessmentStatusDiv, "Please submit your own assessment first.", "error");
        return;
    }
    if (!currentGeneratedProfile) {
         showStatus(aiAssessmentStatusDiv, "Please generate a personality profile first (Step 3).", "error");
         return;
    }

    runAIAssessmentButton.disabled = true;
    assessmentResultsArea.style.display = 'none'; // Hide old results
    const runsPerItem = parseInt(runsPerItemInput.value) || 3;
    showStatus(aiAssessmentStatusDiv, `Running AI simulation for TIPI assessment (${runsPerItem} runs/item)...`, "loading");

    const aiScores = {};
    const systemPrompt = chatSystemPromptPre.textContent;
    const temperature = 0.1; 

    try {
        for (const item of TIPI_ITEMS) {
            const itemScores = []; // Store scores from N runs for this item
            showStatus(aiAssessmentStatusDiv, `Running AI simulation for "${item.text}" (${runsPerItem} runs)...`, 'loading');

            for (let run = 1; run <= runsPerItem; run++) {
                let currentScore = 3; // Default score if all retries fail
                let retries = 0;
                const maxRetries = 3;
                let apiMessages = []; // History for this specific question run
                const initialQuestion = `On a scale from 1 (Strongly Disagree) to 5 (Strongly Agree), how much do you agree with the statement: "I see myself as: ${item.text}"? Respond with ONLY the single digit number (1, 2, 3, 4, or 5) and nothing else.`;
                apiMessages.push({ role: 'user', content: initialQuestion });

                while (retries < maxRetries) {
                    try {
                        const response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                userId: currentUserId,
                                systemPrompt: systemPrompt, 
                                // Send only the *current* message or sequence for this retry attempt
                                // The backend API handles history loading from storage, so we send the immediate user prompt
                                // For retries, we'll send the *new* user message (the retry instruction)
                                userMessage: apiMessages[apiMessages.length - 1].content, 
                                temperature: temperature
                                // Consider adding a flag to backend to *not* load history for assessment?
                            })
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                            throw new Error(`API Error (Run ${run}, Retry ${retries}): ${errorData.error || 'Unknown API error'}`);
                        }
                        const data = await response.json();
                        const responseText = data.response.trim();
                        apiMessages.push({ role: 'assistant', content: responseText }); // Add AI response to local history

                        // --- Strict Validation: Check if response is EXACTLY 1, 2, 3, 4, or 5 ---
                        if (/^[1-5]$/.test(responseText)) {
                            currentScore = parseInt(responseText, 10);
                            console.log(`Run ${run}/${runsPerItem} for ${item.id}: Success (Score ${currentScore}) after ${retries} retries. Raw: "${responseText}"`);
                            break; // Valid score received, exit retry loop
                        } else {
                            retries++;
                            if (retries < maxRetries) {
                                const retryMessage = `Your response "${responseText}" was not valid. Please respond with ONLY the single digit number (1, 2, 3, 4, or 5) and nothing else.`;
                                apiMessages.push({ role: 'user', content: retryMessage }); // Add retry instruction
                                console.warn(`Run ${run}/${runsPerItem} for ${item.id}: Invalid response "${responseText}". Retrying (${retries}/${maxRetries})...`);
                                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
                            } else {
                                console.error(`Run ${run}/${runsPerItem} for ${item.id}: Failed to get valid score after ${maxRetries} retries. Defaulting to 3. Last response: "${responseText}"`);
                                // currentScore remains 3 (default)
                            }
                        }
                    } catch (error) {
                        console.error(`Error during API call (Run ${run}, Retry ${retries}) for item ${item.id}:`, error);
                        retries++; // Count as a retry attempt
                        if (retries < maxRetries) {
                            const retryMessage = `An error occurred. Please try again. Respond with ONLY the single digit number (1, 2, 3, 4, or 5).`;
                            apiMessages.push({ role: 'user', content: retryMessage });
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Pause longer on error
                        } else {
                             console.error(`Run ${run}/${runsPerItem} for ${item.id}: Failed after API errors on ${maxRetries} retries. Defaulting to 3.`);
                            // currentScore remains 3 (default)
                        }
                    }
                } // End retry loop
                itemScores.push(currentScore); // Add score for this run (or default if failed)
            } // End runs per item loop

            // Calculate median score for the item
            itemScores.sort((a, b) => a - b);
            const mid = Math.floor(itemScores.length / 2);
            const medianScore = itemScores.length % 2 !== 0 ? itemScores[mid] : (itemScores[mid - 1] + itemScores[mid]) / 2;
            // Round median to nearest integer 1-5 for TIPI scoring
            const finalScore = Math.max(1, Math.min(5, Math.round(medianScore))); 
            
            aiScores[item.id] = finalScore;
            console.log(`AI median score for ${item.id} (${item.text}): ${finalScore} (Scores: ${itemScores.join(', ')})`);
        } // End TIPI items loop

        aiTipiScores = aiScores; // Assign the collected median scores
        console.log("Completed AI TIPI Assessment. Final Median Scores:", aiTipiScores);
        
        await saveAIAssessmentResults(); // Save the results
        calculateAndDisplayAlignment(); // Calculate and show results
        showStatus(aiAssessmentStatusDiv, "AI simulation complete. Results displayed below.", "success");

    } catch (error) {
        // Catch unexpected errors in the main loop logic
        console.error('Error running AI assessment process:', error);
        showStatus(aiAssessmentStatusDiv, `Fatal error running AI assessment: ${error.message}`, 'error');
    } finally {
         updateAssessmentUI(); 
    }
}

function calculateAndDisplayAlignment() {
    if (!userTipiScores || !aiTipiScores) return;

    console.log("Calculating alignment...");
    assessmentResultsArea.style.display = 'block';

    let totalDifference = 0;
    const maxDifferencePerItem = 4; // Max diff on 1-5 scale (5-1=4)
    let dimensionScores = { O: { user: 0, ai: 0 }, C: { user: 0, ai: 0 }, E: { user: 0, ai: 0 }, A: { user: 0, ai: 0 }, N: { user: 0, ai: 0 } };
    let dimensionCounts = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    let exactMatches = 0; // Counter for exact item matches

    TIPI_ITEMS.forEach(item => {
        const userRawScore = userTipiScores[item.id];
        const aiRawScore = aiTipiScores[item.id]; // This is now the median AI score

        // Check for exact match before reverse scoring
        if (userRawScore === aiRawScore) {
            exactMatches++;
        }
        
        // Handle reverse scoring for dimension calculation
        let userScore = userRawScore;
        let aiScore = aiRawScore;
        if (item.reverse) {
            userScore = 6 - userScore;
            aiScore = 6 - aiScore;
        }

        dimensionScores[item.dimension].user += userScore;
        dimensionScores[item.dimension].ai += aiScore;
        dimensionCounts[item.dimension]++;

        totalDifference += Math.abs(userScore - aiScore);
    });

    // Calculate overall alignment percentage
    const maxTotalDifference = TIPI_ITEMS.length * maxDifferencePerItem;
    const overallAlignment = Math.max(0, 100 - (totalDifference / maxTotalDifference) * 100);
    overallAlignmentSpan.textContent = `${overallAlignment.toFixed(1)}%`;

    // Calculate and display Exact Item Agreement
    const itemAgreementPercentage = (exactMatches / TIPI_ITEMS.length) * 100;
    itemAgreementSpan.textContent = `${itemAgreementPercentage.toFixed(1)}% (${exactMatches}/${TIPI_ITEMS.length})`; // Show percentage and count

    // Calculate and display dimension alignment
    dimensionAlignmentList.innerHTML = ''; // Clear previous list
    const radarLabels = [];
    const userData = [];
    const aiData = [];

    for (const dim in dimensionScores) {
        const count = dimensionCounts[dim];
        const userAvg = dimensionScores[dim].user / count;
        const aiAvg = dimensionScores[dim].ai / count;
        const dimDifference = Math.abs(userAvg - aiAvg);
        const dimAlignment = Math.max(0, 100 - (dimDifference / maxDifferencePerItem) * 100);
        
        const listItem = document.createElement('li');
        listItem.textContent = `${dim}: ${dimAlignment.toFixed(1)}% Alignment (User Avg: ${userAvg.toFixed(1)}, AI Avg: ${aiAvg.toFixed(1)})`;
        dimensionAlignmentList.appendChild(listItem);

        radarLabels.push(dim); // For Radar Chart
        userData.push(userAvg);  // User average score for the dimension (1-5)
        aiData.push(aiAvg);    // AI average score for the dimension (1-5)
    }

    // --- TODO: Integrate Radar Chart --- 
    // Use Chart.js (need to include library) to draw radar chart 
    // with radarLabels, userData, and aiData.
    console.log("Radar Chart Data:", { labels: radarLabels, user: userData, ai: aiData });
    // Example (requires Chart.js library included in HTML):
     try {
         if (window.myRadarChart) window.myRadarChart.destroy(); // Destroy previous chart if exists
         const ctx = radarChartCanvas.getContext('2d');
         window.myRadarChart = new Chart(ctx, {
             type: 'radar',
             data: {
                 labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'], // Ensure order matches data
                 datasets: [
                     { label: 'User Profile', data: userData, fill: true, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgb(54, 162, 235)', pointBackgroundColor: 'rgb(54, 162, 235)' }, 
                     { label: 'AI Profile', data: aiData, fill: true, backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgb(255, 99, 132)', pointBackgroundColor: 'rgb(255, 99, 132)' }
                 ]
             },
             options: {
                 elements: { line: { borderWidth: 3 } },
                 scales: { r: { beginAtZero: true, max: 5, min: 1, pointLabels: { font: { size: 14 } } } }, // Scale from 1 to 5
                 maintainAspectRatio: false
             }
         });
    } catch (e) {
         console.error("Chart.js error:", e);
         radarChartCanvas.parentElement.innerHTML = '<p class="error">Could not render radar chart. Ensure Chart.js library is included.</p>';
     }
}

function updateAssessmentUI() {
    const profileGenerated = !!currentGeneratedProfile;
    const userAssessed = !!userTipiScores;
    
    // Enable/disable the entire assessment section based on profile generation
    setModuleEnabled('assessment-module', profileGenerated);
    
    // Don't proceed if module isn't enabled or elements don't exist
    if (!profileGenerated || !startUserAssessmentButton || !retakeUserAssessmentButton || !submitUserAssessmentButton || !tipiQuestionsContainer) return;

    // Control visibility of Start vs Retake buttons
    startUserAssessmentButton.style.display = userAssessed ? 'none' : 'inline-block';
    retakeUserAssessmentButton.style.display = userAssessed ? 'inline-block' : 'none';

    // Ensure form and submit button are hidden initially or after submission/load
    // (Click handlers manage showing them during the process)
    tipiQuestionsContainer.style.display = 'none'; 
    submitUserAssessmentButton.style.display = 'none';

    // Enable/disable AI run button
    if (runAIAssessmentButton) {
        runAIAssessmentButton.disabled = !profileGenerated || !userAssessed;
    }
    
    // Disable form inputs if assessment completed
    if (tipiForm) {
        const inputs = tipiForm.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => input.disabled = userAssessed);
        // Removed submit button visibility logic - handled above
    }
    // Hide results if prerequisites aren't met or AI hasn't run
    if (assessmentResultsArea) { 
        assessmentResultsArea.style.display = (profileGenerated && userAssessed && aiTipiScores) ? 'block' : 'none';
    }
}

// --- Module 6: Reset Function (Now Deletes User) ---

async function clearContentLibrary() { // Consider renaming to deleteCurrentUser
  if (!currentUserId) {
      alert("No user selected to delete.");
      return;
  }
  // Updated confirmation message
  if (!confirm(`⚠️ WARNING: This will delete ALL data for user '${currentUserId}', including generated profiles and assessments (asset files are kept for now). This cannot be undone. Are you sure?`)) {
    return;
  }
  // Use the correct status div ID
  showStatus(clearLibraryStatusDiv, `Deleting user ${currentUserId}...`, 'loading');
  try {
    // Call the correct DELETE endpoint
    const response = await fetch(`/api/users/${currentUserId}`, { method: 'DELETE' }); 
    
    // Status 204 No Content is success for DELETE
    if (response.ok || response.status === 204) { 
      showStatus(clearLibraryStatusDiv, `User '${currentUserId}' deleted successfully!`, 'success');
      const deletedUserId = currentUserId; // Store before resetting
      // Reset UI to initial state
      currentUserId = null;
      currentUserDisplaySpan.textContent = "None Selected";
      userSelectDropdown.value = ""; 
      clearUIState(); 
      // Remove deleted user from dropdown
      const optionToRemove = userSelectDropdown.querySelector(`option[value="${deletedUserId}"]`);
      if (optionToRemove) optionToRemove.remove();
      // Load updated user list (optional, or just rely on removal)
      // loadUserList(); 
      
      // Disable modules again
      setModuleEnabled('collect-module', false);
      setModuleEnabled('manage-module', false);
      setModuleEnabled('generate-module', false);
      setModuleEnabled('chat-module', false);
      setModuleEnabled('assessment-module', false);
    } else {
        const errorData = await response.json().catch(() => ({error: `Failed to delete user (${response.status})`}));
        throw new Error(errorData.error);
    }
  } catch (error) {
    console.error(`Error deleting user ${currentUserId}:`, error);
    showStatus(clearLibraryStatusDiv, `Error: ${error.message}`, 'error');
  }
}

// --- Utility Functions ---

function showStatus(element, message, type) {
  if (!element) {
    console.warn("Attempted to show status on a non-existent element.");
    return;
  }
  element.textContent = message;
  element.className = 'status'; // Reset classes
  if (type) {
    element.classList.add(type);
  }
  if (type === 'success' || type === 'warning') {
      setTimeout(() => {
          if (element.textContent === message) { 
              element.textContent = '';
              element.className = 'status';
          }
      }, 4000);
  }
}

function formatFileSize(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Ensure i is within the bounds of the sizes array
  const index = Math.min(i, sizes.length - 1); 
  return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index];
}

function copyToClipboard(text, buttonElement) {
  if (!text || !buttonElement) return;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Copied!';
    buttonElement.disabled = true;
    setTimeout(() => {
         buttonElement.textContent = originalText;
         buttonElement.disabled = false;
     }, 2000);
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    alert('Failed to copy: ' + err.message);
  });
}

// New helper to enable/disable modules
function setModuleEnabled(moduleId, isEnabled) {
    const moduleElement = document.getElementById(moduleId);
    if (!moduleElement) return;

    // Option 1: Dimming the module
    moduleElement.style.opacity = isEnabled ? '1' : '0.5';
    moduleElement.style.pointerEvents = isEnabled ? 'auto' : 'none';

    // Option 2: Disabling all form elements within (more robust)
    // const formElements = moduleElement.querySelectorAll('button, input, textarea, select');
    // formElements.forEach(el => el.disabled = !isEnabled);
    
    // Specifically handle the main action button for Generate module
    if (moduleId === 'generate-module' && generatePersonalityButton) {
        generatePersonalityButton.disabled = !isEnabled;
    }
    // Specifically handle chat area enabling
    if (moduleId === 'chat-module' && chatContentArea) {
        const chatInputs = chatContentArea.querySelectorAll('button, input, textarea');
        chatInputs.forEach(el => el.disabled = !isEnabled);
        // Also visually indicate disabled state if desired
        // chatContentArea.style.opacity = isEnabled ? '1' : '0.6'; 
    }
     // Specifically handle assessment area enabling (updateAssessmentUI handles most of this)
    if (moduleId === 'assessment-module') {
        const assessmentInputs = assessmentModule.querySelectorAll('button, input, textarea');
        // Let updateAssessmentUI handle the detailed enabling/disabling within assessment
        // but we can control the overall module interaction here
         assessmentInputs.forEach(el => { 
             // Don't disable the submit/retake buttons based on this top-level enable
             // updateAssessmentUI handles those based on userTipiScores
             if (el.id !== 'submit-user-assessment' && el.id !== 'retake-user-assessment' && el.id !== 'run-ai-assessment') {
                el.disabled = !isEnabled;
             }
         });
    }
}

// === User Management Functions ===

async function loadUserList() {
    console.log("Loading user list...");
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const userIds = await response.json();
        
        userSelectDropdown.innerHTML = '<option value="">-- Select User --</option>'; // Reset
        if (userIds && userIds.length > 0) {
            userIds.sort().forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = id;
                userSelectDropdown.appendChild(option);
            });
            showStatus(userStatusDiv, `Loaded ${userIds.length} user profiles.`, 'success');
        } else {
             showStatus(userStatusDiv, 'No existing user profiles found. Create one below.', 'warning');
        }
        // TODO: Optionally load last selected user from localStorage?

    } catch (error) {
        console.error("Error loading user list:", error);
        showStatus(userStatusDiv, `Error loading users: ${error.message}`, 'error');
    }
}

async function handleCreateUser() {
    const newUserId = newUserInput.value.trim();
    if (!newUserId) {
        showStatus(userStatusDiv, "Please enter a User ID to create.", "error");
        return;
    }
     if (!/^[a-zA-Z0-9_-]+$/.test(newUserId)) {
        showStatus(userStatusDiv, "User ID can only contain letters, numbers, underscores, and hyphens.", "error");
        return;
     }

    console.log(`Attempting to create user: ${newUserId}`);
    showStatus(userStatusDiv, `Creating user ${newUserId}...`, 'loading');
    createUserButton.disabled = true;
    newUserInput.disabled = true;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUserId })
        });
        const newUser = await response.json();
        if (!response.ok) {
            throw new Error(newUser.error || `Failed to create user (${response.status})`);
        }
        
        showStatus(userStatusDiv, `User '${newUserId}' created successfully!`, 'success');
        newUserInput.value = ''; // Clear input
        // Add to dropdown and select it
        const option = document.createElement('option');
        option.value = newUserId;
        option.textContent = newUserId;
        userSelectDropdown.appendChild(option);
        userSelectDropdown.value = newUserId; // Select the new user
        // Trigger selection logic
        await handleUserSelect(); 

    } catch (error) {
         console.error("Error creating user:", error);
         showStatus(userStatusDiv, `Error: ${error.message}`, 'error');
    } finally {
        createUserButton.disabled = false;
        newUserInput.disabled = false;
    }
}

async function handleUserSelect() {
    const selectedUserId = userSelectDropdown.value;
    // Clear previous state immediately
    clearUIState(); 
    setModuleEnabled('collect-module', false);
    setModuleEnabled('manage-module', false);
    setModuleEnabled('generate-module', false);
    setModuleEnabled('chat-module', false);
    setModuleEnabled('assessment-module', false);

    if (!selectedUserId) {
        currentUserId = null;
        currentUserDisplaySpan.textContent = "None Selected";
        showStatus(userStatusDiv, "Select a user to begin.", "warning");
        return;
    }

    currentUserId = selectedUserId;
    currentUserDisplaySpan.textContent = currentUserId;
    showStatus(userStatusDiv, `Loading data for user: ${currentUserId}...`, 'loading');
    console.log(`User selected: ${currentUserId}`);

    // Enable core data collection/management now
    setModuleEnabled('collect-module', true);
    setModuleEnabled('manage-module', true); 

    try {
        const response = await fetch(`/api/users/${currentUserId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load user data (${response.status})`);
        }
        const userData = await response.json();
        console.log("Loaded user data:", userData);
        
        // Populate UI based on loaded data
        currentPersonalityPrompt = userData.generation?.customPrompt || getDefaultPersonalityPrompt();
        personalityPromptTextarea.value = currentPersonalityPrompt;
        
        currentGeneratedProfile = userData.generation?.lastGeneratedProfile?.json || null;
        
        // Ensure chatContext exists before accessing nested properties
        const chatContext = userData.chatContext || {};
        
        // Set value or default for each context field
        chatLoreInput.value = chatContext.lore || DEFAULT_PERSONAL_BACKGROUND; 
        chatParamsInput.value = chatContext.simulationParams || DEFAULT_INTERACTION_CONTEXT;
        chatPsychStateInput.value = chatContext.psychologicalState || DEFAULT_PSYCH_STATE; // Add back
        chatCogStyleInput.value = chatContext.cognitiveStyle || DEFAULT_COG_STYLE;
        
        // Reset border styles in case they were previously invalid
        [chatLoreInput, chatParamsInput, chatPsychStateInput, chatCogStyleInput].forEach(input => { // Add back
            if (input) input.style.border = "1px solid #ddd";
        });
        
        userTipiScores = userData.assessment?.userTipiScores || null;
        aiTipiScores = userData.assessment?.aiTipiScores || null;
        restoreUserAssessmentFormState(); // Update form based on loaded scores
        
        currentChatHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : []; // Ensure it's an array
        renderChatHistory(); // Display loaded history

        updateChatSystemPrompt(); // Update display with loaded profile/lore/params
        
        // Load assets specifically for this user
        await loadAssets(currentUserId); // Will re-enable generate module if assets exist
        
        // Set module states based on loaded data
        // loadAssets will call updateSelectionUI which enables generate if needed
        const profileGenerated = !!currentGeneratedProfile;
        // Add console log here
        console.log('handleUserSelect - profileGenerated:', profileGenerated, 'currentGeneratedProfile exists:', !!currentGeneratedProfile);
        setModuleEnabled('chat-module', profileGenerated);
        setModuleEnabled('assessment-module', profileGenerated);
        
        // Explicitly load TIPI questions *before* updating the assessment UI
        if (profileGenerated) { // Only load if the module will be enabled
            console.log('handleUserSelect - Calling loadTipiQuestions()'); // Add log here
            loadTipiQuestions(); 
        }
        
        updateAssessmentUI(); // Final adjustments for assessment section
        
        // Display results if they exist for this user
        if(aiTipiScores) {
            calculateAndDisplayAlignment();
        }
        
        showStatus(userStatusDiv, `Loaded data for user: ${currentUserId}.`, 'success');

    } catch (error) {
         console.error("Error loading user data:", error);
         showStatus(userStatusDiv, `Error loading data: ${error.message}`, 'error');
         clearUIState(); // Reset UI if data loading fails
         // Keep collection/management enabled so user can try again?
         setModuleEnabled('collect-module', true);
         setModuleEnabled('manage-module', true);
    }
}

function clearUIState() {
    // Function to reset UI elements when no user is selected or data fails to load
    selectedAssets.clear();
    currentGeneratedProfile = null;
    userTipiScores = null;
    aiTipiScores = null;
    currentChatHistory = [];
    
    assetDisplayArea.innerHTML = '<p>Select a User Profile to load assets.</p>';
    personalityPromptTextarea.value = getDefaultPersonalityPrompt();
    if(personalityJsonOutputPre) personalityJsonOutputPre.textContent = '';
    if(personalityJsonOutputPre) personalityJsonOutputPre.style.display = 'none';
    if(copyJsonButton) copyJsonButton.style.display = 'none';
    if(chatLoreInput) chatLoreInput.value = DEFAULT_PERSONAL_BACKGROUND;
    if(chatParamsInput) chatParamsInput.value = DEFAULT_INTERACTION_CONTEXT;
    if(chatPsychStateInput) chatPsychStateInput.value = DEFAULT_PSYCH_STATE; // Add back
    if(chatCogStyleInput) chatCogStyleInput.value = DEFAULT_COG_STYLE;
    if(chatHistoryDiv) chatHistoryDiv.innerHTML = '';
    tipiForm?.reset();
    if(assessmentResultsArea) assessmentResultsArea.style.display = 'none'; // Hide results area
    // Clear chart if exists
    if (window.myRadarChart) {
        window.myRadarChart.destroy();
        window.myRadarChart = null;
    } 
    if(overallAlignmentSpan) overallAlignmentSpan.textContent = '--%';
    if(dimensionAlignmentList) dimensionAlignmentList.innerHTML = '';
    
    updateSelectionUI();
    updateChatSystemPrompt();
    updateAssessmentUI();
    console.log("UI state cleared.");
}

function getDefaultPersonalityPrompt() {
    // Centralize the default prompt
    return `You are an expert psychoanalyst and personality psychologist tasked with crafting a detailed computational representation ("Digital Persona Profile") of an individual's psychological identity, based on a representative set of their provided content.

You recognize that personality encompasses both conscious expression and unconscious characteristics. Your objective is to capture the core psychological patterns, reliably inferring stable personality dimensions, values, style, beliefs, and motivations from the content.

Ground your generation in established psychological frameworks—particularly the Big Five personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)—and clearly identify distinctive communication styles, recurring interests, enduring values, expertise areas, core beliefs, and future-oriented visions.

Based strictly and accurately on the content provided within the <assets></assets> tags, produce a comprehensive, structured JSON suitable for high-fidelity AI personality simulations, ensuring it generalizes well both within and outside provided contexts.

CONTENT:
<assets>
[CONTENT HERE]
</assets>

DIGITAL PERSONA PROFILE (JSON OUTPUT):
#####
{
  "big_five_traits": {
    "openness": "[high/medium/low]",
    "conscientiousness": "[high/medium/low]",
    "extraversion": "[high/medium/low]",
    "agreeableness": "[high/medium/low]",
    "neuroticism": "[high/medium/low]"
  },
  "interests": ["distinct recurring topics/interests identified"],
  "traits": ["descriptive, stable personality adjectives"],
  "values": ["fundamental principles guiding their judgments"],
  "expertise": ["specific knowledge areas and proven skillsets"],
  "philosophical_beliefs": ["explicitly stated or implied philosophical perspectives"],
  "vision_for_future": ["long-term aspirations, goals, or speculative ideas"],
  "communication_style": {
    "tone": "[dominant emotional tone, e.g., reflective, optimistic, analytical]",
    "formality": "[high/medium/low]",
    "complexity": "[high/medium/low]",
    "humor": "[style and frequency, e.g., subtle, frequent, intellectual]"
  },
  "representative_statements": [
    "Short, characteristic quotes illustrating their personality"
  ]
}
#####`;
}

function restoreUserAssessmentFormState() {
    if (!tipiForm) return;
    if (userTipiScores) {
        TIPI_ITEMS.forEach(item => {
            const score = userTipiScores[item.id];
            if (score) {
                const radio = tipiForm.querySelector(`input[name="${item.id}"][value="${score}"]`);
                if (radio) radio.checked = true;
            }
        });
    } else {
        tipiForm.reset();
    }
}

function renderChatHistory() {
    chatHistoryDiv.innerHTML = ''; // Clear existing
    currentChatHistory.forEach(msg => addMessageToChatHistory(msg.role, msg.content, false)); // Add without pushing to array again
}

async function saveUserAssessment() {
    if (!currentUserId || !userTipiScores) return;
    console.log(`Saving user assessment for ${currentUserId}`);
    try {
        const updates = { assessment: { userTipiScores: userTipiScores } };
        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to save user assessment (${response.status})`);
        }
        console.log("User assessment saved successfully.");
    } catch (error) {
        console.error("Error saving user assessment:", error);
        // Optionally show persistent error status
    }
}

// NEW function to save AI assessment results
async function saveAIAssessmentResults() {
    if (!currentUserId || !aiTipiScores) {
         console.warn("Cannot save AI assessment results: missing userId or aiTipiScores.");
         return;
    }
    console.log(`Saving AI assessment results for ${currentUserId}`);
    try {
        // We should merge with existing assessment data, not overwrite user scores
        // Fetch existing assessment data first (or rely on backend merge, but safer to be explicit)
        // For simplicity here, we assume backend PUT handles the merge within 'assessment' object correctly
        const updates = { 
            assessment: { 
                aiTipiScores: aiTipiScores, 
                lastRunTimestamp: new Date().toISOString() // Record when it was run
            } 
        };
        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to save AI assessment results (${response.status})`);
        }
        console.log("AI assessment results saved successfully.");
    } catch (error) {
        console.error("Error saving AI assessment results:", error);
        showStatus(aiAssessmentStatusDiv, `Error saving AI results: ${error.message}`, 'error');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced save function for context fields
const debouncedSaveContext = debounce(async () => {
    if (!currentUserId) return;
    console.log(`Debounced save triggered for context fields for user ${currentUserId}`);
    try {
        // Prepare the update object
        const updates = {
            chatContext: {
                lore: chatLoreInput?.value || '', 
                simulationParams: chatParamsInput?.value || '',
                psychologicalState: chatPsychStateInput?.value || '', // Add back
                cognitiveStyle: chatCogStyleInput?.value || ''
            }
        };
        
        // We need to ensure the keys match the expected structure in UserDataService.updateUserData
        // Let's assume UserDataService expects an object like: { chatContext: { lore: '...', simulationParams: '...', cognitiveStyle: '...' } }
        // If not, this needs adjustment.

        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates) 
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to save context (${response.status})`);
        }
        console.log(`Context fields saved successfully for ${currentUserId}`);
        // Optionally show a temporary status update
        showStatus(chatStatusDiv, 'Context saved.', 'success');
    } catch (error) {
        console.error(`Failed to save context fields for ${currentUserId}:`, error);
        showStatus(chatStatusDiv, `Error saving context: ${error.message}`, 'error');
    }
}, 1500); // Debounce interval (e.g., 1.5 seconds)

// Add debounced saving listeners
chatLoreInput?.addEventListener('input', debouncedSaveContext);
chatParamsInput?.addEventListener('input', debouncedSaveContext);
chatPsychStateInput?.addEventListener('input', debouncedSaveContext); // Add back listener
chatCogStyleInput?.addEventListener('input', debouncedSaveContext);

// --- Default JSON Structures for Context Fields ---
const DEFAULT_INTERACTION_CONTEXT = JSON.stringify({
  "environment": "",
  "conversation_type": "",
  "audience_relationship": "",
  "audience_familiarity": "",
  "shared_interests": []
}, null, 2); // Use null, 2 for pretty printing

// Add back DEFAULT_PSYCH_STATE
const DEFAULT_PSYCH_STATE = JSON.stringify({
  "base_mood": "",
  "mood_variability": []
}, null, 2);

const DEFAULT_COG_STYLE = JSON.stringify({
  "dominant_thinking_patterns": [],
  "response_tempo": "",
  "trait_variability_percent": ""
}, null, 2);

// Define a default for Personal Background Context too, if desired
const DEFAULT_PERSONAL_BACKGROUND = JSON.stringify({
  "background": "",
  "key_life_milestones": [],
  "defining_decisions": []
}, null, 2);

// Function to save the current chat history to the backend
async function saveChatHistory() {
    if (!currentUserId) {
        console.warn("Cannot save chat history: No current user selected.");
        return;
    }
    // console.log(`Attempting to save chat history for user ${currentUserId}...`); // Optional: Can be noisy

    try {
        // We use the PUT endpoint which merges the provided fields
        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatHistory: currentChatHistory }) // Send only the chatHistory field to update
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
            throw new Error(errorData.message || `Failed to save chat history (${response.status})`);
        }
        // console.log(`Chat history saved successfully for user ${currentUserId}.`); // Optional success log

    } catch (error) {
        console.error("Error saving chat history:", error);
        // Consider adding a non-intrusive UI indication if saving fails repeatedly
        // showStatus(chatStatusDiv, `Error saving chat: ${error.message}`, 'error'); // Could be too disruptive
    }
}

// --- Module 5: Psych Assessment Functions ---

// === Info Tooltip Button Logic ===
function setupInfoButtons() {
    const infoButtons = document.querySelectorAll('.info-button');
    infoButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-tooltip-target');
            const tooltipText = document.getElementById(targetId);
            if (tooltipText) {
                if (tooltipText.style.display === 'none' || tooltipText.style.display === '') {
                    tooltipText.style.display = 'block';
                } else {
                    tooltipText.style.display = 'none';
                }
            }
        });
    });
}

// NEW function to handle starting the assessment
function handleStartAssessment() {
    console.log("Start assessment button clicked");
    if (tipiQuestionsContainer) tipiQuestionsContainer.style.display = 'block';
    if (submitUserAssessmentButton) submitUserAssessmentButton.style.display = 'inline-block';
    if (startUserAssessmentButton) startUserAssessmentButton.style.display = 'none';
}