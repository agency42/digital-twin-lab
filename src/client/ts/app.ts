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
    characterCardGeneratorPromptTextarea: HTMLTextAreaElement | null;
    saveCharacterCardJsonButton: HTMLButtonElement | null;

    // Character card generation & display elements
    generateCharacterCardButton: HTMLButtonElement | null;
    characterCardGenerationStatusDiv: HTMLDivElement | null;
    jsonOutputContainer: HTMLElement | null;
    jsonOutput: HTMLElement | null;
    copyJsonButton: HTMLButtonElement | null;

    // Content library elements
    uploadFileInput: HTMLInputElement | null;
    contentLibraryPage: HTMLDivElement | null;
    selectAllImagesButton: HTMLButtonElement | null;
    uploadStatusDiv: HTMLDivElement | null;
    selectionSummarySpan: HTMLSpanElement | null;
    assetDisplayArea: HTMLDivElement | null;
    deleteSelectedButton: HTMLButtonElement | null;
    selectAllTextButton: HTMLButtonElement | null;
    deselectAllButton: HTMLButtonElement | null;
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
}

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', function () {
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
        currentUserDisplaySpan: document.getElementById(
            'current-user-display'
        ) as HTMLSpanElement | null,
        userBioTextarea: document.getElementById('user-bio') as HTMLTextAreaElement | null,
        saveBioButton: document.getElementById('save-bio-button') as HTMLButtonElement | null,
        bioStatusDiv: document.getElementById('bio-status') as HTMLDivElement | null,
        connectLinkedinButton: null,
        disconnectLinkedinButton: null,

        navTabs: document.querySelectorAll('.nav-tab'),
        pages: document.querySelectorAll('.page'),

        customGenerationPromptTextarea: document.getElementById(
            'custom-generation-prompt'
        ) as HTMLTextAreaElement | null,
        saveCustomGenerationPromptButton: document.getElementById(
            'save-custom-generation-prompt-button'
        ) as HTMLButtonElement | null,
        resetCustomGenerationPromptButton: document.getElementById(
            'reset-custom-generation-prompt-button'
        ) as HTMLButtonElement | null,
        customGenerationPromptStatusDiv: document.getElementById(
            'custom-generation-prompt-status'
        ) as HTMLDivElement | null,
        characterCardGeneratorPromptTextarea: document.getElementById(
            'character-card-generator-prompt'
        ) as HTMLTextAreaElement | null,
        saveCharacterCardJsonButton: document.getElementById(
            'save-character-card-json-button'
        ) as HTMLButtonElement | null,

        generateCharacterCardButton: document.getElementById(
            'generate-character-card-button'
        ) as HTMLButtonElement | null,
        characterCardGenerationStatusDiv: document.getElementById(
            'character-card-generation-status'
        ) as HTMLDivElement | null,
        jsonOutputContainer: document.getElementById('json-output-container') as HTMLElement | null,
        jsonOutput: document.getElementById('json-output') as HTMLElement | null,
        copyJsonButton: document.getElementById('copy-json-button') as HTMLButtonElement | null,

        uploadFileInput: document.getElementById('file-input') as HTMLInputElement | null,
        contentLibraryPage: document.getElementById(
            'content-library-page'
        ) as HTMLDivElement | null,
        selectAllImagesButton: document.getElementById(
            'select-all-image-button'
        ) as HTMLButtonElement | null,
        uploadStatusDiv: document.getElementById('upload-status') as HTMLDivElement | null,
        selectionSummarySpan: document.getElementById(
            'selection-summary'
        ) as HTMLSpanElement | null,
        assetDisplayArea: document.getElementById('asset-display-area') as HTMLDivElement | null,
        deleteSelectedButton: document.getElementById(
            'delete-selected-button'
        ) as HTMLButtonElement | null,
        selectAllTextButton: document.getElementById(
            'select-all-text-button'
        ) as HTMLButtonElement | null,
        deselectAllButton: document.getElementById(
            'deselect-all-button'
        ) as HTMLButtonElement | null,
        scrapeUrlInput: document.getElementById('scrape-url-input') as HTMLInputElement | null,
        startScrapingButton: document.getElementById(
            'start-scraping-button'
        ) as HTMLButtonElement | null,
        scrapeStatusDiv: document.getElementById('scrape-status') as HTMLDivElement | null,
        clearLibraryButton: document.getElementById(
            'clear-library-button'
        ) as HTMLButtonElement | null,
        clearLibraryStatusDiv: document.getElementById(
            'clear-library-status'
        ) as HTMLDivElement | null,

        chatHistoryDiv: document.getElementById('chat-history') as HTMLDivElement | null,
        chatInputElement: document.getElementById('chat-input') as HTMLInputElement | null,
        chatStatusDiv: document.getElementById('chat-status') as HTMLDivElement | null,
        clearChatButton: document.getElementById('clear-chat-button') as HTMLButtonElement | null,
        systemPromptEditor: document.getElementById(
            'system-prompt-editor'
        ) as HTMLTextAreaElement | null,
        saveSystemPromptButton: document.getElementById(
            'save-system-prompt'
        ) as HTMLButtonElement | null,
        saveAsSystemPromptButton: document.getElementById(
            'save-as-system-prompt'
        ) as HTMLButtonElement | null,
        savedPromptsDropdown: document.getElementById(
            'saved-prompts-dropdown'
        ) as HTMLSelectElement | null,
        showSystemPromptCheckbox: document.getElementById(
            'show-system-prompt'
        ) as HTMLInputElement | null,

        startUserAssessmentButton: document.getElementById(
            'start-user-assessment'
        ) as HTMLButtonElement | null,
        retakeUserAssessmentButton: document.getElementById(
            'retake-user-assessment'
        ) as HTMLButtonElement | null,
        assessmentModal: document.getElementById('assessment-modal') as HTMLDivElement | null,
        tipiModalForm: document.getElementById('tipi-modal-form') as HTMLFormElement | null,
        assessmentModalStatusDiv: document.getElementById(
            'assessment-modal-status'
        ) as HTMLDivElement | null,
        userAssessmentStatusSummary: document.getElementById(
            'user-assessment-status-summary'
        ) as HTMLDivElement | null,
        runAIAssessmentButton: document.getElementById(
            'run-ai-assessment'
        ) as HTMLButtonElement | null,
        aiAssessmentStatusDiv: document.getElementById(
            'ai-assessment-status'
        ) as HTMLDivElement | null,
        assessmentResultsArea: document.getElementById(
            'assessment-results-area'
        ) as HTMLDivElement | null,
        overallAlignmentSpan: document.getElementById(
            'overall-alignment'
        ) as HTMLSpanElement | null,
        dimensionAlignmentList: document.getElementById(
            'dimension-alignment-list'
        ) as HTMLUListElement | null,
        radarChartCanvas: document.getElementById('radar-chart') as HTMLCanvasElement | null,
        runsPerItemInput: document.getElementById('runs-per-item') as HTMLInputElement | null,
        itemAgreementSpan: document.getElementById('item-agreement') as HTMLSpanElement | null,
        aiAssessmentTempInput: document.getElementById(
            'ai-assessment-temp'
        ) as HTMLInputElement | null,
        assessmentSystemPromptEditor: document.getElementById(
            'assessment-system-prompt-editor'
        ) as HTMLTextAreaElement | null,
        saveAssessmentPromptVariationButton: document.getElementById(
            'save-assessment-prompt-variation-button'
        ) as HTMLButtonElement | null,
        resetAssessmentPromptButton: document.getElementById(
            'reset-assessment-prompt-button'
        ) as HTMLButtonElement | null,

        tipiModalQuestionsContainer: document.getElementById(
            'tipi-modal-questions'
        ) as HTMLDivElement | null,
        cancelAssessmentButton: document.getElementById(
            'cancel-assessment-button'
        ) as HTMLButtonElement | null,
        submitAssessmentModalButton: document.getElementById(
            'submit-assessment-modal-button'
        ) as HTMLButtonElement | null,
        closeAssessmentModalButton: document.getElementById(
            'close-assessment-modal'
        ) as HTMLSpanElement | null,
    };

    // Initialize modules
    initUserModule(elements);
    initNavigationModule(elements);
    initPromptModule(elements);

    (async () => {
        // Prefill the generator prompt in Config panel
        if (elements.characterCardGeneratorPromptTextarea) {
            const savedPrompt = localStorage.getItem('customGenerationPrompt');
            const { getDefaultCustomGenerationPrompt } = await import('./modules/promptModule.js');
            elements.characterCardGeneratorPromptTextarea.value =
                savedPrompt || getDefaultCustomGenerationPrompt();
        }
    })();

    // Initialize content module with only the content-library-specific UI elements
    const contentModuleElements = {
        uploadFileInput: elements.uploadFileInput,
        uploadStatusDiv: elements.uploadStatusDiv,
        selectionSummarySpan: elements.selectionSummarySpan,
        assetDisplayArea: elements.assetDisplayArea,
        deleteSelectedButton: elements.deleteSelectedButton,
        selectAllTextButton: elements.selectAllTextButton,
        selectAllImagesButton: elements.selectAllImagesButton,
        deselectAllButton: elements.deselectAllButton,
        scrapeUrlInput: elements.scrapeUrlInput,
        startScrapingButton: elements.startScrapingButton,
        scrapeStatusDiv: elements.scrapeStatusDiv,
        clearLibraryButton: elements.clearLibraryButton,
        clearLibraryStatusDiv: elements.clearLibraryStatusDiv,
    };
    initContentModule(contentModuleElements);

    initChatModule({
        chatHistoryDiv: document.getElementById('chat-history') as HTMLDivElement,
        chatInput: document.getElementById('chat-input') as HTMLInputElement,
        sendMessageButton: document.getElementById('send-message-button') as HTMLButtonElement,
        clearChatButton: document.getElementById('clear-chat-button') as HTMLButtonElement,
        chatStatusDiv: document.getElementById('chat-status') as HTMLDivElement,
    });
    initAssessmentModule(elements);
    initContentMediumModule();

    // Add disabled tab styling
    addDisabledTabStyling();

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
                if (elements.userStatusDiv) {
                    showStatus(
                        elements.userStatusDiv,
                        'Error restoring user session.',
                        'error',
                        3000
                    );
                }
            }
        }, 500); // Consider making this delay dynamic or based on an event if possible
    }

    console.log('Application initialized successfully');
});
