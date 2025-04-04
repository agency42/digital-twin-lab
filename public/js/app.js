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
// Add bio-related variables
let userBioTextarea, saveBioButton, bioStatusDiv;

// New variables for tab navigation
let navTabs, pageContainers;
let savedPersonalitiesContainer, profileCardTemplate, personalitySelector, personalitySelectorTemplate;
let aiProfileSelect, userAssessmentSummary, userAssessmentStatusSummary;

// === Global State ===
const selectedAssets = new Set(); // Keep track of selected asset IDs
let currentGeneratedProfile = null; // Store the latest generated JSON
let currentPersonalityPrompt = ''; // Store the current personality prompt text
let currentChatHistory = []; // Store chat messages { role: 'user'/'assistant', content: '...'}
let userTipiScores = null; // Store user scores { q1: score, q2: score, ... }
let aiTipiScores = null;   // Store AI average scores
let currentUserId = null; // Track the active user
let currentActiveProfileId = null; // Track the currently active personality profile

// === Early Function Definitions ===

/**
 * Render the current chat history
 */
function renderChatHistory() {
  if (!chatHistoryDiv || !currentChatHistory) return;
  
  // Clear chat history
  chatHistoryDiv.innerHTML = '';
  
  // Add each message
  currentChatHistory.forEach(message => {
    addMessageToChat(message.role, message.content);
  });
}

// === Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
  // --- Assign DOM elements inside the listener ---
  
  // Tab navigation elements
  navTabs = document.querySelectorAll('.nav-tab');
  pageContainers = document.querySelectorAll('.page');
  
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

  // New elements for saved personalities and profile selection
  savedPersonalitiesContainer = document.getElementById('saved-personalities-container');
  profileCardTemplate = document.getElementById('profile-card-template');
  personalitySelector = document.getElementById('personality-selector');
  personalitySelectorTemplate = document.getElementById('personality-selector-template');
  
  // Alignment page elements
  aiProfileSelect = document.getElementById('ai-profile-select');
  userAssessmentSummary = document.getElementById('user-assessment-summary');
  userAssessmentStatusSummary = document.getElementById('user-assessment-status-summary');

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

  // NOTE: Reset session button/module not fully defined in provided HTML, commenting out
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
  assessmentModule = document.getElementById('user-assessment-module'); // Changed from assessment-module to user-assessment-module
  chatContentArea = document.getElementById('chat-content-area');
  // --- End DOM element assignments ---

  // --- Assign DOM elements ---
  // ... other assignments ...
  includeInteractionContextCheckbox = document.getElementById('include-interaction-context');
  includePsychStateCheckbox = document.getElementById('include-psych-state');
  includeCogStyleCheckbox = document.getElementById('include-cog-style');
  // ... other assignments ...

  // Bio elements
  userBioTextarea = document.getElementById('user-bio');
  saveBioButton = document.getElementById('save-bio-button');
  bioStatusDiv = document.getElementById('bio-status');

  // Create debounced version of saveContext with 500ms delay
  const debouncedSaveContext = debounce(saveContext, 500);

  // Initial setup on page load
  updateNavigationTabsState(); // Initialize tab navigation state
  
  // Other setup
  loadPersonalityPrompt(); // Still load default prompt text
  setupModal();
  updateChatSystemPrompt();
  updateAssessmentUI();

  // --- Attach Event Listeners ---
  // Module 0 Listeners
  userSelectDropdown?.addEventListener('change', handleUserSelect);
  createUserButton?.addEventListener('click', handleCreateUser);
  saveBioButton?.addEventListener('click', handleSaveBio);
  
  // Module 1 Listeners
  startScrapingButton?.addEventListener('click', handleScrape);
  uploadButton?.addEventListener('click', handleUpload);
  document.getElementById('connect-linkedin-button')?.addEventListener('click', handleLinkedInConnect);
  
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

  // Check for social auth callback
  checkSocialAuthCallback();

  // New elements for system prompt editor
  systemPromptEditor = document.getElementById('system-prompt-editor');
  showSystemPromptCheckbox = document.getElementById('show-system-prompt');
  savedPromptsDropdown = document.getElementById('saved-prompts-dropdown');
  saveSystemPromptButton = document.getElementById('save-system-prompt');
  saveAsSystemPromptButton = document.getElementById('save-as-system-prompt');
  
  // Attach event listeners for system prompt functionality
  showSystemPromptCheckbox?.addEventListener('change', toggleSystemPromptVisibility);
  savedPromptsDropdown?.addEventListener('change', selectSystemPrompt);
  saveSystemPromptButton?.addEventListener('click', saveCurrentSystemPrompt);
  saveAsSystemPromptButton?.addEventListener('click', saveSystemPromptAs);
});

/**
 * Toggle system prompt visibility based on checkbox
 */
function toggleSystemPromptVisibility() {
  if (!systemPromptEditor) return;
  
  systemPromptEditor.style.display = showSystemPromptCheckbox.checked ? 'block' : 'none';
}

/**
 * Update the chat interface with the current profile
 */
function updateChatInterface() {
  if (!currentGeneratedProfile) {
    // No profile available
    if (personalitySelector) {
      personalitySelector.innerHTML = '<p>No personality profile available. Generate one in the Content Library page first.</p>';
    }
    
    // Disable chat controls
    if (chatInputElement) chatInputElement.disabled = true;
    if (sendChatButton) sendChatButton.disabled = true;
    if (clearChatButton) clearChatButton.disabled = true;
    
    return;
  }
  
  // Update personality selector
  if (personalitySelector) {
    personalitySelector.innerHTML = '';
    
    // Create a simple selector item showing the active profile
    const selectorItem = document.createElement('div');
    selectorItem.className = 'active-profile';
    selectorItem.style.padding = '15px';
    selectorItem.style.backgroundColor = '#eaf2f8';
    selectorItem.style.borderRadius = '5px';
    selectorItem.style.marginBottom = '15px';
    
    selectorItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Active Personality Profile</strong>
        </div>
        <span class="badge" style="background-color: #3498db; color: white; padding: 5px 10px; border-radius: 20px;">Active</span>
      </div>
    `;
    
    personalitySelector.appendChild(selectorItem);
  }
  
  // Create system prompt from personality profile and default values
  const initialSystemPrompt = createSystemPromptFromProfile(currentGeneratedProfile);
  
  // Update system prompt editor
  if (systemPromptEditor) {
    systemPromptEditor.value = initialSystemPrompt;
  }
  
  // Load saved system prompts
  loadSavedSystemPrompts();
  
  // Enable chat controls
  if (chatInputElement) chatInputElement.disabled = false;
  if (sendChatButton) sendChatButton.disabled = false;
  if (clearChatButton) clearChatButton.disabled = false;
}

/**
 * Create a system prompt JSON from the current profile
 * @param {Object} profile - The personality profile
 * @returns {string} - The system prompt JSON as a string
 */
function createSystemPromptFromProfile(profile) {
  const systemPrompt = {
    personality_profile: profile,
    personal_background: {
      key_experiences: [
        "Your digital twin starts with core traits derived from your online content",
        "It evolves as it learns more about you through interactions",
        "It aims to represent you authentically in digital conversations"
      ],
      defining_beliefs: [
        "Your perspective and values matter",
        "Communication should be respectful and meaningful",
        "Personal growth comes through authentic exchange"
      ]
    },
    interaction_context: {
      setting: "casual online conversation",
      audience: "single user",
      formality_level: "conversational",
      purpose: "general assistance and information"
    },
    current_state: {
      mood: "neutral",
      energy_level: "moderate",
      receptiveness: "open"
    },
    cognitive_style: {
      thinking_mode: "balanced analytical and intuitive",
      detail_focus: "moderate",
      response_tempo: "measured",
      trait_variability_percent: 10
    },
    instructions: [
      "Respond based ONLY on the personality profile and context above",
      "Stay in character as the digital twin consistently",
      "Use the Voice qualities and patterns from the profile to shape your communication style",
      "Express the Core Traits and Values authentically",
      "Follow the Relationship style when interacting",
      "Never break character by explaining or discussing how you're using the profile"
    ]
  };
  
  return JSON.stringify(systemPrompt, null, 2);
}

/**
 * Load saved system prompts for the current user
 */
async function loadSavedSystemPrompts() {
  if (!currentUserId || !savedPromptsDropdown) return;
  
  try {
    const response = await fetch(`/api/users/${currentUserId}/system-prompts`);
    
    if (!response.ok) {
      console.error('Failed to load system prompts:', response.status);
      return;
    }
    
    const data = await response.json();
    savedSystemPrompts = data.systemPrompts || [];
    
    // Clear dropdown
    savedPromptsDropdown.innerHTML = '<option value="">-- Select a saved prompt --</option>';
    
    // Add prompts to dropdown
    savedSystemPrompts.forEach((prompt, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = prompt.name;
      savedPromptsDropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading system prompts:', error);
  }
}

/**
 * Select a system prompt from the dropdown
 */
function selectSystemPrompt() {
  if (!systemPromptEditor || !savedPromptsDropdown) return;
  
  const selectedIndex = parseInt(savedPromptsDropdown.value);
  
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= savedSystemPrompts.length) {
    return;
  }
  
  const selectedPrompt = savedSystemPrompts[selectedIndex];
  systemPromptEditor.value = selectedPrompt.prompt;
  
  // Show status
  showStatus(chatStatusDiv, `Loaded system prompt: ${selectedPrompt.name}`, 'success');
}

/**
 * Save the current system prompt (update existing)
 */
async function saveCurrentSystemPrompt() {
  if (!currentUserId || !systemPromptEditor || !savedPromptsDropdown) return;
  
  const selectedIndex = parseInt(savedPromptsDropdown.value);
  
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= savedSystemPrompts.length) {
    // No prompt selected, prompt user to use "Save As" instead
    showStatus(chatStatusDiv, 'Please select a saved prompt to update or use "Save As New" to create a new prompt', 'error');
    return;
  }
  
  const promptName = savedSystemPrompts[selectedIndex].name;
  const promptContent = systemPromptEditor.value;
  
  try {
    // Validate JSON
    try {
      JSON.parse(promptContent);
    } catch (e) {
      showStatus(chatStatusDiv, 'Invalid JSON format in system prompt', 'error');
      return;
    }
    
    // Save prompt
    const response = await fetch(`/api/users/${currentUserId}/system-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: promptName,
        prompt: promptContent
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to save system prompt (${response.status})`);
    }
    
    const data = await response.json();
    
    // Update the local prompts list
    savedSystemPrompts[selectedIndex] = {
      ...savedSystemPrompts[selectedIndex],
      prompt: promptContent,
      updatedAt: new Date().toISOString()
    };
    
    showStatus(chatStatusDiv, `System prompt "${promptName}" updated successfully`, 'success');
  } catch (error) {
    console.error('Error saving system prompt:', error);
    showStatus(chatStatusDiv, `Error saving system prompt: ${error.message}`, 'error');
  }
}

/**
 * Save the current system prompt as a new prompt
 */
async function saveSystemPromptAs() {
  if (!currentUserId || !systemPromptEditor) return;
  
  const promptContent = systemPromptEditor.value;
  
  // Prompt for name
  const promptName = prompt('Enter a name for this system prompt:');
  if (!promptName) return;
  
  try {
    // Validate JSON
    try {
      JSON.parse(promptContent);
    } catch (e) {
      showStatus(chatStatusDiv, 'Invalid JSON format in system prompt', 'error');
      return;
    }
    
    // Save prompt
    const response = await fetch(`/api/users/${currentUserId}/system-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: promptName,
        prompt: promptContent
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to save system prompt (${response.status})`);
    }
    
    const data = await response.json();
    
    // Reload saved prompts
    await loadSavedSystemPrompts();
    
    // Select the new prompt in the dropdown
    if (savedPromptsDropdown) {
      savedPromptsDropdown.value = data.promptId;
    }
    
    showStatus(chatStatusDiv, `System prompt "${promptName}" saved successfully`, 'success');
  } catch (error) {
    console.error('Error saving system prompt:', error);
    showStatus(chatStatusDiv, `Error saving system prompt: ${error.message}`, 'error');
  }
}

/**
 * Send a chat message to the AI, handling streaming response via fetch
 */
async function sendChatMessage() {
  const chatInputField = document.getElementById('chat-input');
  if (!chatInputField || !currentUserId) return;

  const userMessage = chatInputField.value.trim();
  if (userMessage === '') return;

  if (userMessage.toLowerCase() === 'clear') {
    clearChat();
    chatInputField.value = '';
    return;
  }

  addMessageToChat('user', userMessage);
  chatInputField.value = '';
  chatInputField.disabled = true;
  showStatus(chatStatusDiv, "Connecting...", 'loading');

  const assistantMessageWrapper = addMessageToChat('assistant', '');
  const assistantMessageDiv = assistantMessageWrapper.querySelector('.message');
  assistantMessageDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  try {
    const systemPrompt = systemPromptEditor ? systemPromptEditor.value : getDefaultSystemPrompt();
    try {
      JSON.parse(systemPrompt);
    } catch (e) {
      showStatus(chatStatusDiv, 'Error: Invalid JSON in System Prompt. Cannot send message.', 'error');
      chatInputField.disabled = false;
      assistantMessageDiv.textContent = '[Error: Invalid System Prompt]';
      return;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream' // Still indicate we expect SSE
      },
      body: JSON.stringify({
        userId: currentUserId,
        systemPrompt: systemPrompt,
        userMessage: userMessage,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}. ${errorText}`);
    }

    showStatus(chatStatusDiv, "Receiving response...", 'info');
    assistantMessageDiv.innerHTML = ''; // Clear typing indicator

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Stream finished.');
        break;
      }

      // Decode the chunk and add it to the buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages in the buffer
      let boundaryIndex;
      while ((boundaryIndex = buffer.indexOf('\n\n')) >= 0) {
        const message = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        if (message.startsWith('data: ')) {
          const jsonData = message.substring(6);
          try {
            const parsedData = JSON.parse(jsonData);

            if (parsedData.type === 'chunk') {
              accumulatedResponse += parsedData.data;
              assistantMessageDiv.innerHTML = formatMessageContent(accumulatedResponse);
              chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
            } else if (parsedData.type === 'complete') {
              console.log('Stream complete event received.');
              // Final update might be redundant if all chunks were processed
              assistantMessageDiv.innerHTML = formatMessageContent(parsedData.data);
              chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
              // No need to close reader here, loop termination handles it
            } else if (parsedData.type === 'error') {
              console.error('Stream error received from server:', parsedData.error);
              showStatus(chatStatusDiv, `Error: ${parsedData.error}`, 'error');
              assistantMessageDiv.textContent = `[Error: ${parsedData.error}]`;
              reader.cancel(); // Stop reading the stream on server error
              return; // Exit the function
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError, 'Raw data:', jsonData);
          }
        }
      }
    }

    // Append the final part of the buffer (if any)
    if (buffer.startsWith('data: ')) {
      const jsonData = buffer.substring(6);
      try {
        const parsedData = JSON.parse(jsonData);
        if (parsedData.type === 'chunk') {
          accumulatedResponse += parsedData.data;
          assistantMessageDiv.innerHTML = formatMessageContent(accumulatedResponse);
        }
      } catch (parseError) {
        console.error('Error parsing final SSE data:', parseError, 'Raw data:', jsonData);
      }
    }

    // Stream finished successfully
    showStatus(chatStatusDiv, '', 'success'); // Clear status
    chatInputField.disabled = false;
    chatInputField.focus();

  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    showStatus(chatStatusDiv, `Error: ${error.message}`, 'error');
    assistantMessageDiv.textContent = `[Error: ${error.message}]`;
    console.error('Error loading user list:', error);
  }
}

