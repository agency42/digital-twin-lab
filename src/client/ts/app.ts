/**
 * app.ts - Main application entry point
 * Uses modular architecture for better maintainability
 */

// Import modules (add .js extension for browser compatibility)
import { initUserModule } from './modules/userModule.js';
import { initNavigationModule, addDisabledTabStyling } from './modules/navigationModule.js';
import { initPromptModule } from './modules/promptModule.js';
import { initChatModule } from './modules/chatModule.js';
import { initAssessmentModule } from './modules/assessmentModule.js';
import { initContentModule } from './modules/contentModule.js';
import { initContentMediumModule } from './modules/contentMediumModule.js';
import { state, showStatus } from './utils.js'; // Imports from the utils.ts source

// Define an interface for the cached UI elements
// Using specific HTML element types and allowing for null
interface UIElements {
  // User module elements
  userSelectDropdown: HTMLSelectElement | null;
  newUserInput: HTMLInputElement | null;
  createUserButton: HTMLButtonElement | null;
  userStatusDiv: HTMLDivElement | null;
  currentUserDisplaySpan: HTMLSpanElement | null;
  userBioTextarea: HTMLTextAreaElement | null;
  saveBioButton: HTMLButtonElement | null;
  bioStatusDiv: HTMLDivElement | null;
  connectLinkedinButton: HTMLButtonElement | null;
  disconnectLinkedinButton: HTMLButtonElement | null;

  // Navigation module elements
  navTabs: NodeListOf<Element>; // Or more specific type like NodeListOf<HTMLAnchorElement> if applicable
  pages: NodeListOf<Element>; // Or more specific type like NodeListOf<HTMLDivElement>

  // Prompt module elements (Renamed from Personality)
  customGenerationPromptTextarea: HTMLTextAreaElement | null;
  saveCustomGenerationPromptButton: HTMLButtonElement | null;
  resetCustomGenerationPromptButton: HTMLButtonElement | null;
  customGenerationPromptStatusDiv: HTMLDivElement | null;

  // Character card generation & display elements
  generateCharacterCardButton: HTMLButtonElement | null;
  characterCardGenerationStatusDiv: HTMLDivElement | null;
  jsonOutputContainer: HTMLElement | null;
  jsonOutput: HTMLElement | null;
  copyJsonButton: HTMLButtonElement | null;

  // Asset management elements (content module)
  fileInputElement: HTMLInputElement | null;
  uploadButton: HTMLButtonElement | null;
  uploadStatusDiv: HTMLDivElement | null;
  assetDisplayArea: HTMLDivElement | null;
  selectAllTextButton: HTMLButtonElement | null;
  selectAllImageButton: HTMLButtonElement | null;
  deselectAllButton: HTMLButtonElement | null;
  deleteSelectedButton: HTMLButtonElement | null;
  selectionSummarySpan: HTMLSpanElement | null;
  scrapeUrlInput: HTMLInputElement | null;
  startScrapingButton: HTMLButtonElement | null;
  scrapeStatusDiv: HTMLDivElement | null;
  clearLibraryButton: HTMLButtonElement | null;
  clearLibraryStatusDiv: HTMLDivElement | null;

  // Chat module elements
  chatHistoryDiv: HTMLDivElement | null;
  chatInputElement: HTMLInputElement | null;
  chatStatusDiv: HTMLDivElement | null;
  clearChatButton: HTMLButtonElement | null;
  systemPromptEditor: HTMLTextAreaElement | null;
  saveSystemPromptButton: HTMLButtonElement | null;
  saveAsSystemPromptButton: HTMLButtonElement | null;
  savedPromptsDropdown: HTMLSelectElement | null;
  showSystemPromptCheckbox: HTMLInputElement | null;

  // Assessment module elements
  startUserAssessmentButton: HTMLButtonElement | null;
  retakeUserAssessmentButton: HTMLButtonElement | null;
  assessmentModal: HTMLDivElement | null;
  tipiModalForm: HTMLFormElement | null;
  assessmentModalStatusDiv: HTMLDivElement | null;
  userAssessmentStatusSummary: HTMLDivElement | null;
  runAIAssessmentButton: HTMLButtonElement | null;
  aiAssessmentStatusDiv: HTMLDivElement | null;
  assessmentResultsArea: HTMLDivElement | null;
  overallAlignmentSpan: HTMLSpanElement | null;
  dimensionAlignmentList: HTMLUListElement | null;
  radarChartCanvas: HTMLCanvasElement | null;
  runsPerItemInput: HTMLInputElement | null;
  itemAgreementSpan: HTMLSpanElement | null;
  aiAssessmentTempInput: HTMLInputElement | null;
  assessmentSystemPromptEditor: HTMLTextAreaElement | null;
  saveAssessmentPromptVariationButton: HTMLButtonElement | null;
  resetAssessmentPromptButton: HTMLButtonElement | null;

