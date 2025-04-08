/**
 * app.ts - Main application entry point
 * Uses modular architecture for better maintainability
 */
// Import modules (add .js extension for browser compatibility)
import { initUserModule } from './modules/userModule.js';
import { initNavigationModule } from './modules/navigationModule.js';
import { initPersonalityModule } from './modules/personalityModule.js';
import { initChatModule } from './modules/chatModule.js';
import { initAssessmentModule } from './modules/assessmentModule.js';
import { initContentModule } from './modules/contentModule.js';
import { state, showStatus } from './modules/utils.js'; // Imports from the utils.ts source
// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing application with modular architecture');
    // Check if we need to restore the last selected user
    const lastSelectedUser = localStorage.getItem('lastSelectedUser');
    console.log('Last selected user from localStorage:', lastSelectedUser);
    // Cache UI element references using the defined interface
    // Type assertions are used here because getElementById can return null
    const elements = {
        userSelectDropdown: document.getElementById('user-select'),
        newUserInput: document.getElementById('new-user-id'),
        createUserButton: document.getElementById('create-user-button'),
        userStatusDiv: document.getElementById('user-status'),
        currentUserDisplaySpan: document.getElementById('current-user-display'),
        userBioTextarea: document.getElementById('user-bio'),
        saveBioButton: document.getElementById('save-bio-button'),
        bioStatusDiv: document.getElementById('bio-status'),
        connectLinkedinButton: document.getElementById('connect-linkedin-button'),
        disconnectLinkedinButton: document.getElementById('disconnect-linkedin-button'),
        navTabs: document.querySelectorAll('.nav-tab'),
        pages: document.querySelectorAll('.page'),
        personalityPromptTextarea: document.getElementById('personality-prompt'),
        savePromptButton: document.getElementById('save-prompt-button'),
        resetPromptButton: document.getElementById('reset-prompt-button'),
        promptStatusDiv: document.getElementById('prompt-status'),
        generatePersonalityButton: document.getElementById('generate-personality-button'),
        personalityGenerationStatusDiv: document.getElementById('personality-generation-status'),
        personalityJsonOutputPre: document.getElementById('personality-json-output'),
        copyJsonButton: document.getElementById('copy-json-button'),
        primaryPersonaDisplayContainer: document.getElementById('primary-persona-display-container'),
        profileCardTemplate: document.getElementById('profile-card-template'),
        fileInputElement: document.getElementById('file-input'),
        uploadButton: document.getElementById('upload-button'),
        uploadStatusDiv: document.getElementById('upload-status'),
        assetDisplayArea: document.getElementById('asset-display-area'),
        selectAllTextButton: document.getElementById('select-all-text-button'),
        selectAllImageButton: document.getElementById('select-all-image-button'),
        deselectAllButton: document.getElementById('deselect-all-button'),
        deleteSelectedButton: document.getElementById('delete-selected-button'),
        selectionSummarySpan: document.getElementById('selection-summary'),
        scrapeUrlInput: document.getElementById('scrape-url'),
        startScrapingButton: document.getElementById('start-scraping'),
        scrapeStatusDiv: document.getElementById('scrape-status'),
        clearLibraryButton: document.getElementById('clear-library-button'),
        clearLibraryStatusDiv: document.getElementById('clear-library-status'),
        chatHistoryDiv: document.getElementById('chat-history'),
        chatInputElement: document.getElementById('chat-input'),
        chatStatusDiv: document.getElementById('chat-status'),
        clearChatButton: document.getElementById('clear-chat-button'),
        systemPromptEditor: document.getElementById('system-prompt-editor'),
        saveSystemPromptButton: document.getElementById('save-system-prompt'),
        saveAsSystemPromptButton: document.getElementById('save-as-system-prompt'),
        savedPromptsDropdown: document.getElementById('saved-prompts-dropdown'),
        showSystemPromptCheckbox: document.getElementById('show-system-prompt'),
        startUserAssessmentButton: document.getElementById('start-user-assessment'),
        retakeUserAssessmentButton: document.getElementById('retake-user-assessment'),
        assessmentModal: document.getElementById('assessment-modal'),
        tipiModalForm: document.getElementById('tipi-modal-form'),
        assessmentModalStatusDiv: document.getElementById('assessment-modal-status'),
        userAssessmentStatusSummary: document.getElementById('user-assessment-status-summary'),
        runAIAssessmentButton: document.getElementById('run-ai-assessment'),
        aiAssessmentStatusDiv: document.getElementById('ai-assessment-status'),
        aiProfileSelect: document.getElementById('ai-profile-select'),
        assessmentResultsArea: document.getElementById('assessment-results-area'),
        overallAlignmentSpan: document.getElementById('overall-alignment'),
        dimensionAlignmentList: document.getElementById('dimension-alignment-list'),
        radarChartCanvas: document.getElementById('radar-chart'),
        runsPerItemInput: document.getElementById('runs-per-item'),
        itemAgreementSpan: document.getElementById('item-agreement'),
        aiAssessmentTempInput: document.getElementById('ai-assessment-temp'),
        // Add element retrievals for userModule
        tipiModalQuestionsContainer: document.getElementById('tipi-modal-questions'),
        cancelAssessmentButton: document.getElementById('cancel-assessment-button'),
        submitAssessmentModalButton: document.getElementById('submit-assessment-modal-button'),
        closeAssessmentModalButton: document.getElementById('close-assessment-modal'),
        // Add element retrievals for contentModule
        uploadFileInput: document.getElementById('file-input'),
        contentLibraryPage: document.getElementById('content-library-page'),
        selectAllImagesButton: document.getElementById('select-all-image-button')
    };
    // Initialize modules 
    initUserModule(elements);
    initNavigationModule(elements);
    initPersonalityModule(elements);
    initContentModule(elements);
    initChatModule(elements);
    initAssessmentModule(elements);
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
            }
            catch (error) {
                console.error('Error restoring last selected user:', error);
                // Use showStatus for user feedback if appropriate
                if (elements.userStatusDiv) {
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
function checkSocialAuthCallback() {
    console.log('Checking for social auth callbacks');
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    // Check for all possible auth parameters, explicitly typing them as string | null
    const authStatus = urlParams.get('auth_status');
    const oauthSource = urlParams.get('oauth_source');
    const status = urlParams.get('status');
    const userId = urlParams.get('user_id');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');
    // Check localStorage (not sessionStorage) for pending LinkedIn auth
    const pendingAuth = localStorage.getItem('pendingLinkedInAuth') === 'true';
    const pendingUserId = localStorage.getItem('linkedInAuthUserId');
    const lastSelectedUser = localStorage.getItem('lastSelectedUser'); // Already declared above, ensure consistency
    console.log('URL params and stored data:', {
        authStatus, oauthSource, status, userId, provider, error,
        pendingAuth, pendingUserId, lastSelectedUser
    });
    const userStatusDiv = document.getElementById('user-status');
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
    const isLinkedInCallback = (authStatus === 'success' && (provider === 'linkedin' || !provider)) ||
        (status === 'success' && (oauthSource === 'linkedin' || !oauthSource)) ||
        (oauthSource === 'linkedin' && status === 'success') ||
        (pendingAuth);
    if (isLinkedInCallback) {
        console.log('Detected LinkedIn auth callback');
        // Get the target user ID from URL param, localStorage, or fallback to last selected user
        const targetUserId = userId || pendingUserId || lastSelectedUser;
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
        const userSelect = document.getElementById('user-select');
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
        }
        else {
            console.warn('User select dropdown not found after LinkedIn auth.');
        }
    }
}
//# sourceMappingURL=app.js.map