/**
 * Handle actions needed when transitioning to a specific page
 * @param {string} pageId - The ID of the page being navigated to
 */
function handlePageTransition(pageId) {
  if (!currentUserId) return; // Nothing to do if no user is selected
  
  switch (pageId) {
    case 'content-library-page':
      // Refresh assets when navigating to content library
      loadAssets();
      // Also load saved personalities
      loadSavedPersonalities();
      break;
      
    case 'chat-page':
      // Set up chat interface with current profile if available
      updateChatInterface();
      break;
      
    case 'alignment-page':
      // Update alignment page with current assessment data
      updateAlignmentPage();
      break;
  }
}

/**
 * Update the state of navigation tabs based on current user and data availability
 */
function updateNavigationTabsState() {
  if (!navTabs) return;
  
  navTabs.forEach(tab => {
    const pageId = tab.getAttribute('data-page');
    if (!pageId) return;
    
    let shouldEnable = true;
    
    // User setup page is always enabled
    if (pageId === 'user-setup-page') {
      shouldEnable = true;
    }
    // Content Library page only requires a user to be selected
    else if (pageId === 'content-library-page') {
      shouldEnable = !!currentUserId;
    }
    // Chat and alignment pages require a user AND a generated profile
    else if ((pageId === 'chat-page' || pageId === 'alignment-page')) {
      shouldEnable = !!currentUserId && !!currentGeneratedProfile;
    }
    
    console.log(`Tab ${pageId} - shouldEnable: ${shouldEnable} (currentUserId: ${currentUserId}, has profile: ${!!currentGeneratedProfile})`);
    
    if (shouldEnable) {
      tab.classList.remove('disabled');
      tab.style.opacity = '1';
      tab.style.pointerEvents = 'auto';
    } else {
      tab.classList.add('disabled');
      tab.style.opacity = '0.5';
      tab.style.pointerEvents = 'none';
    }
  });
}

/**
 * Navigate to a specific tab
 * @param {string} pageId - ID of the page to navigate to
 */
function navigateToPage(pageId) {
  const tab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
  if (tab && !tab.classList.contains('disabled')) {
    tab.click();
  }
}

// === Saved Personalities Functions ===

/**
 * Load saved personalities for the current user
 */