  // Add elements required by userModule
  tipiModalQuestionsContainer: HTMLDivElement | null;
  cancelAssessmentButton: HTMLButtonElement | null;
  submitAssessmentModalButton: HTMLButtonElement | null;
  closeAssessmentModalButton: HTMLSpanElement | null;

  // Add elements required by contentModule
  uploadFileInput: HTMLInputElement | null;
  contentLibraryPage: HTMLDivElement | null;
  selectAllImagesButton: HTMLButtonElement | null;
}

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing application with modular architecture');

  // Check if we need to restore the last selected user
  const lastSelectedUser: string | null = localStorage.getItem('lastSelectedUser');
  console.log('Last selected user from localStorage:', lastSelectedUser);

  // Cache UI element references using the defined interface
  // Type assertions are used here because getElementById can return null
  const elements: UIElements = {
    userSelectDropdown: document.getElementById('user-select') as HTMLSelectElement | null,
    newUserInput: document.getElementById('new-user-id') as HTMLInputElement | null,
    createUserButton: document.getElementById('create-user-button') as HTMLButtonElement | null,
    userStatusDiv: document.getElementById('user-status') as HTMLDivElement | null,
    currentUserDisplaySpan: document.getElementById('current-user-display') as HTMLSpanElement | null,
    userBioTextarea: document.getElementById('user-bio') as HTMLTextAreaElement | null,
    saveBioButton: document.getElementById('save-bio-button') as HTMLButtonElement | null,
    bioStatusDiv: document.getElementById('bio-status') as HTMLDivElement | null,
    connectLinkedinButton: document.getElementById('connect-linkedin-button') as HTMLButtonElement | null,
    disconnectLinkedinButton: document.getElementById('disconnect-linkedin-button') as HTMLButtonElement | null,

    navTabs: document.querySelectorAll('.nav-tab'),
    pages: document.querySelectorAll('.page'),

    customGenerationPromptTextarea: document.getElementById('custom-generation-prompt') as HTMLTextAreaElement | null,
    saveCustomGenerationPromptButton: document.getElementById('save-custom-generation-prompt-button') as HTMLButtonElement | null,
    resetCustomGenerationPromptButton: document.getElementById('reset-custom-generation-prompt-button') as HTMLButtonElement | null,
    customGenerationPromptStatusDiv: document.getElementById('custom-generation-prompt-status') as HTMLDivElement | null,

    generateCharacterCardButton: document.getElementById('generate-character-card-button') as HTMLButtonElement | null,
    characterCardGenerationStatusDiv: document.getElementById('character-card-generation-status') as HTMLDivElement | null,
    jsonOutputContainer: document.getElementById('json-output-container') as HTMLElement | null,
    jsonOutput: document.getElementById('json-output') as HTMLElement | null,
    copyJsonButton: document.getElementById('copy-json-button') as HTMLButtonElement | null,

    fileInputElement: document.getElementById('file-input') as HTMLInputElement | null,
    uploadButton: document.getElementById('upload-button') as HTMLButtonElement | null,
    uploadStatusDiv: document.getElementById('upload-status') as HTMLDivElement | null,
    assetDisplayArea: document.getElementById('asset-display-area') as HTMLDivElement | null,
    selectAllTextButton: document.getElementById('select-all-text-button') as HTMLButtonElement | null,
    selectAllImageButton: document.getElementById('select-all-image-button') as HTMLButtonElement | null,
    deselectAllButton: document.getElementById('deselect-all-button') as HTMLButtonElement | null,
    deleteSelectedButton: document.getElementById('delete-selected-button') as HTMLButtonElement | null,
    selectionSummarySpan: document.getElementById('selection-summary') as HTMLSpanElement | null,
    scrapeUrlInput: document.getElementById('scrape-url') as HTMLInputElement | null,
    startScrapingButton: document.getElementById('start-scraping') as HTMLButtonElement | null,
    scrapeStatusDiv: document.getElementById('scrape-status') as HTMLDivElement | null,
    clearLibraryButton: document.getElementById('clear-library-button') as HTMLButtonElement | null,
    clearLibraryStatusDiv: document.getElementById('clear-library-status') as HTMLDivElement | null,

    chatHistoryDiv: document.getElementById('chat-history') as HTMLDivElement | null,
    chatInputElement: document.getElementById('chat-input') as HTMLInputElement | null,
    chatStatusDiv: document.getElementById('chat-status') as HTMLDivElement | null,
    clearChatButton: document.getElementById('clear-chat-button') as HTMLButtonElement | null,
    systemPromptEditor: document.getElementById('system-prompt-editor') as HTMLTextAreaElement | null,
    saveSystemPromptButton: document.getElementById('save-system-prompt') as HTMLButtonElement | null,
    saveAsSystemPromptButton: document.getElementById('save-as-system-prompt') as HTMLButtonElement | null,
    savedPromptsDropdown: document.getElementById('saved-prompts-dropdown') as HTMLSelectElement | null,
    showSystemPromptCheckbox: document.getElementById('show-system-prompt') as HTMLInputElement | null,

    startUserAssessmentButton: document.getElementById('start-user-assessment') as HTMLButtonElement | null,
    retakeUserAssessmentButton: document.getElementById('retake-user-assessment') as HTMLButtonElement | null,
    assessmentModal: document.getElementById('assessment-modal') as HTMLDivElement | null,
    tipiModalForm: document.getElementById('tipi-modal-form') as HTMLFormElement | null,
    assessmentModalStatusDiv: document.getElementById('assessment-modal-status') as HTMLDivElement | null,
    userAssessmentStatusSummary: document.getElementById('user-assessment-status-summary') as HTMLDivElement | null,
    runAIAssessmentButton: document.getElementById('run-ai-assessment') as HTMLButtonElement | null,
    aiAssessmentStatusDiv: document.getElementById('ai-assessment-status') as HTMLDivElement | null,
    assessmentResultsArea: document.getElementById('assessment-results-area') as HTMLDivElement | null,
    overallAlignmentSpan: document.getElementById('overall-alignment') as HTMLSpanElement | null,
    dimensionAlignmentList: document.getElementById('dimension-alignment-list') as HTMLUListElement | null,
    radarChartCanvas: document.getElementById('radar-chart') as HTMLCanvasElement | null,
    runsPerItemInput: document.getElementById('runs-per-item') as HTMLInputElement | null,
    itemAgreementSpan: document.getElementById('item-agreement') as HTMLSpanElement | null,
    aiAssessmentTempInput: document.getElementById('ai-assessment-temp') as HTMLInputElement | null,
    assessmentSystemPromptEditor: document.getElementById('assessment-system-prompt-editor') as HTMLTextAreaElement | null,
    saveAssessmentPromptVariationButton: document.getElementById('save-assessment-prompt-variation-button') as HTMLButtonElement | null,
    resetAssessmentPromptButton: document.getElementById('reset-assessment-prompt-button') as HTMLButtonElement | null,

    tipiModalQuestionsContainer: document.getElementById('tipi-modal-questions') as HTMLDivElement | null,
    cancelAssessmentButton: document.getElementById('cancel-assessment-button') as HTMLButtonElement | null,
    submitAssessmentModalButton: document.getElementById('submit-assessment-modal-button') as HTMLButtonElement | null,
    closeAssessmentModalButton: document.getElementById('close-assessment-modal') as HTMLSpanElement | null,

    uploadFileInput: document.getElementById('file-input') as HTMLInputElement | null,
    contentLibraryPage: document.getElementById('content-library-page') as HTMLDivElement | null,
    selectAllImagesButton: document.getElementById('select-all-image-button') as HTMLButtonElement | null
  };

  // Initialize modules 
  initUserModule(elements);
  initNavigationModule(elements);
  initPromptModule(elements);
  initContentModule(elements);
  initChatModule({
    chatHistoryDiv: document.getElementById('chat-history') as HTMLDivElement,
    chatInput: document.getElementById('chat-input') as HTMLInputElement,
    sendMessageButton: document.getElementById('send-message-button') as HTMLButtonElement,
    clearChatButton: document.getElementById('clear-chat-button') as HTMLButtonElement,
    chatStatusDiv: document.getElementById('chat-status') as HTMLDivElement
  });
  initAssessmentModule(elements);
  initContentMediumModule();
  
  // Add disabled tab styling
  addDisabledTabStyling();

  // Check for social auth callback (e.g., LinkedIn)
  checkSocialAuthCallback();

  // Restore last selected user if available
  if (lastSelectedUser && elements.userSelectDropdown) {
    console.log('Restoring last selected user from localStorage:', lastSelectedUser);

    // Keep the original userSelectDropdown reference for the timeout closure
    const userSelectDropdownForTimeout = elements.userSelectDropdown;

    // Need to wait for users to load
    setTimeout(() => {
      // Check if the element still exists within the timeout callback
      if (!userSelectDropdownForTimeout) {
        console.error('User select dropdown not found when trying to restore selection.');
        return;
      }
      try {
        // Set the dropdown value
        userSelectDropdownForTimeout.value = lastSelectedUser;

        // Trigger change event to load user data if not already loaded
        // Make sure state.currentUserId access is safe (it's defined in utils.ts)
        if (!state.currentUserId) {
          console.log('Triggering user select change event for:', lastSelectedUser);
          const event = new Event('change');
          userSelectDropdownForTimeout.dispatchEvent(event);
        }
      } catch (error) {
        console.error('Error restoring last selected user:', error);
        // Use showStatus for user feedback if appropriate
        if(elements.userStatusDiv) {
          showStatus(elements.userStatusDiv, 'Error restoring user session.', 'error', 3000);
        }
      }
    }, 500); // Consider making this delay dynamic or based on an event if possible
  }

  console.log('Application initialized successfully');
});