async function loadSavedPersonalities() {
  if (!currentUserId || !savedPersonalitiesContainer) return;
  
  // Show loading state
  savedPersonalitiesContainer.innerHTML = '<p>Loading saved personalities...</p>';
  
  try {
    // Fetch personality data from the API
    const response = await fetch(`/api/personality/${currentUserId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No personalities found
        savedPersonalitiesContainer.innerHTML = '<p id="no-personalities-message">No personality profiles generated yet. Use the "Generate Personality" section above to create one.</p>';
        return;
      }
      throw new Error(`Failed to load personalities (${response.status})`);
    }
    
    const data = await response.json();
    
    // Check if personality data exists
    if (!data.personality) {
      savedPersonalitiesContainer.innerHTML = '<p id="no-personalities-message">No personality profiles generated yet. Use the "Generate Personality" section above to create one.</p>';
      return;
    }
    
    // Clear container and display the personality
    savedPersonalitiesContainer.innerHTML = '';
    
    // We'll create a card for the personality profile
    const card = createProfileCard(data.personality, data.generatedAt || new Date().toISOString());
    savedPersonalitiesContainer.appendChild(card);
  } catch (error) {
    console.error('Error loading saved personalities:', error);
    savedPersonalitiesContainer.innerHTML = `<p class="error">Error loading personalities: ${error.message}</p>`;
  }
}

/**
 * Create a profile card element for a personality
 * @param {Object} profile - The personality profile data
 * @param {string} timestamp - Creation timestamp
 * @returns {HTMLElement} The card element
 */
function createProfileCard(profile, timestamp) {
  if (!profileCardTemplate) {
    const fallback = document.createElement('div');
    fallback.textContent = 'Profile card template not found';
    return fallback;
  }
  
  const clone = document.importNode(profileCardTemplate.content, true);
  const card = clone.querySelector('.profile-card');
  
  // Set title and date
  const titleEl = card.querySelector('.profile-card-title');
  const dateEl = card.querySelector('.profile-card-date');
  
  titleEl.textContent = 'Personality Profile';
  dateEl.textContent = new Date(timestamp).toLocaleString();
  
  // Add trait badges if big_five_traits are available
  const traitsEl = card.querySelector('.traits-summary');
  if (profile.big_five_traits) {
    for (const [trait, level] of Object.entries(profile.big_five_traits)) {
      const badge = document.createElement('span');
      badge.className = 'trait-badge';
      badge.textContent = `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${level}`;
      
      // Add color based on level
      if (level === 'high') {
        badge.style.backgroundColor = '#d4edda';
        badge.style.color = '#155724';
      } else if (level === 'low') {
        badge.style.backgroundColor = '#f8d7da';
        badge.style.color = '#721c24';
      }
      
      traitsEl.appendChild(badge);
    }
  }
  
  // Setup button actions
  const viewBtn = card.querySelector('.view-profile-button');
  const chatBtn = card.querySelector('.use-for-chat-button');
  const assessBtn = card.querySelector('.use-for-assessment-button');
  
  viewBtn.addEventListener('click', () => {
    // Show profile in the modal
    showProfileModal(profile);
  });
  
  chatBtn.addEventListener('click', () => {
    // Set this profile as active and navigate to chat page
    currentGeneratedProfile = profile;
    updateChatSystemPrompt();
    navigateToPage('chat-page');
  });
  
  assessBtn.addEventListener('click', () => {
    // Set this profile for assessment and navigate to alignment page
    currentGeneratedProfile = profile;
    navigateToPage('alignment-page');
  });
  
  return card;
}

/**
 * Show a personality profile in a modal
 * @param {Object} profile - The personality profile to display
 */
function showProfileModal(profile) {
  if (!previewModal || !modalTitle || !modalContent) return;
  
  modalTitle.textContent = 'Personality Profile';
  modalContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word;">${JSON.stringify(profile, null, 2)}</pre>`;
  previewModal.style.display = 'block';
}

// === Chat Interface Functions ===

/**
 * Update the chat interface with the current profile
 */
function updateChatInterface() {
  if (!currentGeneratedProfile) {
    // No profile available
    if (personalitySelector) {
      personalitySelector.innerHTML = '<p>No personality profile available. Generate one in the Content Library page first.</p>';
    }
    
    // Disable chat controls
    if (chatInputElement) chatInputElement.disabled = true;
    if (sendChatButton) sendChatButton.disabled = true;
    if (clearChatButton) clearChatButton.disabled = true;
    
    return;
  }
  
  // Update personality selector
  if (personalitySelector) {
    personalitySelector.innerHTML = '';
    
    // Create a simple selector item showing the active profile
    const selectorItem = document.createElement('div');
    selectorItem.className = 'active-profile';
    selectorItem.style.padding = '15px';
    selectorItem.style.backgroundColor = '#eaf2f8';
    selectorItem.style.borderRadius = '5px';
    selectorItem.style.marginBottom = '15px';
    
    selectorItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Active Personality Profile</strong>
        </div>
        <span class="badge" style="background-color: #3498db; color: white; padding: 5px 10px; border-radius: 20px;">Active</span>
      </div>
    `;
    
    personalitySelector.appendChild(selectorItem);
  }
  
  // Create system prompt from personality profile and default values
  const initialSystemPrompt = createSystemPromptFromProfile(currentGeneratedProfile);
  
  // Update system prompt editor
  if (systemPromptEditor) {
    systemPromptEditor.value = initialSystemPrompt;
  }
  
  // Load saved system prompts
  loadSavedSystemPrompts();
  
  // Enable chat controls
  if (chatInputElement) chatInputElement.disabled = false;
  if (sendChatButton) sendChatButton.disabled = false;
  if (clearChatButton) clearChatButton.disabled = false;
}

/**
 * Toggle between simple and detailed chat interface
 * @param {Event} event - The change event
 */
function toggleSimpleMode(event) {
  const isSimpleMode = event.target.checked;
  
  // Save preference
  localStorage.setItem('simpleModeEnabled', isSimpleMode.toString());
  
  // Get all the sections to toggle
  const jsonSection = document.querySelector('.json-section');
  const loreSection = document.querySelector('.lore-section');
  const paramsSection = document.querySelector('.params-section');
  const psychSection = document.querySelector('.psych-section');
  const cogSection = document.querySelector('.cog-section');
  const promptSection = document.querySelector('.prompt-section');
  
  // Get the chat history section for adjusting height
  const chatHistorySection = document.getElementById('chat-history');
  
  if (isSimpleMode) {
    // Hide all advanced sections
    if (jsonSection) jsonSection.style.display = 'none';
    if (loreSection) loreSection.style.display = 'none';
    if (paramsSection) paramsSection.style.display = 'none';
    if (psychSection) psychSection.style.display = 'none';
    if (cogSection) cogSection.style.display = 'none';
    if (promptSection) promptSection.style.display = 'none';
    
    // Make chat history taller
    if (chatHistorySection) {
      chatHistorySection.style.height = '500px';
    }
    } else {
    // Show all sections
    if (jsonSection) jsonSection.style.display = 'block';
    if (loreSection) loreSection.style.display = 'block';
    if (paramsSection) paramsSection.style.display = 'block';
    if (psychSection) psychSection.style.display = 'block';
    if (cogSection) cogSection.style.display = 'block';
    if (promptSection) promptSection.style.display = 'block';
    
    // Reset chat history height
    if (chatHistorySection) {
      chatHistorySection.style.height = '300px';
    }
  }
}

/**
 * Handle form submission for user assessment
 * @param {Event} event - The form submission event
 */
async function handleUserAssessmentSubmit(event) {
  event.preventDefault();
  
  if (!currentUserId) {
    showStatus(userAssessmentStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  // Check if all questions are answered
  const form = event.target;
  const inputs = form.querySelectorAll('input[type="radio"]:checked');
  
  if (inputs.length < TIPI_ITEMS.length) {
    showStatus(userAssessmentStatusDiv, 'Please answer all questions', 'error');
    return;
  }
  
  // Collect scores
  const scores = {};
  inputs.forEach(input => {
    scores[input.name] = parseInt(input.value);
  });
  
  // Save to state
  userTipiScores = scores;
  
  showStatus(userAssessmentStatusDiv, 'Saving assessment results...', 'loading');
  
  try {
    // Save to server
    await saveUserAssessmentData();
    
    // Update UI
    updateAssessmentUI();
    
    showStatus(userAssessmentStatusDiv, 'Assessment completed successfully!', 'success');
    
    // Check if we should navigate to alignment page
    if (currentGeneratedProfile) {
      // Enable AI assessment button
      if (runAIAssessmentButton) {
        runAIAssessmentButton.disabled = false;
      }
    }
  } catch (error) {
    console.error('Error saving assessment:', error);
    showStatus(userAssessmentStatusDiv, `Error saving assessment: ${error.message}`, 'error');
  }
}

/**
 * Save the user assessment data to the server
 */
async function saveUserAssessmentData() {
  if (!currentUserId || !userTipiScores) return;
  
  const response = await fetch(`/api/users/${currentUserId}/assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userTipiScores,
      aiTipiScores
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to save assessment (${response.status})`);
  }
}

/**
 * Handle retaking the user assessment
 */
function handleRetakeAssessment() {
  if (!currentUserId) {
    showStatus(userAssessmentStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  // Confirm retake
  const confirmRetake = confirm('Are you sure you want to retake the assessment? Your previous results will be lost.');
  if (!confirmRetake) return;
  
  // Reset user scores
  userTipiScores = null;
  
  // Clear form
  if (tipiForm) {
    tipiForm.reset();
  }
  
  // Update UI
  updateAssessmentUI();
  
  showStatus(userAssessmentStatusDiv, 'Please complete the assessment form', 'info');
}

function createRadarChart(userDimensions, aiDimensions) {
  if (!radarChartCanvas) return;
  
  // Destroy existing chart if it exists
  if (window.myRadarChart) {
    window.myRadarChart.destroy();
  }
  
  // Convert dimensions to arrays for Chart.js
  const labels = [];
  const userData = [];
  const aiData = [];
  
  // Using the order: O, C, E, A, N
  const order = ['O', 'C', 'E', 'A', 'N'];
  const dimensionLabels = {
    'O': 'Openness',
    'C': 'Conscientiousness',
    'E': 'Extraversion',
    'A': 'Agreeableness',
    'N': 'Neuroticism'
  };
  
  order.forEach(dim => {
    labels.push(dimensionLabels[dim]);
    userData.push(userDimensions[dim]);
    aiData.push(aiDimensions[dim]);
  });
  
  // Create radar chart using Chart.js
  const ctx = radarChartCanvas.getContext('2d');
  window.myRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Your Assessment',
          data: userData,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        },
        {
          label: 'AI Profile',
          data: aiData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgb(255, 99, 132)',
          pointBackgroundColor: 'rgb(255, 99, 132)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(255, 99, 132)'
        }
      ]
    },
    options: {
      elements: {
        line: {
          borderWidth: 3
        }
      },
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 1,
          suggestedMax: 5
        }
      }
    }
  });
}

// === Modify generatePersonalityProfile to update navigation ===

async function generatePersonalityProfile() {
  if (!currentUserId) {
    showStatus(personalityGenerationStatusDiv, "Please select or create a User first.", "error");
    return;
  }
  if (selectedAssets.size === 0) {
    showStatus(personalityGenerationStatusDiv, 'Please select at least one asset', 'error');
    return;
  }
  
  console.log("Starting personality generation:", {
    userId: currentUserId,
    selectedAssets: Array.from(selectedAssets),
    promptLength: personalityPromptTextarea?.value?.length || 0
  });
  
  generatePersonalityButton.disabled = true;
  showStatus(personalityGenerationStatusDiv, 'Generating personality profile...', 'loading');
  personalityJsonOutputPre.textContent = 'Generating...';
  copyJsonButton.style.display = 'none';
  
  try {
    console.log("Making API request to /api/personality/generate with payload:", {
      userId: currentUserId,
      assetIds: Array.from(selectedAssets).slice(0, 5), // Only log first 5 assets to avoid console spam
      assetCount: selectedAssets.size,
      promptLength: personalityPromptTextarea.value.length
    });
    
    const response = await fetch('/api/personality/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        assetIds: Array.from(selectedAssets),
        prompt: personalityPromptTextarea.value
      })
    });
    
    console.log("API response status:", response.status, response.statusText);
    
    // Check for non-OK responses first
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      console.log("Error response content type:", contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error("API error response (JSON):", errorData);
        throw new Error(errorData.error || `Failed to generate profile (${response.status})`);
      } else {
        // Handle non-JSON error responses (like HTML error pages)
        const errorText = await response.text();
        console.error("API error response (non-JSON):", errorText.substring(0, 500) + "...");
        throw new Error(`Server error (${response.status}): The server returned an HTML error page instead of JSON`);
      }
    }
    
    // Parse successful response
    const data = await response.json();
    console.log("Generation API successful response:", data);
    
    if (data.success) {
      currentGeneratedProfile = data.personalityJSON;
      personalityJsonOutputPre.textContent = JSON.stringify(currentGeneratedProfile, null, 2);
      showStatus(personalityGenerationStatusDiv, 'Personality profile generated successfully!', 'success');
      copyJsonButton.style.display = 'inline-block';
      personalityJsonOutputPre.style.display = 'block'; // Make the output visible
      updateChatSystemPrompt();
      
      // After successful generation, update saved personalities
      loadSavedPersonalities();
      
      // Update navigation tabs state to enable chat and alignment
      updateNavigationTabsState();
      
      updateAssessmentUI(); // Update assessment UI state
    } else {
      console.error("API returned success: false with data:", data);
      throw new Error(data.error || "Unknown error during generation");
    }
  } catch (error) {
    console.error('Error generating personality profile:', error);
    showStatus(personalityGenerationStatusDiv, `Generation Error: ${error.message}`, 'error');
    personalityJsonOutputPre.textContent = `Error: ${error.message}`;
  } finally {
    // Re-enable generate button if assets still selected
    generatePersonalityButton.disabled = selectedAssets.size === 0;
    
    // Ensure button state is updated
    updateGenerateButtonState();
  }
}

// === Modify handleUserSelect to update navigation ===

async function handleUserSelect() {
  const selectedUserId = userSelectDropdown.value;
  // Clear previous state immediately
  clearUIState(); 
  
  if (!selectedUserId) {
    currentUserId = null;
    currentUserDisplaySpan.textContent = "None Selected";
    showStatus(userStatusDiv, "Select a user to begin.", "warning");
    updateNavigationTabsState(); // Disable navigation tabs
    return;
  }

  currentUserId = selectedUserId;
  currentUserDisplaySpan.textContent = currentUserId;
  showStatus(userStatusDiv, `Loading data for user: ${currentUserId}...`, 'loading');
  console.log(`User selected: ${currentUserId}`);

  try {
    const response = await fetch(`/api/users/${currentUserId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load user data (${response.status})`);
    }
    const userData = await response.json();
    console.log("Loaded user data:", userData);
    
    // Load bio if present
    if (userBioTextarea) {
      userBioTextarea.value = userData.bio || "";
    }
    
    // Populate UI based on loaded data
    currentPersonalityPrompt = userData.generation?.customPrompt || getDefaultPersonalityPrompt();
    if (personalityPromptTextarea) {
    personalityPromptTextarea.value = currentPersonalityPrompt;
    }
    
    currentGeneratedProfile = userData.generation?.lastGeneratedProfile?.json || null;
    
    // Ensure chatContext exists before accessing nested properties
    const chatContext = userData.chatContext || {};
    
    // Set value or default for each context field - adding null checks
    if (chatLoreInput) chatLoreInput.value = chatContext.lore || DEFAULT_PERSONAL_BACKGROUND; 
    if (chatParamsInput) chatParamsInput.value = chatContext.simulationParams || DEFAULT_INTERACTION_CONTEXT;
    if (chatPsychStateInput) chatPsychStateInput.value = chatContext.psychologicalState || DEFAULT_PSYCH_STATE;
    if (chatCogStyleInput) chatCogStyleInput.value = chatContext.cognitiveStyle || DEFAULT_COG_STYLE;
    
    // Reset border styles in case they were previously invalid
    [chatLoreInput, chatParamsInput, chatPsychStateInput, chatCogStyleInput].forEach(input => {
      if (input) input.style.border = "1px solid #ddd";
    });
    
    userTipiScores = userData.assessment?.userTipiScores || null;
    aiTipiScores = userData.assessment?.aiTipiScores || null;
    restoreUserAssessmentFormState(); // Update form based on loaded scores
    
    // currentChatHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : []; // DON'T load history
    currentChatHistory = []; // Always start with empty history
    
    // Define renderChatHistory locally before calling it
    // function renderChatHistory() { ... } // REMOVE LOCAL DEFINITION
    renderChatHistory(); // Display loaded history - KEEP GLOBAL CALL (will now clear the display)

    updateChatSystemPrompt(); // Update display with loaded profile/lore/params
    
    // Load assets for this user 
    await loadAssets(currentUserId);
    
    // Update navigation state
    updateNavigationTabsState();
    
    // Explicitly load TIPI questions
    loadTipiQuestions();
    
    // Update assessment UI
    updateAssessmentUI();
    
    // Display results if they exist for this user
    if (aiTipiScores) {
      calculateAndDisplayAlignment();
    }
    
    showStatus(userStatusDiv, `Loaded data for user: ${currentUserId}.`, 'success');

  } catch (error) {
    console.error("Error loading user data:", error);
    showStatus(userStatusDiv, `Error loading data: ${error.message}`, 'error');
    clearUIState(); // Reset UI if data loading fails
  }
}

/**
 * Handle the creation of a new user
 */
async function handleCreateUser() {
  const userId = newUserInput.value.trim();
  
  // Validate input
  if (!userId) {
    showStatus(userStatusDiv, 'Please enter a user ID', 'error');
    return;
  }
  
  // Check for invalid characters
  const validFormat = /^[a-zA-Z0-9_-]+$/;
  if (!validFormat.test(userId)) {
    showStatus(userStatusDiv, 'User ID can only contain letters, numbers, underscores, and hyphens', 'error');
    return;
  }
  
  showStatus(userStatusDiv, `Creating new user: ${userId}...`, 'loading');
  
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to create user (${response.status})`);
    }
    
    const userData = await response.json();
    
    // Add the new user to the dropdown
    const option = document.createElement('option');
    option.value = userData.id;
    option.textContent = userData.id;
    userSelectDropdown.appendChild(option);
    
    // Select the new user
    userSelectDropdown.value = userData.id;
    
    // Trigger change event to load the new user
    const changeEvent = new Event('change');
    userSelectDropdown.dispatchEvent(changeEvent);
    
    // Clear the input field
    newUserInput.value = '';
    
    showStatus(userStatusDiv, `Created new user: ${userData.id}`, 'success');
  } catch (error) {
    console.error('Error creating user:', error);
    showStatus(userStatusDiv, `Error creating user: ${error.message}`, 'error');
  }
}

/**
 * Handle saving the user bio
 */
async function handleSaveBio() {
  // Check if a user is selected
  if (!currentUserId) {
    showStatus(bioStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  const bioText = userBioTextarea.value.trim();
  
  showStatus(bioStatusDiv, 'Saving bio...', 'loading');
  
  try {
    const response = await fetch(`/api/users/${currentUserId}/bio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bio: bioText })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to save bio (${response.status})`);
    }
    
    const result = await response.json();
    
    showStatus(bioStatusDiv, 'Bio saved successfully', 'success');
  } catch (error) {
    console.error('Error saving bio:', error);
    showStatus(bioStatusDiv, `Error saving bio: ${error.message}`, 'error');
  }
}

/**
 * Handle website scraping
 */
async function handleScrape() {
  if (!currentUserId) {
    showStatus(scrapeStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  const url = scrapeUrlInput.value.trim();
  if (!url) {
    showStatus(scrapeStatusDiv, 'Please enter a URL to scrape', 'error');
    return;
  }
  
  // Validate URL format
  try {
    new URL(url); // Will throw if not a valid URL
  } catch (error) {
    showStatus(scrapeStatusDiv, 'Please enter a valid URL including http:// or https://', 'error');
    return;
  }
  
  showStatus(scrapeStatusDiv, 'Scraping website...', 'loading');
  
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: currentUserId, url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to scrape website (${response.status})`);
    }
    
    const data = await response.json();
    showStatus(scrapeStatusDiv, `Successfully scraped ${data.contentItems || 0} items from website`, 'success');
    
    // Refresh assets list if we're on that page
    if (document.getElementById('content-library-page').classList.contains('active')) {
      loadAssets();
    }
  } catch (error) {
    console.error('Error scraping website:', error);
    showStatus(scrapeStatusDiv, `Error scraping website: ${error.message}`, 'error');
  }
}

/**
 * Handle file upload
 */
async function handleUpload() {
  if (!currentUserId) {
    showStatus(uploadStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  if (!fileInputElement || fileInputElement.files.length === 0) {
    showStatus(uploadStatusDiv, 'Please select files to upload', 'error');
    return;
  }
  
  const files = fileInputElement.files;
  const formData = new FormData();
  
  // Add each file to form data
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  
  // Add user ID
  formData.append('userId', currentUserId);
  
  showStatus(uploadStatusDiv, 'Uploading files...', 'loading');
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData // No Content-Type header for FormData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to upload files (${response.status})`);
    }
    
    const data = await response.json();
    
    // Reset the file input
    fileInputElement.value = '';
    
    showStatus(uploadStatusDiv, `Successfully uploaded ${data.filesUploaded || 0} files`, 'success');
    
    // Refresh assets if we're on that page
    if (document.getElementById('content-library-page').classList.contains('active')) {
      loadAssets();
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    showStatus(uploadStatusDiv, `Error uploading files: ${error.message}`, 'error');
  }
}

// Declare global variables for LinkedIn connection management
let isLinkedInConnected = false;
const linkedInAssetSourceName = 'linkedin';

/**
 * Handle LinkedIn connection
 */
function handleLinkedInConnect() {
  if (!currentUserId) {
    showStatus(scrapeStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  // Redirect to LinkedIn OAuth endpoint with user ID
  window.location.href = `/api/auth/linkedin?user_id=${encodeURIComponent(currentUserId)}`;
}

/**
 * Handle LinkedIn disconnection
 */
function handleLinkedInDisconnect() {
  if (!currentUserId) {
    showStatus(scrapeStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  if (confirm("Are you sure you want to disconnect your LinkedIn account? This will remove access but keep any imported data.")) {
    // Delete just the LinkedIn assets
    deleteLinkedInAssets();
  }
}

/**
 * Delete LinkedIn assets for the current user
 */
async function deleteLinkedInAssets() {
  if (!currentUserId) return;
  
  showStatus(scrapeStatusDiv, 'Disconnecting LinkedIn...', 'loading');
  
  try {
    // Get all assets
    const response = await fetch(`/api/assets/${currentUserId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load assets (${response.status})`);
    }
    
    const assets = await response.json();
    
    // Filter for LinkedIn assets only
    const linkedInAssets = assets.filter(asset => 
      asset.metadata && 
      (asset.metadata.sourceType === 'linkedin' || 
       asset.metadata.context === 'LinkedIn Profile' ||
       (asset.metadata.sourceUrl && asset.metadata.sourceUrl.includes('linkedin.com')))
    );
    
    if (linkedInAssets.length === 0) {
      showStatus(scrapeStatusDiv, 'No LinkedIn data found to disconnect', 'info');
      updateLinkedInConnectionUI(false);
      return;
    }
    
    // Delete each LinkedIn asset
    const assetIds = linkedInAssets.map(asset => asset.id);
    
    const deleteResponse = await fetch(`/api/assets/${currentUserId}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assetIds: assetIds
      })
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(errorData.error || `Failed to delete LinkedIn assets (${deleteResponse.status})`);
    }
    
    // Update UI
    showStatus(scrapeStatusDiv, 'LinkedIn disconnected successfully', 'success');
    updateLinkedInConnectionUI(false);
    
    // Refresh assets if we're on that page
    if (document.getElementById('content-library-page').classList.contains('active')) {
      loadAssets();
    }
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    showStatus(scrapeStatusDiv, `Error disconnecting LinkedIn: ${error.message}`, 'error');
  }
}

/**
 * Update the LinkedIn connection UI based on connection state
 * @param {boolean} isConnected - Whether LinkedIn is connected
 */
function updateLinkedInConnectionUI(isConnected) {
  const connectButton = document.getElementById('connect-linkedin-button');
  const disconnectButton = document.getElementById('disconnect-linkedin-button');
  const statusBadge = document.getElementById('linkedin-status-badge');
  
  if (!connectButton || !disconnectButton || !statusBadge) return;
  
  isLinkedInConnected = isConnected;
  
  if (isConnected) {
    connectButton.style.display = 'none';
    disconnectButton.style.display = 'flex';
    statusBadge.style.display = 'inline';
  } else {
    connectButton.style.display = 'flex';
    disconnectButton.style.display = 'none';
    statusBadge.style.display = 'none';
  }
}

/**
 * Check if the user has LinkedIn connected by looking for LinkedIn assets
 */
async function checkLinkedInConnectionStatus() {
  if (!currentUserId) return;
  
  try {
    const response = await fetch(`/api/assets/${currentUserId}`);
    
    if (!response.ok) {
      return; // Silently fail
    }
    
    const assets = await response.json();
    
    // Look for LinkedIn assets
    const hasLinkedIn = assets.some(asset => 
      asset.metadata && 
      (asset.metadata.sourceType === 'linkedin' || 
       asset.metadata.context === 'LinkedIn Profile' ||
       (asset.metadata.sourceUrl && asset.metadata.sourceUrl.includes('linkedin.com')))
    );
    
    updateLinkedInConnectionUI(hasLinkedIn);
  } catch (error) {
    console.error('Error checking LinkedIn connection status:', error);
  }
}

/**
 * Handle asset selection change
 * @param {Event} event - The change event
 */
function handleAssetSelectionChange(event) {
  if (!event.target.classList.contains('asset-select')) return;

  const assetId = event.target.dataset.assetId;
  const isChecked = event.target.checked;
  
  if (isChecked) {
    selectedAssets.add(assetId);
  } else {
    selectedAssets.delete(assetId);
  }
  
  // Update UI to show how many assets are selected
  updateSelectionUI();
  
  // Update generate button state based on current selections
  updateGenerateButtonState();
}

/**
 * Handle clicks on the asset display area, including selection/deselection
 * @param {Event} event - The click event
 */
function handleAssetAreaClick(event) {
  // Handle asset preview requests when preview button clicked
  if (event.target.classList.contains('preview-button')) {
    const assetId = event.target.dataset.assetId;
    if (assetId) {
      previewAsset(assetId);
    }
  }
}

/**
 * Select all text assets
 */
function selectAllTextAssets() {
  // Find all text asset checkboxes
  const textAssetCheckboxes = document.querySelectorAll('.asset-select[data-asset-type="text"]');
  
  textAssetCheckboxes.forEach(checkbox => {
    // Check it if not already checked
    if (!checkbox.checked) {
      checkbox.checked = true;
      selectedAssets.add(checkbox.dataset.assetId);
    }
  });
  
  // Update UI
  updateSelectionUI();
  
  // Update generate button state
  updateGenerateButtonState();
}

/**
 * Select all image assets
 */
function selectAllImageAssets() {
  // Find all image asset checkboxes
  const imageAssetCheckboxes = document.querySelectorAll('.asset-select[data-asset-type="image"]');
  
  imageAssetCheckboxes.forEach(checkbox => {
    // Check it if not already checked
    if (!checkbox.checked) {
      checkbox.checked = true;
      selectedAssets.add(checkbox.dataset.assetId);
    }
  });
  
  // Update UI
  updateSelectionUI();
  
  // Update generate button state
  updateGenerateButtonState();
}

/**
 * Deselect all assets
 */
function deselectAllAssets() {
  // Find all asset checkboxes
  const assetCheckboxes = document.querySelectorAll('.asset-select');
  
  assetCheckboxes.forEach(checkbox => {
    // Uncheck it if checked
    if (checkbox.checked) {
      checkbox.checked = false;
  }
  });
  
  // Clear the selected assets set
  selectedAssets.clear();
  
  // Update UI
  updateSelectionUI();
  
  // Update generate button state
  updateGenerateButtonState();
}

/**
 * Delete selected assets
 */
async function deleteSelectedAssets() {
  if (!currentUserId || selectedAssets.size === 0) return;
  
  const confirmDelete = confirm(`Are you sure you want to delete ${selectedAssets.size} selected asset(s)?`);
  if (!confirmDelete) return;
  
  showStatus(uploadStatusDiv, 'Deleting selected assets...', 'loading');
  
  try {
    const response = await fetch(`/api/assets/${currentUserId}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssets)
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete assets (${response.status})`);
    }
    
    const data = await response.json();
    
    // Clear selection
    selectedAssets.clear();
    
    // Refresh assets
    loadAssets();
    
    showStatus(uploadStatusDiv, `Successfully deleted ${data.deletedCount || 0} assets`, 'success');
  } catch (error) {
    console.error('Error deleting assets:', error);
    showStatus(uploadStatusDiv, `Error deleting assets: ${error.message}`, 'error');
  }
}

/**
 * Preview an asset in a modal
 * @param {string} assetId - The ID of the asset to preview
 */
async function previewAsset(assetId) {
  if (!assetId || !previewModal) return;
  
  console.log(`Starting preview for asset ID: ${assetId}`);
  
  try {
    // Set modal title
    if (modalTitle) {
      modalTitle.textContent = 'Asset Preview';
    }
    
    // Clear previous content
    if (modalContent) {
      modalContent.innerHTML = '';
    }
    
    // Get the preview content
    console.log(`Fetching content from /api/assets/${assetId}/preview`);
    const response = await fetch(`/api/assets/${assetId}/preview`);
    
    console.log(`Preview response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Failed to load asset content (${response.status})`);
    }
    
    // Get content type to determine how to handle the response
    const contentType = response.headers.get('Content-Type');
    console.log(`Content-Type: ${contentType}`);
    
    // For image content types, create an image element
    if (contentType && contentType.startsWith('image/')) {
      console.log('Detected image content type, handling as image');
      
      // Create image element using direct URL to preview endpoint
      if (modalContent) {
        const img = document.createElement('img');
        img.src = `/api/assets/${assetId}/content`;
        img.style.maxWidth = '100%';
        img.alt = 'Image preview';
        
        img.onload = function() {
          console.log('Image loaded successfully:', img.naturalWidth, 'x', img.naturalHeight);
        };
        
        img.onerror = function(e) {
          console.error('Error loading image:', e);
          modalContent.innerHTML = `<p>Error loading image preview. Details: ${e.type}</p>`;
          
          // Try a fallback approach using a direct asset path
          console.log('Trying fallback image path');
          img.src = `/assets/${assetId}`;
        };
        
        modalContent.appendChild(img);
        console.log('Image element added to modal');
      }
    } 
    // For JSON content
    else if (contentType && contentType.includes('application/json')) {
      console.log('Handling JSON response');
      const assetData = await response.json();
      console.log('JSON data:', assetData);
      
    if (modalContent) {
        if (typeof assetData === 'object') {
          // Format JSON nicely
          modalContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word;">${JSON.stringify(assetData, null, 2)}</pre>`;
      } else {
          // If it's just text in a JSON response
          modalContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word;">${assetData}</pre>`;
        }
      }
    } 
    // For all other types, handle as text
    else {
      console.log('Handling as text response');
      const content = await response.text();
      console.log(`Text content (first 100 chars): ${content.substring(0, 100)}...`);
      
      if (modalContent) {
        modalContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word;">${content}</pre>`;
      }
    }
    
    // Show the modal
    console.log('Displaying preview modal');
    previewModal.style.display = 'block';
  } catch (error) {
    console.error('Error previewing asset:', error);
    alert(`Error previewing asset: ${error.message}`);
    
    // Add the error message to the modal as well
    if (modalContent) {
      modalContent.innerHTML = `<div class="error">Error previewing asset: ${error.message}</div>`;
      previewModal.style.display = 'block';
    }
  }
}

/**
 * Load assets for the current user
 */
async function loadAssets() {
  if (!currentUserId || !assetDisplayArea) return;
  
  // Show loading state
  assetDisplayArea.innerHTML = '<p>Loading assets...</p>';
  
  try {
    const response = await fetch(`/api/assets/${currentUserId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load assets (${response.status})`);
    }
    
    const assets = await response.json();
    
    // Check for LinkedIn assets and update connection status
    const hasLinkedIn = assets.some(asset => 
      asset.metadata && 
      (asset.metadata.sourceType === 'linkedin' || 
       asset.metadata.context === 'LinkedIn Profile' ||
       (asset.metadata.sourceUrl && asset.metadata.sourceUrl.includes('linkedin.com')))
    );
    updateLinkedInConnectionUI(hasLinkedIn);
    
    // Check if there are any assets
    if (!assets || assets.length === 0) {
      assetDisplayArea.innerHTML = '<p>No assets found. Upload files or scrape a website to add content.</p>';
      return;
    }
    
    // Clear container
    assetDisplayArea.innerHTML = '';
    
    // Group assets by source
    const assetsBySource = {};
    
    assets.forEach(asset => {
      // Determine source with special handling for LinkedIn
      let source = 'Other';
      if (asset.metadata) {
        if (asset.metadata.sourceType === 'linkedin' || 
            asset.metadata.context === 'LinkedIn Profile' ||
            (asset.metadata.sourceUrl && asset.metadata.sourceUrl.includes('linkedin.com'))) {
          source = linkedInAssetSourceName;
        } else if (asset.metadata.sourceUrl) {
          source = new URL(asset.metadata.sourceUrl).hostname || asset.metadata.sourceUrl;
        } else if (asset.metadata.source) {
          source = asset.metadata.source;
        } else if (asset.source) {
          source = asset.source;
        }
      }
      
      if (!assetsBySource[source]) {
        assetsBySource[source] = [];
      }
      assetsBySource[source].push(asset);
    });
    
    // Create groups for each source
    for (const [source, sourceAssets] of Object.entries(assetsBySource)) {
      // Create a group for this source if there are assets
      if (sourceAssets.length > 0) {
        const groupElement = createAssetGroup(source, sourceAssets);
        assetDisplayArea.appendChild(groupElement);
      }
    }
    
    // Update selection UI
    updateSelectionUI();
  } catch (error) {
    console.error('Error loading assets:', error);
    assetDisplayArea.innerHTML = `<p class="error">Error loading assets: ${error.message}</p>`;
  }
}

/**
 * Create an asset group element
 * @param {string} source - The source of the assets
 * @param {Array} assets - The assets for this source
 * @returns {HTMLElement} The group element
 */
function createAssetGroup(source, assets) {
  if (!assetGroupTemplate) {
    // Fallback if template not found
    const fallback = document.createElement('div');
    fallback.textContent = `Group template not found - ${source}: ${assets.length} assets`;
    return fallback;
  }
  
  // Clone the template
  const clone = document.importNode(assetGroupTemplate.content, true);
  const group = clone.querySelector('.asset-group');
  
  // Set group title
  const titleEl = group.querySelector('.asset-group-title');
  const countEl = group.querySelector('.asset-count');
  
  if (titleEl) titleEl.textContent = source;
  
  // Set count in the title if countEl exists
  if (countEl) {
    countEl.textContent = `${assets.length} asset${assets.length === 1 ? '' : 's'}`;
  } else {
    // If countEl doesn't exist, append count to the title
    if (titleEl) {
      titleEl.textContent = `${source} (${assets.length} asset${assets.length === 1 ? '' : 's'})`;
    }
  }
  
  // Get references to the text and image grid containers
  const textGrid = group.querySelector('.text-content-grid');
  const imageGrid = group.querySelector('.image-content-grid');
  
  if (!textGrid || !imageGrid) {
    console.error('Text or image grid not found in asset group template');
    return group;
  }
  
  // Clear the default "no assets" messages
  textGrid.innerHTML = '';
  imageGrid.innerHTML = '';
  
  // Separate assets by type
  const textAssets = assets.filter(asset => !asset.mimetype.startsWith('image/'));
  const imageAssets = assets.filter(asset => asset.mimetype.startsWith('image/'));
  
  // Add text assets to the text grid
  if (textAssets.length > 0) {
    textAssets.forEach(asset => {
      const assetCard = createAssetCard(asset);
      textGrid.appendChild(assetCard);
    });
  } else {
    textGrid.innerHTML = '<p>No text assets for this source.</p>';
  }
  
  // Add image assets to the image grid
  if (imageAssets.length > 0) {
    imageAssets.forEach(asset => {
      const assetCard = createAssetCard(asset);
      imageGrid.appendChild(assetCard);
    });
  } else {
    imageGrid.innerHTML = '<p>No image assets for this source.</p>';
  }
  
  // Add special data attribute for LinkedIn assets for better visibility
  if (source === 'linkedin' || source === 'LinkedIn Profile') {
    group.dataset.specialSource = 'linkedin';
    group.style.backgroundColor = '#f0f8ff'; // Light blue background
    group.style.padding = '15px';
    group.style.borderRadius = '8px';
    group.style.borderLeft = '4px solid #0077b5'; // LinkedIn blue
    
    // Log for debugging
    console.log(`Created LinkedIn asset group with ${textAssets.length} text assets and ${imageAssets.length} image assets`);
  }
  
  return group;
}

/**
 * Create an asset card element
 * @param {Object} asset - The asset data
 * @returns {HTMLElement} The card element
 */
function createAssetCard(asset) {
  if (!assetCardTemplate) {
    // Fallback if template not found
    const fallback = document.createElement('div');
    fallback.textContent = `Asset card template not found - ${asset.filename}`;
    return fallback;
  }
  
  // Clone the template
  const clone = document.importNode(assetCardTemplate.content, true);
  const card = clone.querySelector('.content-card');
  
  // Set card ID for selection
  card.dataset.assetId = asset.id;
  
  // Set class based on asset type
  const typeSpan = card.querySelector('.content-type');
  if (typeSpan) {
    if (asset.mimetype.startsWith('image/')) {
      typeSpan.textContent = 'Image';
      typeSpan.classList.add('image');
    } else {
      typeSpan.textContent = 'Text';
      typeSpan.classList.add('text');
    }
  }
  
  // Set asset title
  const titleEl = card.querySelector('.content-title');
  if (titleEl) titleEl.textContent = asset.filename;
  
  // Set source info
  const sourceEl = card.querySelector('.source');
  if (sourceEl) {
    let source = 'Uploaded';
    if (asset.metadata) {
      if (asset.metadata.sourceUrl) {
        source = `Source: ${new URL(asset.metadata.sourceUrl).hostname}`;
      } else if (asset.metadata.source) {
        source = `Source: ${asset.metadata.source}`;
      } else if (asset.metadata.context) {
        source = `Context: ${asset.metadata.context}`;
      } else if (asset.metadata.sourceType === 'linkedin') {
        source = 'Source: LinkedIn Profile';
      }
    }
    sourceEl.textContent = source;
  }
  
  // Create preview
  const previewEl = card.querySelector('.content-preview');
  if (previewEl) {
    if (asset.mimetype.startsWith('image/')) {
      // Image preview
      const imgPreview = document.createElement('div');
      imgPreview.className = 'image-preview';
      
      const img = document.createElement('img');
      img.src = `/assets/${asset.filePath || asset.id}`;
      img.alt = asset.filename;
      img.onerror = function() {
        this.src = '/img/image-icon.png';
        this.alt = 'Image preview unavailable';
      };
      
      imgPreview.appendChild(img);
      previewEl.appendChild(imgPreview);
      } else {
      // Text preview for all non-image types
      const textPreview = document.createElement('div');
      textPreview.className = 'text-preview';
      
      // Special handling for LinkedIn profile files
      const isLinkedInProfile = asset.filename.includes('linkedin_profile') || 
                               (asset.metadata && asset.metadata.sourceType === 'linkedin');
      
      if (isLinkedInProfile) {
        // Create a formatted LinkedIn preview
        textPreview.textContent = "LinkedIn Profile Data\n\nContains personal and professional information from your LinkedIn account.";
      } else if (asset.extractedContent) {
        // Use extracted content for text preview
        textPreview.textContent = asset.extractedContent.substring(0, 200) + (asset.extractedContent.length > 200 ? '...' : '');
      } else {
        // Default for other text-based files
        textPreview.textContent = '[Content preview not available]';
      }
      
      previewEl.appendChild(textPreview);
    }
  }
  
  // Setup checkbox for selection
  const checkboxEl = card.querySelector('.content-select');
  if (checkboxEl) {
    checkboxEl.checked = selectedAssets.has(asset.id);
    checkboxEl.addEventListener('change', function() {
      if (this.checked) {
        selectedAssets.add(asset.id);
      } else {
        selectedAssets.delete(asset.id);
      }
      updateSelectionUI();
    });
  }
  
  // Setup preview button
  const previewButton = card.querySelector('.preview-button');
  if (previewButton) {
    previewButton.addEventListener('click', function() {
      previewAsset(asset.id);
    });
  }
  
  return card;
}

/**
 * Clear the content library for the current user
 */
async function clearContentLibrary() {
  if (!currentUserId) {
    showStatus(clearLibraryStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  const confirmDelete = confirm(`Are you sure you want to delete ALL assets for user ${currentUserId}? This cannot be undone.`);
  if (!confirmDelete) return;
  
  showStatus(clearLibraryStatusDiv, 'Clearing content library...', 'loading');
  
  try {
    const response = await fetch(`/api/assets/${currentUserId}/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to clear content library (${response.status})`);
    }
    
    const data = await response.json();
    
    // Clear selection
    selectedAssets.clear();
    
    // Refresh assets display
    loadAssets();
    
    showStatus(clearLibraryStatusDiv, `Successfully cleared content library (${data.deletedCount || 0} assets removed)`, 'success');
  } catch (error) {
    console.error('Error clearing content library:', error);
    showStatus(clearLibraryStatusDiv, `Error clearing content library: ${error.message}`, 'error');
  }
}

// === Modify clearUIState to update navigation ===

function clearUIState() {
  // Function to reset UI elements when no user is selected or data fails to load
  selectedAssets.clear();
  currentGeneratedProfile = null;
  userTipiScores = null;
  aiTipiScores = null;
  currentChatHistory = [];
  
  // Clear user bio
  if (userBioTextarea) userBioTextarea.value = '';
  
  assetDisplayArea.innerHTML = '<p>Select a User Profile to load assets.</p>';
  personalityPromptTextarea.value = getDefaultPersonalityPrompt();
  if(personalityJsonOutputPre) personalityJsonOutputPre.textContent = '';
  if(personalityJsonOutputPre) personalityJsonOutputPre.style.display = 'none';
  if(copyJsonButton) copyJsonButton.style.display = 'none';
  if(chatLoreInput) chatLoreInput.value = DEFAULT_PERSONAL_BACKGROUND;
  if(chatParamsInput) chatParamsInput.value = DEFAULT_INTERACTION_CONTEXT;
  if(chatPsychStateInput) chatPsychStateInput.value = DEFAULT_PSYCH_STATE;
  if(chatCogStyleInput) chatCogStyleInput.value = DEFAULT_COG_STYLE;
  if(chatHistoryDiv) chatHistoryDiv.innerHTML = '';
  tipiForm?.reset();
  if(assessmentResultsArea) assessmentResultsArea.style.display = 'none';
  // Clear chart if exists
  if (window.myRadarChart) {
    window.myRadarChart.destroy();
    window.myRadarChart = null;
  } 
  if(overallAlignmentSpan) overallAlignmentSpan.textContent = '--%';
  if(dimensionAlignmentList) dimensionAlignmentList.innerHTML = '';
  
  // Clear saved personalities and chat selector
  if (savedPersonalitiesContainer) {
    savedPersonalitiesContainer.innerHTML = '<p id="no-personalities-message">No personality profiles generated yet. Use the "Generate Personality" section above to create one.</p>';
  }
  
  if (personalitySelector) {
    personalitySelector.innerHTML = '<p id="no-personalities-chat-message">No personality profiles available. Go to the Content Library page to generate personalities.</p>';
  }
  
  // Update navigation tabs state
  updateNavigationTabsState();
  
  updateSelectionUI();
  updateChatSystemPrompt();
  updateAssessmentUI();
  console.log("UI state cleared.");
}

/**
 * Update asset selection UI to reflect the current selected state
 */
function updateSelectionUI() {
  if (!selectionSummarySpan || !deleteSelectedButton) return;
  
  const count = selectedAssets.size;
  
  // Update selection count
  selectionSummarySpan.textContent = count === 0 
    ? 'No items selected' 
    : `${count} item${count === 1 ? '' : 's'} selected`;
  
  // Update delete button state
  deleteSelectedButton.disabled = count === 0;
  
  // Update checkboxes in the display to match selection state
  if (assetDisplayArea) {
    const checkboxes = assetDisplayArea.querySelectorAll('input[type="checkbox"]');
    
    // Check for any mismatch between selectedAssets and checkbox states
    let checkedCount = 0;
    checkboxes.forEach(checkbox => {
      const assetId = checkbox.getAttribute('data-asset-id');
      if (assetId) {
        if (checkbox.checked) checkedCount++;
        checkbox.checked = selectedAssets.has(assetId);
      }
    });
    
    if (checkedCount !== count) {
      console.log(`Selection UI mismatch: ${checkedCount} checkboxes checked but ${count} assets in selectedAssets`);
    }
  }
  
  // After updating selection UI, update generate button state
  updateGenerateButtonState();
}

/**
 * Update the generate button state based on current selections and prompt
 */
function updateGenerateButtonState() {
  if (!generatePersonalityButton) {
    console.log("Generate button element not found!");
    return;
  }
  
  // Check if currentUserId is lost but still have assets loaded
  // This fixes the bug where user context is lost when navigating tabs
  if (!currentUserId && document.querySelector('.asset-group')) {
    // User has assets loaded but currentUserId is lost - try to restore from the DOM
    const userDisplaySpan = document.getElementById('current-user-display');
    if (userDisplaySpan && userDisplaySpan.textContent && userDisplaySpan.textContent !== 'None Selected') {
      console.log('Restoring lost user context:', userDisplaySpan.textContent);
      currentUserId = userDisplaySpan.textContent;
    }
  }
  
  const hasSelectedAssets = selectedAssets.size > 0;
  const hasValidPrompt = isValidPrompt(personalityPromptTextarea?.value || '');
  const hasUser = !!currentUserId;
  
  console.log("Generate button state check:");
  console.log("- Has user:", hasUser, "User ID:", currentUserId);
  console.log("- Has selected assets:", hasSelectedAssets, "Count:", selectedAssets.size);
  console.log("- Has valid prompt:", hasValidPrompt);
  console.log("- Selected asset IDs:", Array.from(selectedAssets));
  
  const shouldBeEnabled = hasSelectedAssets && hasValidPrompt && hasUser;
  console.log("- Button should be enabled:", shouldBeEnabled);
  console.log("- Button is currently disabled:", generatePersonalityButton.disabled);
  
  generatePersonalityButton.disabled = !shouldBeEnabled;
  
  // Add visual feedback if button is disabled
  if (generatePersonalityButton.disabled) {
    if (!hasUser) {
      showStatus(personalityGenerationStatusDiv, 'Please select a user first', 'warning');
    } else if (!hasSelectedAssets) {
      showStatus(personalityGenerationStatusDiv, 'Please select at least one asset', 'warning');
    } else if (!hasValidPrompt) {
      showStatus(personalityGenerationStatusDiv, 'Please enter a valid prompt template', 'warning');
    }
        } else {
    personalityGenerationStatusDiv.textContent = '';
    personalityGenerationStatusDiv.style.display = 'none';
  }
}

function calculateDimensionsFromScores(scores) {
  // If the current personality has explicit Big Five values, use them for mapping
  const bigFiveMapping = {};
  
  if (currentGeneratedProfile && currentGeneratedProfile.big_five_traits) {
    // Map text values to numeric for calculation
    for (const [trait, level] of Object.entries(currentGeneratedProfile.big_five_traits)) {
      let value = 3; // Default to middle
      switch (level.toLowerCase()) {
        case 'high': value = 5; break;
        case 'medium': value = 3; break;
        case 'low': value = 1; break;
      }
      
      // Map trait names to OCEAN dimensions
      switch (trait.toLowerCase()) {
        case 'openness': bigFiveMapping.O = value; break;
        case 'conscientiousness': bigFiveMapping.C = value; break;
        case 'extraversion': bigFiveMapping.E = value; break;
        case 'agreeableness': bigFiveMapping.A = value; break;
        case 'neuroticism': bigFiveMapping.N = value; break;
      }
    }
  }
  
  // Initialize dimensions
  const dimensions = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const dimensionCounts = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  
  // Process each TIPI item's score
  TIPI_ITEMS.forEach(item => {
    const score = scores[item.id];
    if (score !== undefined) {
      // Apply reverse scoring if needed
      const processedScore = item.reverse ? 6 - score : score;
      dimensions[item.dimension] += processedScore;
      dimensionCounts[item.dimension]++;
    }
  });
  
  // Calculate average for each dimension
  for (const dim in dimensions) {
    if (dimensionCounts[dim] > 0) {
      dimensions[dim] = dimensions[dim] / dimensionCounts[dim];
    } else if (bigFiveMapping[dim]) {
      // If we have a direct Big Five mapping, use it
      dimensions[dim] = bigFiveMapping[dim];
    }
  }
  
  return dimensions;
}

// Add default values for various context fields
const DEFAULT_INTERACTION_CONTEXT = JSON.stringify({
  "interaction_context": {
    "setting": "casual online conversation",
    "audience": "single user",
    "formality_level": "conversational",
    "purpose": "general assistance and information"
  }
}, null, 2);

const DEFAULT_PERSONAL_BACKGROUND = JSON.stringify({
  "personal_background": {
    "key_experiences": [
      "Your digital twin starts with core traits derived from your online content",
      "It evolves as it learns more about you through interactions",
      "It aims to represent you authentically in digital conversations"
    ],
    "defining_beliefs": [
      "Your perspective and values matter",
      "Communication should be respectful and meaningful",
      "Personal growth comes through authentic exchange"
    ]
  }
}, null, 2);

const DEFAULT_PSYCH_STATE = JSON.stringify({
  "current_state": {
    "mood": "neutral",
    "energy_level": "moderate",
    "receptiveness": "open"
  }
}, null, 2);

const DEFAULT_COG_STYLE = JSON.stringify({
  "cognitive_style": {
    "thinking_mode": "balanced analytical and intuitive",
    "detail_focus": "moderate",
    "response_tempo": "measured",
    "trait_variability_percent": 10
  }
}, null, 2);

// Ten Item Personality Inventory (TIPI) questions
const TIPI_ITEMS = [
  { id: 'q1', text: 'I see myself as extraverted, enthusiastic.', dimension: 'E', reverse: false },
  { id: 'q2', text: 'I see myself as critical, quarrelsome.', dimension: 'A', reverse: true },
  { id: 'q3', text: 'I see myself as dependable, self-disciplined.', dimension: 'C', reverse: false },
  { id: 'q4', text: 'I see myself as anxious, easily upset.', dimension: 'N', reverse: false },
  { id: 'q5', text: 'I see myself as open to new experiences, complex.', dimension: 'O', reverse: false },
  { id: 'q6', text: 'I see myself as reserved, quiet.', dimension: 'E', reverse: true },
  { id: 'q7', text: 'I see myself as sympathetic, warm.', dimension: 'A', reverse: false },
  { id: 'q8', text: 'I see myself as disorganized, careless.', dimension: 'C', reverse: true },
  { id: 'q9', text: 'I see myself as calm, emotionally stable.', dimension: 'N', reverse: true },
  { id: 'q10', text: 'I see myself as conventional, uncreative.', dimension: 'O', reverse: true }
];

// === Utility Functions ===

/**
 * Show a status message in a status div
 * @param {HTMLElement} statusDiv - The status div to update
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, loading, warning)
 */
function showStatus(statusDiv, message, type = 'info') {
  if (!statusDiv) return;
  
  // Clear any existing classes
  statusDiv.className = 'status';
  
  // Add appropriate class based on type
  statusDiv.classList.add(type);
  
  // Set message text
  statusDiv.textContent = message;
  
  // Make sure the status is visible
  statusDiv.style.display = 'block';
  
  // For success messages, automatically hide after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.opacity = '0';
      setTimeout(() => {
        statusDiv.style.display = 'none';
        statusDiv.style.opacity = '1';
      }, 500);
    }, 3000);
  }
}

/**
 * Get the default personality prompt text
 * @returns {string} The default prompt text for personality generation
 */
function getDefaultPersonalityPrompt() {
  return `As an expert psychological profiler and memetics engineer, analyze the provided content and create a comprehensive personality profile in JSON format.

Extract meaningful psychological patterns, values, traits, and communication styles from all assets (text and images) to construct a coherent personality model.

The profile should follow this structure:
{
  "entity_details": {
    "name": "...",
    "identity_type": "individual | group | character | brand",
    "summary": "Brief 1-2 sentence overall description"
  },
  "core_traits": {
    "defining_characteristics": [...],
    "values": [...],
    "motivations": [...],
    "cognitive_style": "..."
  },
  "big_five_traits": {
    "openness": "high | medium | low",
    "conscientiousness": "high | medium | low",
    "extraversion": "high | medium | low",
    "agreeableness": "high | medium | low",
    "neuroticism": "high | medium | low"
  },
  "voice_qualities": {
    "tone": "...",
    "patterns": [...],
    "vocabulary_choices": "...",
    "sentence_structure": "..."
  },
  "relationship_approach": {
    "interaction_style": "...",
    "trust_building": "...",
    "conflict_handling": "..."
  }
}

Apply modern psychological frameworks and deep content analysis techniques to interpret all provided materials. Look for recurring themes, writing style, expressed values, and topic preferences to build a psychologically coherent profile that authentically captures the subject's essence.`;
}