/**
 * Check for social authentication callbacks (e.g., LinkedIn)
 * This needs to run at app startup to handle OAuth redirects
 */
function checkSocialAuthCallback(): void {
  console.log('Checking for social auth callbacks');

  // Parse the URL parameters
  const urlParams = new URLSearchParams(window.location.search);

  // Check for all possible auth parameters, explicitly typing them as string | null
  const authStatus: string | null = urlParams.get('auth_status');
  const oauthSource: string | null = urlParams.get('oauth_source');
  const status: string | null = urlParams.get('status');
  const userId: string | null = urlParams.get('user_id');
  const provider: string | null = urlParams.get('provider');
  const error: string | null = urlParams.get('error');

  // Check localStorage (not sessionStorage) for pending LinkedIn auth
  const pendingAuth: boolean = localStorage.getItem('pendingLinkedInAuth') === 'true';
  const pendingUserId: string | null = localStorage.getItem('linkedInAuthUserId');
  const lastSelectedUser: string | null = localStorage.getItem('lastSelectedUser'); // Already declared above, ensure consistency

  console.log('URL params and stored data:', {
    authStatus, oauthSource, status, userId, provider, error,
    pendingAuth, pendingUserId, lastSelectedUser
  });

  const userStatusDiv = document.getElementById('user-status') as HTMLDivElement | null;

  // If there was an error, show it and clear pending state
  if (error) {
    console.error('Authentication error:', error);
    if (userStatusDiv) {
      // Use the imported showStatus function (already checks for null container)
      showStatus(userStatusDiv, `Authentication error: ${error}`, 'error');
    }

    // Clean up all authentication state to prevent stale state
    localStorage.removeItem('pendingLinkedInAuth');
    localStorage.removeItem('linkedInAuthUserId');
    // Keep lastSelectedUser for selection restoration

    // Clear URL parameters even if there was an error
    if (authStatus || oauthSource || status || provider || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('Cleared URL parameters after error');
    }
    return;
  }

  // Handle LinkedIn auth callback - unified detection for all parameter combinations
  const isLinkedInCallback: boolean = 
    (authStatus === 'success' && (provider === 'linkedin' || !provider)) || 
    (status === 'success' && (oauthSource === 'linkedin' || !oauthSource)) ||
    (oauthSource === 'linkedin' && status === 'success') ||
    (pendingAuth);

  if (isLinkedInCallback) {
    console.log('Detected LinkedIn auth callback');

    // Get the target user ID from URL param, localStorage, or fallback to last selected user
    const targetUserId: string | null = userId || pendingUserId || lastSelectedUser;

    if (!targetUserId) {
      console.error('No target user ID found for LinkedIn auth');
      if (userStatusDiv) {
        showStatus(userStatusDiv, 'Authentication succeeded but user ID was lost.', 'error');
      }
      // Clean up potentially dangling state even if no user ID
      localStorage.removeItem('pendingLinkedInAuth');
      localStorage.removeItem('linkedInAuthUserId');
      if (authStatus || oauthSource || status || provider) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    console.log('Setting current user ID in state to:', targetUserId);
    state.currentUserId = targetUserId; // state is imported from utils

    // Clear authentication state immediately
    localStorage.removeItem('pendingLinkedInAuth');
    localStorage.removeItem('linkedInAuthUserId');

    // Clear URL parameters before loading user data
    if (authStatus || oauthSource || status || provider) {
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('Cleared URL parameters after successful auth');
    }

    // Update UI to show the correct user is selected
    const userSelect = document.getElementById('user-select') as HTMLSelectElement | null;
    if (userSelect) {
      userSelect.value = targetUserId; // Set dropdown value

      // Trigger change event to load user data
      console.log('Dispatching change event on user select for:', targetUserId);
      const event = new Event('change');
      userSelect.dispatchEvent(event);

      // Show success status (using the cached userStatusDiv if available)
      if (userStatusDiv) {
        showStatus(userStatusDiv, 'LinkedIn connected successfully!', 'success', 5000); // Added timeout
      }
    } else {
        console.warn('User select dropdown not found after LinkedIn auth.');
    }
  }
} 