/**
 * Validate if the prompt is a valid prompt format or template
 * @param {string} promptText - The prompt text to validate
 * @returns {boolean} Whether the prompt is valid
 */
function isValidPrompt(promptText) {
  if (!promptText || promptText.trim() === '') {
    return false;
  }
  
  // Check if the prompt contains valid JSON structure markers
  const hasJsonStructure = promptText.includes('{') && promptText.includes('}');
  
  // Check for typical placeholders in templates
  const hasPlaceholders = promptText.includes('...') || 
                          promptText.includes('[...]') || 
                          promptText.includes('high | medium | low');
  
  // Check for instructions that indicate this is a prompt
  const hasInstructions = promptText.includes('Create a personality') || 
                          promptText.includes('Analyze') ||
                          promptText.includes('profile');
  
  return hasJsonStructure && (hasPlaceholders || hasInstructions);
}

/**
 * Update the assessment UI based on the current user state
 */
function updateAssessmentUI() {
  // Handle assessment UI state
  if (!tipiForm || !submitUserAssessmentButton || !retakeUserAssessmentButton) return;
  
  if (userTipiScores) {
    // User has already completed assessment
    submitUserAssessmentButton.style.display = 'none';
    retakeUserAssessmentButton.style.display = 'inline-block';
    
    // Disable form inputs since assessment is already done
    const inputs = tipiForm.querySelectorAll('input[type="radio"]');
    inputs.forEach(input => {
      input.disabled = true;
    });
    
    // Update status
    if (userAssessmentStatusDiv) {
      showStatus(userAssessmentStatusDiv, 'Assessment completed. Click "Retake Assessment" to change your answers.', 'info');
    }
  } else {
    // User hasn't completed assessment
    submitUserAssessmentButton.style.display = 'inline-block';
    retakeUserAssessmentButton.style.display = 'none';
    
    // Enable form inputs
    const inputs = tipiForm.querySelectorAll('input[type="radio"]');
    inputs.forEach(input => {
      input.disabled = false;
    });
    
    // Clear status
    if (userAssessmentStatusDiv) {
      userAssessmentStatusDiv.textContent = '';
      userAssessmentStatusDiv.style.display = 'none';
    }
  }
  
  // Update AI assessment button
  if (runAIAssessmentButton) {
    // Enable only if user has completed assessment and there's a generated profile
    runAIAssessmentButton.disabled = !(userTipiScores && currentGeneratedProfile);
  }
}

/**
 * Set up the info tooltip buttons
 */
function setupInfoButtons() {
  // Find all info buttons
  const infoButtons = document.querySelectorAll('.info-button');
  
  infoButtons.forEach(button => {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = button.getAttribute('data-info');
    
    // Initial hidden state
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#f9f9f9';
    tooltip.style.border = '1px solid #ddd';
    tooltip.style.borderRadius = '4px';
    tooltip.style.padding = '8px 12px';
    tooltip.style.zIndex = '100';
    tooltip.style.maxWidth = '250px';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    
    // Add tooltip to button
    button.appendChild(tooltip);
    
    // Position tooltip on mouseover
    button.addEventListener('mouseover', () => {
      tooltip.style.display = 'block';
      // Position tooltip above the button
      const buttonRect = button.getBoundingClientRect();
      tooltip.style.bottom = (button.offsetHeight + 5) + 'px';
      tooltip.style.left = '0';
    });
    
    // Hide tooltip on mouseout
    button.addEventListener('mouseout', () => {
      tooltip.style.display = 'none';
    });
  });
}

/**
 * Check for social auth callback parameters in the URL
 */
function checkSocialAuthCallback() {
  // Parse the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get('auth_status');
  const userId = urlParams.get('user_id');
  const provider = urlParams.get('provider');
  const error = urlParams.get('error');
  
  // If this is a callback from social auth
  if (authStatus) {
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Show status message based on auth result
    if (authStatus === 'success' && provider) {
      showStatus(userStatusDiv, `Successfully connected with ${provider}`, 'success');
      
      // If user ID is provided in the URL, select that user
      if (userId && userSelectDropdown) {
        // First check if we need to reload the user list
        if (!userSelectDropdown.querySelector(`option[value="${userId}"]`)) {
          // Reload user list first, then select the user
          loadUserList().then(() => {
            // Check again after loading
            if (userSelectDropdown.querySelector(`option[value="${userId}"]`)) {
              userSelectDropdown.value = userId;
              // Trigger change event manually
              const event = new Event('change');
              userSelectDropdown.dispatchEvent(event);
            }
          });
        } else {
          // User already exists in dropdown, just select it
          userSelectDropdown.value = userId;
          // Trigger change event manually
          const event = new Event('change');
          userSelectDropdown.dispatchEvent(event);
        }
      }
      
      // If we're on the content library page, refresh assets
      if (document.getElementById('content-library-page').classList.contains('active') && currentUserId) {
        loadAssets();
      }
    } else if (authStatus === 'error') {
      const errorMessage = error || 'Unknown error occurred';
      showStatus(userStatusDiv, `Failed to connect: ${errorMessage}`, 'error');
    }
  }
}

/**
 * Debounce a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Save the chat context for the current user
 */
async function saveContext() {
  if (!currentUserId || !chatLoreInput || !chatParamsInput || !chatPsychStateInput || !chatCogStyleInput) {
    return;
  }
  
  try {
    // Don't show status while saving context - it's automatic
    const chatContext = {
      lore: chatLoreInput.value,
      simulationParams: chatParamsInput.value,
      psychologicalState: chatPsychStateInput.value,
      cognitiveStyle: chatCogStyleInput.value
    };
    
    const response = await fetch(`/api/users/${currentUserId}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chatContext)
    });
    
    if (!response.ok) {
      console.error('Failed to save context:', response.status);
    }
  } catch (error) {
    console.error('Error saving context:', error);
  }
}

/**
 * Handle starting the user assessment
 */
function handleStartAssessment(event) {
  if (event) event.preventDefault();
  
  if (!currentUserId) {
    showStatus(userAssessmentStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  // Load TIPI questions if not already loaded
  loadTipiQuestions();
  
  // Show the assessment form
  if (tipiForm) {
    tipiForm.style.display = 'block';
  }
  
  // Hide the start button
  if (startUserAssessmentButton) {
    startUserAssessmentButton.style.display = 'none';
  }
  
  // Show submit button 
  if (submitUserAssessmentButton) {
    submitUserAssessmentButton.style.display = 'inline-block';
  }
  
  // Show status message
  showStatus(userAssessmentStatusDiv, 'Please complete all questions to assess your personality traits.', 'info');
}

/**
 * Load the TIPI questions into the assessment form
 */
function loadTipiQuestions() {
  if (!tipiQuestionsContainer) return;
  
  // Clear existing questions
  tipiQuestionsContainer.innerHTML = '';
  
  // Create HTML for each question
  TIPI_ITEMS.forEach((item, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'tipi-question';
    
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = `${index + 1}. ${item.text}`;
    questionDiv.appendChild(questionText);
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'rating-options';
    
    // Create 5-point Likert scale
    for (let i = 1; i <= 5; i++) {
      const option = document.createElement('div');
      option.className = 'rating-option';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = item.id;
      input.id = `${item.id}-${i}`;
      input.value = i;
      input.required = true;
      
      const label = document.createElement('label');
      label.htmlFor = `${item.id}-${i}`;
      
      let labelText;
      switch (i) {
        case 1: labelText = 'Disagree strongly'; break;
        case 2: labelText = 'Disagree moderately'; break;
        case 3: labelText = 'Neither agree nor disagree'; break;
        case 4: labelText = 'Agree moderately'; break;
        case 5: labelText = 'Agree strongly'; break;
        default: labelText = '';
      }
      
      label.textContent = labelText;
      
      option.appendChild(input);
      option.appendChild(label);
      optionsDiv.appendChild(option);
    }
    
    questionDiv.appendChild(optionsDiv);
    tipiQuestionsContainer.appendChild(questionDiv);
  });
  
  // Restore any previous values if user has already done assessment
  restoreUserAssessmentFormState();
}

/**
 * Restore the user's previous assessment answers to the form
 */
function restoreUserAssessmentFormState() {
  if (!tipiForm || !userTipiScores) return;
  
  // Check each question
  TIPI_ITEMS.forEach(item => {
    if (userTipiScores[item.id] !== undefined) {
      const score = userTipiScores[item.id];
      const input = tipiForm.querySelector(`input[name="${item.id}"][value="${score}"]`);
      if (input) {
        input.checked = true;
      }
    }
  });
  
  // Update the assessment UI state
  updateAssessmentUI();
}

/**
 * Save the current personality prompt text
 */
async function savePersonalityPrompt() {
  if (!currentUserId || !personalityPromptTextarea) {
    showStatus(promptStatusDiv, 'Please select a user first', 'error');
    return;
  }
  
  const promptText = personalityPromptTextarea.value.trim();
  if (!promptText) {
    showStatus(promptStatusDiv, 'Prompt cannot be empty', 'error');
    return;
  }
  
  showStatus(promptStatusDiv, 'Saving prompt...', 'loading');
  console.log(`Saving custom prompt for user ${currentUserId} (${promptText.length} characters)`);
  
  try {
    const response = await fetch(`/api/users/${currentUserId}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: promptText })
    });
    
    // Check for successful response first
    if (!response.ok) {
      // Log response details for debugging
      console.error('Failed to save prompt:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type')
      });
      
      // Check if response is JSON or something else (like HTML error page)
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to save prompt (${response.status})`);
      } else {
        // For non-JSON responses (like HTML error pages)
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 200) + "...");
        throw new Error(`Server error (${response.status}): API endpoint for saving prompts may be missing`);
      }
    }
    
    // Parse the successful response
    const data = await response.json();
    console.log('Prompt save response:', data);
    
    // Update current prompt
    currentPersonalityPrompt = promptText;
    
    showStatus(promptStatusDiv, 'Prompt saved successfully', 'success');
  } catch (error) {
    console.error('Error saving prompt:', error);
    showStatus(promptStatusDiv, `Error saving prompt: ${error.message}`, 'error');
  }
}

/**
 * Reset the personality prompt to the default
 */
function resetPersonalityPrompt() {
  if (!personalityPromptTextarea) return;
  
  const defaultPrompt = getDefaultPersonalityPrompt();
  personalityPromptTextarea.value = defaultPrompt;
  
  // Save the default prompt if a user is selected
  if (currentUserId) {
    savePersonalityPrompt();
  } else {
    showStatus(promptStatusDiv, 'Default prompt loaded', 'info');
  }
}

/**
 * Copy the generated personality JSON to clipboard
 */
function copyGeneratedJson() {
  if (!personalityJsonOutputPre || !currentGeneratedProfile) return;
  
  const jsonText = JSON.stringify(currentGeneratedProfile, null, 2);
  
  // Use the clipboard API
  navigator.clipboard.writeText(jsonText)
    .then(() => {
      showStatus(personalityGenerationStatusDiv, 'JSON copied to clipboard', 'success');
    })
    .catch(err => {
      console.error('Error copying to clipboard:', err);
      showStatus(personalityGenerationStatusDiv, 'Failed to copy JSON', 'error');
      
      // Fallback selection method
      const range = document.createRange();
      range.selectNode(personalityJsonOutputPre);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI elements references
  initElements();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load initial user list
  loadUserList();
  
  // Load parameter options
  loadParameterOptions();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // User Setup page event listeners
  if (userSelect) {
    userSelect.addEventListener('change', handleUserSelection);
  }

  if (createUserButton) {
    createUserButton.addEventListener('click', createNewUser);
  }

  if (saveBioButton) {
    saveBioButton.addEventListener('click', saveBioHandler);
  }

  if (connectLinkedinButton) {
    connectLinkedinButton.addEventListener('click', connectLinkedin);
  }

  if (disconnectLinkedinButton) {
    disconnectLinkedinButton.addEventListener('click', disconnectLinkedin);
  }

  // File upload event listeners
  if (uploadButton) {
    uploadButton.addEventListener('click', uploadFiles);
  }

  // Content Library page event listeners
  if (selectAllTextButton) {
    selectAllTextButton.addEventListener('click', selectAllTextAssets);
  }

  if (selectAllImageButton) {
    selectAllImageButton.addEventListener('click', selectAllImageAssets);
  }

  if (deselectAllButton) {
    deselectAllButton.addEventListener('click', deselectAllAssets);
  }

  if (deleteSelectedButton) {
    deleteSelectedButton.addEventListener('click', deleteSelectedAssets);
  }

  if (startScrapingButton) {
    startScrapingButton.addEventListener('click', startScraping);
  }

  if (generatePersonalityButton) {
    generatePersonalityButton.addEventListener('click', generatePersonality);
  }

  if (clearLibraryButton) {
    clearLibraryButton.addEventListener('click', clearContentLibrary);
  }

  if (savePromptButton) {
    savePromptButton.addEventListener('click', savePersonalityPrompt);
  }

  if (resetPromptButton) {
    resetPromptButton.addEventListener('click', resetPersonalityPrompt);
  }

  if (copyJsonButton) {
    copyJsonButton.addEventListener('click', copyGeneratedJson);
  }

  // Chat page event listeners
  if (sendChatButton) {
    // Keep this as a backup but the primary input is now via Enter key
    sendChatButton.addEventListener('click', sendChatMessage);
  }

  // Only call setupChatKeyboard if the chat input exists
  if (chatInput) {
    setupChatKeyboard();
  }

  // System prompt visibility toggle
  if (showSystemPromptCheckbox) {
    showSystemPromptCheckbox.addEventListener('change', toggleSystemPromptVisibility);
  }

  // System prompt operations
  if (saveSystemPromptButton) {
    saveSystemPromptButton.addEventListener('click', saveCurrentSystemPrompt);
  }

  if (saveAsSystemPromptButton) {
    saveAsSystemPromptButton.addEventListener('click', saveSystemPromptAs);
  }

  if (savedPromptsDropdown) {
    savedPromptsDropdown.addEventListener('change', selectSystemPrompt);
  }

  // Clear chat history
  if (clearChatButton) {
    clearChatButton.addEventListener('click', clearChat);
  }

  // Nav tabs event listeners
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', handleNavTabClick);
  });
  
  // Assessment buttons
  if (startUserAssessmentButton) {
    startUserAssessmentButton.addEventListener('click', startUserAssessment);
  }

  if (submitUserAssessmentButton) {
    submitUserAssessmentButton.addEventListener('click', submitUserAssessment);
  }

  if (retakeUserAssessmentButton) {
    retakeUserAssessmentButton.addEventListener('click', retakeUserAssessment);
  }

  if (runAiAssessmentButton) {
    runAiAssessmentButton.addEventListener('click', runAiAssessment);
  }

  // Modal close button
  if (closeModalButton) {
    closeModalButton.addEventListener('click', closePreviewModal);
  }

  // Setup info button tooltips
  document.querySelectorAll('.info-button').forEach(button => {
    const tooltipId = button.getAttribute('data-tooltip-target');
    if (tooltipId) {
      const tooltip = document.getElementById(tooltipId);
      if (tooltip) {
        button.addEventListener('click', function() {
        tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
        });
      }
    }
  });
}

/**
 * Handle user selection change
 */
async function handleUserSelectChange() {
  if (!userSelectDropdown) return;
  
  const selectedUserId = userSelectDropdown.value;
  
  if (!selectedUserId) {
    clearUIState();
    return;
  }
  
  await loadUserData(selectedUserId);
}

/**
 * Load user data for the selected user
 * @param {string} userId - The user ID to load
 */
async function loadUserData(userId) {
  if (!userId) return;
  
  try {
    if (userStatusDiv) {
    showStatus(userStatusDiv, 'Loading user data...', 'loading');
    }
    
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load user data: ${response.status}`);
    }
    
    const userData = await response.json();
    
    // Set currentUserId
    currentUserId = userId;
    
    // Update UI elements
    updateUIWithUserData(userData);
    
    // Check for LinkedIn connection status
    checkLinkedInConnectionStatus();
    
    // Enable tabs that require a user
    updateNavigationTabsState();
    
    if (userStatusDiv) {
    showStatus(userStatusDiv, 'User data loaded successfully', 'success', 2000);
    }
    
    console.log('Loaded user data:', userData);
  } catch (error) {
    console.error('Error loading user data:', error);
    if (userStatusDiv) {
    showStatus(userStatusDiv, `Error loading user data: ${error.message}`, 'error');
    }
    clearUIState();
  }
}

/**
 * Initialize all UI element references
 */
function initElements() {
  // Tab navigation elements
  navTabs = document.querySelectorAll('.nav-tab');
  pageContainers = document.querySelectorAll('.page');
  
  userSelectDropdown = document.getElementById('user-select');
  newUserInput = document.getElementById('new-user-id');
  createUserButton = document.getElementById('create-user-button');
  userStatusDiv = document.getElementById('user-status');
  currentUserDisplaySpan = document.getElementById('current-user-display');

  scrapeUrlInput = document.getElementById('scrape-url');
  startScrapingButton = document.getElementById('start-scraping');
  scrapeStatusDiv = document.getElementById('scrape-status');
  
  fileInputElement = document.getElementById('file-input');
  uploadButton = document.getElementById('upload-button');
  uploadStatusDiv = document.getElementById('upload-status');
  
  // For file upload form
  uploadForm = document.createElement('form');
  uploadForm.addEventListener('submit', (e) => e.preventDefault());

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

  // New elements for saved personalities and profile selection
  savedPersonalitiesContainer = document.getElementById('saved-personalities-container');
  profileCardTemplate = document.getElementById('profile-card-template');
  personalitySelector = document.getElementById('personality-selector');
  personalitySelectorTemplate = document.getElementById('personality-selector-template');
  
  // Alignment page elements
  aiProfileSelect = document.getElementById('ai-profile-select');
  userAssessmentSummary = document.getElementById('user-assessment-summary');
  userAssessmentStatusSummary = document.getElementById('user-assessment-status-summary');

  chatPersonalityJsonPre = document.getElementById('chat-personality-json');
  chatLoreInput = document.getElementById('chat-lore-input');
  chatParamsInput = document.getElementById('chat-params-input');
  chatPsychStateInput = document.getElementById('chat-psych-state-input');
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
  startUserAssessmentButton = document.getElementById('start-user-assessment');
  userAssessmentStatusDiv = document.getElementById('user-assessment-status');
  runAIAssessmentButton = document.getElementById('run-ai-assessment');
  aiAssessmentStatusDiv = document.getElementById('ai-assessment-status');
  assessmentResultsArea = document.getElementById('assessment-results-area');
  overallAlignmentSpan = document.getElementById('overall-alignment');
  dimensionAlignmentList = document.getElementById('dimension-alignment-list');
  radarChartCanvas = document.getElementById('radar-chart');
  runsPerItemInput = document.getElementById('runs-per-item'); 
  itemAgreementSpan = document.getElementById('item-agreement'); 

  clearLibraryButton = document.getElementById('clear-library-button');
  clearLibraryStatusDiv = document.getElementById('clear-library-status');

  assetGroupTemplate = document.getElementById('asset-group-template');
  assetCardTemplate = document.getElementById('asset-card-template');
  previewModal = document.getElementById('preview-modal');
  modalTitle = document.getElementById('modal-title');
  modalContent = document.getElementById('modal-content');
  closeModalButton = document.getElementById('close-modal');

  generateModule = document.getElementById('generate-module'); 
  chatModule = document.getElementById('chat-module');
  assessmentModule = document.getElementById('user-assessment-module');
  chatContentArea = document.getElementById('chat-content-area');

  includeInteractionContextCheckbox = document.getElementById('include-interaction-context');
  includePsychStateCheckbox = document.getElementById('include-psych-state');
  includeCogStyleCheckbox = document.getElementById('include-cog-style');

  // Bio elements
  userBioTextarea = document.getElementById('user-bio');
  saveBioButton = document.getElementById('save-bio-button');
  bioStatusDiv = document.getElementById('bio-status');

  // New elements for system prompt editor
  systemPromptEditor = document.getElementById('system-prompt-editor');
  showSystemPromptCheckbox = document.getElementById('show-system-prompt');
  savedPromptsDropdown = document.getElementById('saved-prompts-dropdown');
  saveSystemPromptButton = document.getElementById('save-system-prompt');
  saveAsSystemPromptButton = document.getElementById('save-as-system-prompt');
}

// Fix the LinkedIn disconnect function to better handle errors
/**
 * Delete LinkedIn assets for the current user
 */
async function deleteLinkedInAssets() {
  if (!currentUserId) return;
  
  showStatus(scrapeStatusDiv, 'Disconnecting LinkedIn...', 'loading');
  
  try {
    // Get all assets
    const response = await fetch(`/api/assets/${currentUserId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load assets (${response.status})`);
    }
    
    const assets = await response.json();
    console.log('Checking for LinkedIn assets to delete...');
    
    // Filter for LinkedIn assets only
    const linkedInAssets = assets.filter(asset => 
      asset.metadata && 
      (asset.metadata.sourceType === 'linkedin' || 
       asset.metadata.context === 'LinkedIn Profile' ||
       (asset.metadata.sourceUrl && asset.metadata.sourceUrl.includes('linkedin.com')))
    );
    
    console.log(`Found ${linkedInAssets.length} LinkedIn assets to disconnect`);
    
    if (linkedInAssets.length === 0) {
      showStatus(scrapeStatusDiv, 'No LinkedIn data found to disconnect', 'info');
      updateLinkedInConnectionUI(false);
      return;
    }
    
    // Delete each LinkedIn asset
    const assetIds = linkedInAssets.map(asset => asset.id);
    
    const deleteResponse = await fetch(`/api/assets/${currentUserId}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assetIds: assetIds
      })
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({ error: `Status code: ${deleteResponse.status}` }));
      throw new Error(errorData.error || `Failed to delete LinkedIn assets (${deleteResponse.status})`);
    }
    
    const data = await deleteResponse.json().catch(() => ({ deletedCount: 'unknown' }));
    
    // Update UI
    showStatus(scrapeStatusDiv, `LinkedIn disconnected successfully. Removed ${data.deletedCount || 'all'} LinkedIn assets.`, 'success');
    updateLinkedInConnectionUI(false);
    
    // Refresh assets if we're on that page
    if (document.getElementById('content-library-page').classList.contains('active')) {
      loadAssets();
    }
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    showStatus(scrapeStatusDiv, `Error disconnecting LinkedIn: ${error.message}`, 'error');
    // Still update the UI to show disconnected state, even on error
    updateLinkedInConnectionUI(false);
  }
}

/**
 * Handle navigation tab clicks
 * @param {Event} event - The click event
 */
function handleNavTabClick(event) {
  const tab = event.currentTarget;
  
  // Skip if already active
  if (tab.classList.contains('active')) return;
  
  // Get target page ID
  const targetPageId = tab.getAttribute('data-page');
  if (!targetPageId) return;
  
  // Check if navigation should be allowed
  if (tab.classList.contains('disabled')) {
    // Don't allow navigation to disabled tabs
    return;
  }
  
  // Fix for issue where currentUserId might be lost
  if (currentUserId === null) {
    // Check if user display shows a selected user
    const userDisplaySpan = document.getElementById('current-user-display');
    if (userDisplaySpan && userDisplaySpan.textContent && userDisplaySpan.textContent !== 'None Selected') {
      console.log('Restoring lost user context during tab navigation:', userDisplaySpan.textContent);
      currentUserId = userDisplaySpan.textContent;
      
      // Force UI update to show correct state
      updateNavigationTabsState();
    }
  }
  
  // Update active states
  navTabs.forEach(t => t.classList.remove('active'));
  pageContainers.forEach(p => p.classList.remove('active'));
  
  // Activate clicked tab and corresponding page
  tab.classList.add('active');
  const targetPage = document.getElementById(targetPageId);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // Perform any necessary page-specific initialization
    handlePageTransition(targetPageId);
  }
}

/**
 * Update UI elements with loaded user data
 * @param {Object} userData - The user data object
 */
function updateUIWithUserData(userData) {
  // Update user display
  if (currentUserDisplaySpan) {
    currentUserDisplaySpan.textContent = userData.id;
  }
  
  // Load bio if present
  if (userBioTextarea) {
    userBioTextarea.value = userData.bio || '';
  }
  
  // Set personality data
  currentPersonalityPrompt = userData.generation?.customPrompt || getDefaultPersonalityPrompt();
  if (personalityPromptTextarea) {
    personalityPromptTextarea.value = currentPersonalityPrompt;
  }
  
  // Load generated profile if available
  currentGeneratedProfile = userData.generation?.lastGeneratedProfile?.json || null;
  
  // Load chat context data
  const chatContext = userData.chatContext || {};
  if (chatLoreInput) chatLoreInput.value = chatContext.lore || DEFAULT_PERSONAL_BACKGROUND;
  if (chatParamsInput) chatParamsInput.value = chatContext.simulationParams || DEFAULT_INTERACTION_CONTEXT;
  if (chatPsychStateInput) chatPsychStateInput.value = chatContext.psychologicalState || DEFAULT_PSYCH_STATE;
  if (chatCogStyleInput) chatCogStyleInput.value = chatContext.cognitiveStyle || DEFAULT_COG_STYLE;
  
  // Reset border styles
  [chatLoreInput, chatParamsInput, chatPsychStateInput, chatCogStyleInput].forEach(input => {
    if (input) input.style.border = '1px solid #ddd';
  });
  
  // Load assessment data
  userTipiScores = userData.assessment?.userTipiScores || null;
  aiTipiScores = userData.assessment?.aiTipiScores || null;
  
  // Load chat history
  currentChatHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
  if (chatHistoryDiv && typeof renderChatHistory === 'function') {
    renderChatHistory();
  }
  
  // Load assets
  loadAssets();
  
  // Load saved personalities
  if (savedPersonalitiesContainer) {
    loadSavedPersonalities();
  }
  
  // Update system prompt display
  if (typeof updateChatSystemPrompt === 'function') {
  updateChatSystemPrompt();
  }
  
  // Update assessment UI
  if (typeof updateAssessmentUI === 'function') {
  updateAssessmentUI();
  }
  
  // Update form state for TIPI
  if (typeof restoreUserAssessmentFormState === 'function') {
  restoreUserAssessmentFormState();
  }
  
  // If we have system prompt editor, create initial prompt from profile
  if (systemPromptEditor && currentGeneratedProfile) {
    try {
      const initialSystemPrompt = createSystemPromptFromProfile(currentGeneratedProfile);
      systemPromptEditor.value = initialSystemPrompt;
      
      // Load saved system prompts
      if (typeof loadSavedSystemPrompts === 'function') {
        loadSavedSystemPrompts();
      }
    } catch (err) {
      console.error('Error creating system prompt:', err);
    }
  }
}

/**
 * Load parameter options for the UI
 */
function loadParameterOptions() {
  // Initialize any parameter dropdowns or option controls here
  
  // For now, this is a placeholder function
  console.log('Parameter options loaded');
}

/**
 * Update the chat system prompt based on current profile and settings
 */
function updateChatSystemPrompt() {
  if (!chatSystemPromptPre) return;

  let finalSystemPrompt = "You are a digital twin based on the following personality profile in JSON format. Use this profile to inform your responses and communication style.\n\n";

  // Add the personality JSON
  if (currentGeneratedProfile) {
    finalSystemPrompt += "====================\nPERSONALITY PROFILE:\n====================\n";
    finalSystemPrompt += JSON.stringify(currentGeneratedProfile, null, 2);
    finalSystemPrompt += "\n\n";
  } else {
    finalSystemPrompt += "No personality profile generated. Please generate one first.\n\n";
  }

  // Add personal background/lore if present and valid
  if (chatLoreInput && chatLoreInput.value.trim()) {
    try {
      // Check if the lore is valid JSON
      JSON.parse(chatLoreInput.value);
      // If it is, include it directly
      finalSystemPrompt += "====================\nPERSONAL BACKGROUND:\n====================\n";
      finalSystemPrompt += chatLoreInput.value + "\n\n";
      chatLoreInput.style.border = "1px solid #ddd"; // Reset border if previously invalid
    } catch (e) {
      // If it's not valid JSON, include it as plain text
      finalSystemPrompt += "====================\nPERSONAL BACKGROUND:\n====================\n";
      finalSystemPrompt += chatLoreInput.value + "\n\n";
      
      // Add warning styles if trying to provide invalid JSON
      if (chatLoreInput.value.includes("{") && chatLoreInput.value.includes("}")) {
        chatLoreInput.style.border = "1px solid #e74c3c";
      } else {
        chatLoreInput.style.border = "1px solid #ddd"; // Reset border
      }
    }
  }

  // Add simulation parameters if present, checked, and valid
  if (chatParamsInput && chatParamsInput.value.trim() && includeInteractionContextCheckbox?.checked) {
    try {
      // Check if it's valid JSON
      JSON.parse(chatParamsInput.value);
      // If it is, include it directly
      finalSystemPrompt += "====================\nINTERACTION CONTEXT:\n====================\n";
      finalSystemPrompt += chatParamsInput.value + "\n\n";
      chatParamsInput.style.border = "1px solid #ddd"; // Reset border if previously invalid
    } catch (e) {
      // If it's not valid JSON, include it as plain text
      finalSystemPrompt += "====================\nINTERACTION CONTEXT:\n====================\n";
      finalSystemPrompt += chatParamsInput.value + "\n\n";
      
      // Add warning styles if trying to provide invalid JSON
      if (chatParamsInput.value.includes("{") && chatParamsInput.value.includes("}")) {
        chatParamsInput.style.border = "1px solid #e74c3c";
      } else {
        chatParamsInput.style.border = "1px solid #ddd"; // Reset border
      }
    }
  }
  
  // Add psychological state if present and checked
  if (chatPsychStateInput && chatPsychStateInput.value.trim() && includePsychStateCheckbox?.checked) {
    try {
      // Check if it's valid JSON
      JSON.parse(chatPsychStateInput.value);
      // If it is, include it directly
      finalSystemPrompt += "====================\nCURRENT PSYCHOLOGICAL STATE:\n====================\n";
      finalSystemPrompt += chatPsychStateInput.value + "\n\n";
      chatPsychStateInput.style.border = "1px solid #ddd"; // Reset border if previously invalid
    } catch (e) {
      // If it's not valid JSON, include it as plain text
      finalSystemPrompt += "====================\nCURRENT PSYCHOLOGICAL STATE:\n====================\n";
      finalSystemPrompt += chatPsychStateInput.value + "\n\n";
      
      // Add warning styles if trying to provide invalid JSON
      if (chatPsychStateInput.value.includes("{") && chatPsychStateInput.value.includes("}")) {
        chatPsychStateInput.style.border = "1px solid #e74c3c";
      } else {
        chatPsychStateInput.style.border = "1px solid #ddd"; // Reset border
      }
    }
  }

  // Add cognitive style if present and checked
  if (chatCogStyleInput && chatCogStyleInput.value.trim() && includeCogStyleCheckbox?.checked) {
    try {
      // Check if it's valid JSON
      JSON.parse(chatCogStyleInput.value);
      // If it is, include it directly
      finalSystemPrompt += "====================\nCOGNITIVE STYLE:\n====================\n";
      finalSystemPrompt += chatCogStyleInput.value + "\n\n";
      chatCogStyleInput.style.border = "1px solid #ddd"; // Reset border if previously invalid
    } catch (e) {
      // If it's not valid JSON, include it as plain text
      finalSystemPrompt += "====================\nCOGNITIVE STYLE:\n====================\n";
      finalSystemPrompt += chatCogStyleInput.value + "\n\n";
      
      // Add warning styles if trying to provide invalid JSON
      if (chatCogStyleInput.value.includes("{") && chatCogStyleInput.value.includes("}")) {
        chatCogStyleInput.style.border = "1px solid #e74c3c";
      } else {
        chatCogStyleInput.style.border = "1px solid #ddd"; // Reset border
      }
    }
  }

  finalSystemPrompt += "====================\nINSTRUCTIONS:\n====================\n";
  finalSystemPrompt += "1. Respond based ONLY on the personality profile and context above\n";
  finalSystemPrompt += "2. Stay in character as the digital twin consistently\n";
  finalSystemPrompt += "3. Use the Voice qualities and patterns from the profile to shape your communication style\n";
  finalSystemPrompt += "4. Express the Core Traits and Values authentically\n";
  finalSystemPrompt += "5. Follow the Relationship style when interacting\n";
  finalSystemPrompt += "6. Never break character by explaining or discussing how you're using the profile\n";

  chatSystemPromptPre.textContent = finalSystemPrompt;
  
  // Also show the system prompt section
  if (chatSystemPromptPre.parentElement) {
    chatSystemPromptPre.parentElement.style.display = "block";
  }
  
  // Update the personality JSON display if present
  if (chatPersonalityJsonPre && currentGeneratedProfile) {
    chatPersonalityJsonPre.textContent = JSON.stringify(currentGeneratedProfile, null, 2);
    chatPersonalityJsonPre.style.display = "block";
  }
}

/**
 * Load the personality prompt into the UI
 */
function loadPersonalityPrompt() {
  if (!personalityPromptTextarea) return;
  
  // If there's a current user and they have a saved prompt, use that
  if (currentUserId && currentPersonalityPrompt) {
    personalityPromptTextarea.value = currentPersonalityPrompt;
  } else {
    // Otherwise use the default prompt
    personalityPromptTextarea.value = getDefaultPersonalityPrompt();
  }
  
  // Update generate button state
  updateGenerateButtonState();
}

/**
 * Setup the modal functionality for previewing content
 */
function setupModal() {
  if (!previewModal || !closeModalButton) return;
  
  // Close modal when the X button is clicked
  closeModalButton.addEventListener('click', () => {
    previewModal.style.display = 'none';
  });
  
  // Close modal when clicking outside the modal content
  window.addEventListener('click', (event) => {
    if (event.target === previewModal) {
      previewModal.style.display = 'none';
    }
  });
}

/**
 * Handle the AI assessment process
 * @param {Event} event - The click event
 */
async function handleRunAIAssessment(event) {
  event.preventDefault();
  
  if (!userTipiScores) {
    showStatus(aiAssessmentStatusDiv, 'You must complete your assessment first.', 'error');
    return;
  }
  
  if (!currentGeneratedProfile) {
    showStatus(aiAssessmentStatusDiv, 'No personality profile available. Generate one first.', 'error');
    return;
  }
  
  // Get simulation temperature
  const tempInput = document.getElementById('ai-assessment-temp');
  const temperature = parseFloat(tempInput?.value || 0.8);
  
  // Get number of runs per item
  const runsPerItem = parseInt(runsPerItemInput?.value || 3);
  if (runsPerItem < 1 || runsPerItem > 10) {
    showStatus(aiAssessmentStatusDiv, 'Runs per item must be between 1 and 10.', 'error');
    return;
  }
  
  // Disable button and show loading status
  runAIAssessmentButton.disabled = true;
  showStatus(aiAssessmentStatusDiv, 'Running AI assessment...', 'loading');
  
  const aiScores = {};
  let completedRuns = 0;
  const totalRuns = TIPI_ITEMS.length * runsPerItem;
  
  try {
    // For each TIPI question...
    for (const item of TIPI_ITEMS) {
      const question = `${item.text}`;
      
      // Initialize score array for this question
      aiScores[item.id] = [];
      
      // Run multiple simulations per question for more accurate results
      for (let i = 0; i < runsPerItem; i++) {
        // Prepare system prompt with personality profile
        let systemPrompt = "You are a digital twin with the following personality profile. Answer the personality assessment question as if you were this person.\n\n";
        systemPrompt += JSON.stringify(currentGeneratedProfile, null, 2) + "\n\n";
        systemPrompt += "INSTRUCTIONS:\n";
        systemPrompt += "1. Consider the personality question carefully\n";
        systemPrompt += "2. Answer honestly based on your personality profile\n";
        systemPrompt += "3. Respond with ONLY a number from 1-5:\n";
        systemPrompt += "   1 = Disagree strongly\n";
        systemPrompt += "   2 = Disagree moderately\n";
        systemPrompt += "   3 = Neither agree nor disagree\n";
        systemPrompt += "   4 = Agree moderately\n";
        systemPrompt += "   5 = Agree strongly\n";
        systemPrompt += "4. Do not include any explanations or text - ONLY respond with a single digit 1-5\n";
        
        // Call API with the question
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            systemPrompt, 
            userMessage: question,
            temperature
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to get AI response (${response.status})`);
        }
        
        const data = await response.json();
        const aiResponse = data.response.trim();
        
        // Parse the score (1-5)
        const scoreMatch = aiResponse.match(/[1-5]/);
        if (scoreMatch) {
          const score = parseInt(scoreMatch[0]);
          aiScores[item.id].push(score);
        } else {
          console.warn(`Invalid AI response for question ${item.id}:`, aiResponse);
          // Add a placeholder score of 3 (neutral) for invalid responses
          aiScores[item.id].push(3);
        }
        
        // Update progress
        completedRuns++;
        const progress = Math.round((completedRuns / totalRuns) * 100);
        showStatus(aiAssessmentStatusDiv, `Running assessment... ${progress}% complete`, 'loading');
      }
    }
    
    // Calculate average scores for each question
    const finalScores = {};
    for (const [itemId, scores] of Object.entries(aiScores)) {
      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0);
        finalScores[itemId] = Math.round((sum / scores.length) * 10) / 10; // Round to 1 decimal place
      } else {
        finalScores[itemId] = 3; // Default to neutral if no valid scores
      }
    }
    
    // Save the AI scores
    aiTipiScores = finalScores;
    
    // Save to user data
    await saveUserAssessmentData();
    
    // Calculate and display alignment
    calculateAndDisplayAlignment();
    
    showStatus(aiAssessmentStatusDiv, 'AI assessment completed successfully!', 'success');
  } catch (error) {
    console.error('Error running AI assessment:', error);
    showStatus(aiAssessmentStatusDiv, `Error: ${error.message}`, 'error');
  } finally {
    runAIAssessmentButton.disabled = false;
  }
}

/**
 * Set up keyboard event listeners for the chat input
 */
function setupChatKeyboard() {
  // First, try to get the chat input element
  const chatInputElement = document.getElementById('chat-input');
  
  // Only proceed if the element exists
  if (chatInputElement) {
    // Add event listener for the Enter key
    chatInputElement.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
      }
    });
    
    // Focus the input when the page loads
    setTimeout(() => {
      if (document.getElementById('chat-input')) {
        document.getElementById('chat-input').focus();
      }
    }, 500);
  }
}

/**
 * Set up all event listeners for the UI
 */
function setupEventListeners() {
  // Chat page event listeners
  if (sendChatButton) {
    // Keep this as a backup but the primary input is now via Enter key
    sendChatButton.addEventListener('click', sendChatMessage);
  }

  // Add setupChatKeyboard to enable Enter key for sending messages
  setupChatKeyboard();

  // System prompt visibility toggle
  if (showSystemPromptCheckbox) {
    showSystemPromptCheckbox.addEventListener('change', toggleSystemPromptVisibility);
  }

  // System prompt operations
  if (saveSystemPromptButton) {
    saveSystemPromptButton.addEventListener('click', saveCurrentSystemPrompt);
  }

  if (saveAsSystemPromptButton) {
    saveAsSystemPromptButton.addEventListener('click', saveSystemPromptAs);
  }

  if (savedPromptsDropdown) {
    savedPromptsDropdown.addEventListener('change', selectSystemPrompt);
  }

  // Clear chat history
  if (clearChatButton) {
    clearChatButton.addEventListener('click', clearChat);
  }

  // Nav tabs event listeners
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', handleNavTabClick);
  });

  // Rest of event listeners...
  // ...
}

/**
 * Format the message content for display
 * @param {string} content - The raw message content
 * @returns {string} The formatted HTML
 */
function formatMessageContent(content) {
  if (!content) return '';
  
  // Simple formatting - we could add markdown support later
  // Escape HTML
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert newlines to <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

/**
 * Save the chat history for the current user
 */
async function saveChatHistory() {
  if (!currentUserId || !chatHistoryDiv) return;
  
  try {
    const chatHistory = Array.from(chatHistoryDiv.children).map(messageWrapper => ({
      role: messageWrapper.classList.contains('user-message') ? 'user' : 'assistant',
      content: messageWrapper.querySelector('.message').textContent
    }));
    
    const response = await fetch(`/api/users/${currentUserId}/chat-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatHistory })
    });
    
    if (!response.ok) {
      console.error('Failed to save chat history:', response.status);
    }
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

/**
 * Clear the chat history UI and backend storage (if applicable).
 */
function clearChat() {
  // Clear the chat display
  if (chatHistoryDiv) {
    chatHistoryDiv.innerHTML = '';
    
    // Optionally re-add the system messages if desired
    // addMessageToChat('system', 'Digital Twin Terminal v1.0');
    // addMessageToChat('system', 'Type your messages and press Enter...');
    // addMessageToChat('system', "Type 'clear' to clear the terminal");
  }
  
  // Clear the status div associated with the chat
  showStatus(chatStatusDiv, '', 'success'); 

  // Re-enable and focus the input
  if (chatInputElement) {
      chatInputElement.value = '';
      chatInputElement.disabled = false;
      chatInputElement.focus();
  }
  
  console.log('Chat cleared.');
}

/**
 * Add a message to the chat history UI, returning the created element
 * @param {string} role - The role ('user', 'assistant', 'system')
 * @param {string} content - The message content
 * @returns {HTMLElement | null} The created message wrapper element or null if chatHistoryDiv is not found
 */
function addMessageToChat(role, content) {
  if (!chatHistoryDiv) {
    console.error("Chat history element (chatHistoryDiv) not found. Cannot add message.");
    return null; 
  }
  
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message-wrapper ${role}-message`;
  
  // Use formatMessageContent to handle potential HTML in content
  const formattedContent = formatMessageContent(content);
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let messageHTML = '';
  if (role === 'system') {
    messageHTML = `<div class="message"># ${formattedContent}</div>`;
  } else if (role === 'user') {
    messageHTML = `<div class="message"><span class="prompt-symbol">$</span> ${formattedContent}</div>`;
  } else { // assistant
    // Assistant messages might include the typing indicator initially
    messageHTML = `<div class="message">${formattedContent || ''}</div>`; 
  }
  
  messageWrapper.setAttribute('data-time', timestamp);
  messageWrapper.innerHTML = messageHTML;
  
  chatHistoryDiv.appendChild(messageWrapper);
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to bottom
  
  return messageWrapper; // Return the wrapper element
}

// === New Tab Navigation Functions ===

/**
 * Load the list of users into the dropdown
 */
async function loadUserList() {
  if (!userSelectDropdown) {
    console.error('User select dropdown element not found');
    return;
  }
  
  // Clear existing options except the placeholder
  userSelectDropdown.innerHTML = '<option value="" disabled selected>-- Select User --</option>';
  
  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    const users = await response.json();
    
    // Filter out duplicate user entries using a Set to track unique IDs
    const uniqueUserIds = new Set();
    const uniqueUsers = [];
    
    users.forEach(user => {
      if (!uniqueUserIds.has(user.id)) {
        uniqueUserIds.add(user.id);
        uniqueUsers.push(user);
      } else {
        console.warn(`Duplicate user ID found: ${user.id} - skipping duplicate entry`);
      }
    });
    
    // Sort users alphabetically
    uniqueUsers.sort((a, b) => a.id.localeCompare(b.id));
    
    console.log(`Loaded ${uniqueUsers.length} users (filtered from ${users.length} total)`);
    
    // Add unique users to dropdown
    uniqueUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.id;
      userSelectDropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading user list:', error);
    if (userStatusDiv) {
      showStatus(userStatusDiv, `Error loading user list: ${error.message}`, 'error');
    }
  }
}