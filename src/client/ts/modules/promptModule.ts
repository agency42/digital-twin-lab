/**
 * promptModule.ts - Handles base system prompt generation and management
 */
import { state, showStatus } from './utils.js';
import { updateNavigationTabsState } from './navigationModule.js';
import { CharacterCard } from '../types'; // Import CharacterCard

// Define a type for the elements passed to this module
interface PromptModuleElements {
    customGenerationPromptTextarea: HTMLTextAreaElement | null; // For user instructions to the generation process
    saveCustomGenerationPromptButton: HTMLButtonElement | null;
    resetCustomGenerationPromptButton: HTMLButtonElement | null;
    customGenerationPromptStatusDiv: HTMLDivElement | null;
    // Remove base prompt related elements if no longer generating separate base prompts
    // generateBasePromptButton: HTMLButtonElement | null; 
    // basePromptGenerationStatusDiv: HTMLDivElement | null; 
    // basePromptOutputTextarea: HTMLTextAreaElement | null; 
    // copyBasePromptButton: HTMLButtonElement | null; 
    generateCharacterCardButton: HTMLButtonElement | null; 
    characterCardGenerationStatusDiv: HTMLDivElement | null;
    jsonOutputContainer: HTMLElement | null; // Container for the JSON output
    jsonOutput: HTMLElement | null;          // The pre element for JSON
    copyJsonButton: HTMLButtonElement | null;
}

// UI Elements cache - typed
let customGenerationPromptTextarea: HTMLTextAreaElement | null = null;
let saveCustomGenerationPromptButton: HTMLButtonElement | null = null;
let resetCustomGenerationPromptButton: HTMLButtonElement | null = null;
let customGenerationPromptStatusDiv: HTMLDivElement | null = null;
// Remove base prompt UI elements
// let generateBasePromptButton: HTMLButtonElement | null = null;
// let basePromptGenerationStatusDiv: HTMLDivElement | null = null;
// let basePromptOutputTextarea: HTMLTextAreaElement | null = null;
// let copyBasePromptButton: HTMLButtonElement | null = null;
// let basePromptDisplayContainer: HTMLDivElement | null = null; 
// let noBasePromptMessage: HTMLElement | null = null; 

let generateCharacterCardButton: HTMLButtonElement | null = null; 
let characterCardGenerationStatusDiv: HTMLDivElement | null = null;
let jsonOutputContainer: HTMLElement | null = null;
let jsonOutput: HTMLElement | null = null;
let copyJsonButton: HTMLButtonElement | null = null;


/**
 * Initialize the prompt module
 * @param elements - UI elements for prompt management
 */
export function initPromptModule(elements: PromptModuleElements): void {
    // Cache elements for custom generation prompt section
    customGenerationPromptTextarea = elements.customGenerationPromptTextarea;
    saveCustomGenerationPromptButton = elements.saveCustomGenerationPromptButton;
    resetCustomGenerationPromptButton = elements.resetCustomGenerationPromptButton;
    customGenerationPromptStatusDiv = elements.customGenerationPromptStatusDiv;
    
    // Cache elements for character card generation/display
    generateCharacterCardButton = elements.generateCharacterCardButton;
    characterCardGenerationStatusDiv = elements.characterCardGenerationStatusDiv;
    jsonOutputContainer = elements.jsonOutputContainer;
    jsonOutput = elements.jsonOutput;
    copyJsonButton = elements.copyJsonButton;

    // Set up event listeners
    saveCustomGenerationPromptButton?.addEventListener('click', saveCustomGenerationPrompt);
    resetCustomGenerationPromptButton?.addEventListener('click', resetCustomGenerationPrompt);
    generateCharacterCardButton?.addEventListener('click', generateCharacterCard); 
    copyJsonButton?.addEventListener('click', copyGeneratedJson); // Add listener for copy JSON

    // Load the custom generation prompt
    loadCustomGenerationPrompt();
    // Display current character card (if any) on init
    displayCurrentCharacterCard(); 

    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', (event: Event) => {
        console.log('Prompt module received user-data-loaded event');
        updateCharacterCardButtonState();
        displayCurrentCharacterCard(); // Fetch and display user's current card
    });

    // Listen for asset selection changes
    document.addEventListener('assets-selection-changed', (event: Event) => {
        console.log('Prompt module received assets-selection-changed event:', (event as CustomEvent).detail);
        updateCharacterCardButtonState();
    });
    
    // Listen for library cleared event
    document.addEventListener('library-cleared', () => {
        console.log('Prompt module received library-cleared event');
        // Clear displayed JSON
        if (jsonOutput) jsonOutput.textContent = '';
        if (jsonOutputContainer) jsonOutputContainer.style.display = 'none';
        resetCustomGenerationPrompt();
    });

    console.log('Prompt module initialized - Focused on Character Cards');
}

// --- Functions for Custom Generation Prompt (Keep as is for now) --- 

export async function loadCustomGenerationPrompt(): Promise<void> {
    // ... (Keep existing implementation or load from localStorage/API) ...
    const savedPrompt = localStorage.getItem('customGenerationPrompt');
    if (customGenerationPromptTextarea) {
         customGenerationPromptTextarea.value = savedPrompt || getDefaultCustomGenerationPrompt();
    }
}

export function getDefaultCustomGenerationPrompt(): string {
    // Default prompt from index.html
    return `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile. 

The JSON object should follow the character card template structure you've been provided. Include personality traits, voice characteristics, communication patterns, and platform-specific adaptations where discernible from the content.

Ensure the output is ONLY the JSON object, starting with { and ending with }.`;
}

export async function saveCustomGenerationPrompt(): Promise<void> {
    if (customGenerationPromptTextarea) {
        try {
            localStorage.setItem('customGenerationPrompt', customGenerationPromptTextarea.value);
            showStatus(customGenerationPromptStatusDiv, 'Generation prompt saved locally.', 'success', 2000);
        } catch (error: any) {
             showStatus(customGenerationPromptStatusDiv, `Error saving prompt: ${error.message}`, 'error');
        }
    }
}

export function resetCustomGenerationPrompt(): void {
    if (customGenerationPromptTextarea) {
        customGenerationPromptTextarea.value = getDefaultCustomGenerationPrompt();
        localStorage.removeItem('customGenerationPrompt'); // Also clear from storage
        showStatus(customGenerationPromptStatusDiv, 'Generation prompt reset to default.', 'success', 2000);
    }
}

// --- REMOVE Functions for Base Prompt Generation & Display ---
// remove generateBasePrompt
// remove copyBasePrompt
// remove updateGenerateButtonState
// remove displayBasePrompt


// --- Character Card Generation & Display ---

/**
 * Generate a new character card
 */
export async function generateCharacterCard(): Promise<void> {
    if (!generateCharacterCardButton || !characterCardGenerationStatusDiv) return;
    
    if (!state.currentUserId) {
        showStatus(characterCardGenerationStatusDiv, 'Please select a user first', 'error');
        return;
    }
    if (state.selectedAssets.size === 0) {
        showStatus(characterCardGenerationStatusDiv, 'Please select content assets first', 'error');
        return;
    }

    generateCharacterCardButton.disabled = true;
    showStatus(characterCardGenerationStatusDiv, 'Generating character card...', 'loading');
    if (jsonOutputContainer) jsonOutputContainer.style.display = 'none'; // Hide previous output

    // Get custom generation instructions
    const customPromptText = customGenerationPromptTextarea?.value.trim() || null;

    try {
        const selectedAssetIds = Array.from(state.selectedAssets);
        
        // Use the updated API endpoint
        const response = await fetch(`/api/prompts/${state.currentUserId}/generate-character-card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                assetIds: selectedAssetIds,
                customPrompt: customPromptText // Send custom instructions
             })
        });

        if (!response.ok) {
            let errorMsg = `Failed to generate character card (${response.status})`;
            try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch {}
            throw new Error(errorMsg);
        }

        const savedCard: CharacterCard = await response.json(); // Backend now returns the full saved CharacterCard object
        console.log('Generated and saved character card:', savedCard);

        // Display the generated JSON
        displayGeneratedJson(savedCard.card_data);
        
        showStatus(characterCardGenerationStatusDiv, 'Character card generated successfully', 'success', 3000);

        // Dispatch event with the full CharacterCard object
        const event = new CustomEvent('character-card-updated', {
            detail: { userId: state.currentUserId, cardData: savedCard } // Pass the full card object
        });
        document.dispatchEvent(event);

        // ** FIX: Explicitly update navigation state after successful generation **
        // Ensure state.currentUserData is updated (or assume it is by other listeners)
        if (!state.currentUserData) state.currentUserData = {}; // Initialize if null
        state.currentUserData.characterCard = savedCard; // Update state directly for immediate check
        updateNavigationTabsState(); // Call the update function

    } catch (error) {
        console.error('Error generating character card:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(characterCardGenerationStatusDiv, `Error: ${message}`, 'error');
    } finally {
         if (generateCharacterCardButton) generateCharacterCardButton.disabled = false;
    }
}

/**
 * Display the generated JSON in the output area.
 * @param jsonDataString The JSON data as a string.
 */
function displayGeneratedJson(jsonDataString: string | null): void {
    if (jsonOutput && jsonOutputContainer) {
        if (jsonDataString) {
            try {
                const parsedJson = JSON.parse(jsonDataString);
                jsonOutput.textContent = JSON.stringify(parsedJson, null, 2); // Pretty print
                jsonOutputContainer.style.display = 'block';
            } catch (e) {
                console.error("Error parsing generated JSON:", e);
                jsonOutput.textContent = "Error displaying JSON. Invalid format received.";
                jsonOutputContainer.style.display = 'block';
            }
        } else {
            jsonOutput.textContent = '';
            jsonOutputContainer.style.display = 'none';
        }
    }
}

/**
 * Fetches and displays the user's current character card.
 */
async function displayCurrentCharacterCard(): Promise<void> {
     if (!state.currentUserId) {
        displayGeneratedJson(null); // Clear display if no user
        return;
    }
    try {
        const response = await fetch(`/api/prompts/${state.currentUserId}/current-character-card`);
        if (response.ok) {
            const card: CharacterCard = await response.json();
            displayGeneratedJson(card.card_data);
            // Dispatch event so other modules know the current card
             const event = new CustomEvent('character-card-updated', {
                detail: { userId: state.currentUserId, cardData: card }
            });
            document.dispatchEvent(event);
        } else if (response.status === 404) {
            displayGeneratedJson(null); // No current card found
            console.log("No current character card found for user.");
        } else {
            throw new Error(`Failed to fetch current character card (${response.status})`);
        }
    } catch (error) {
        console.error("Error fetching current character card:", error);
        displayGeneratedJson('{\"error\": \"Could not load character card.\"}'); // Show error in JSON area
    }
}

/**
 * Copy the generated JSON text to clipboard
 */
export function copyGeneratedJson(): void {
    if (!jsonOutput?.textContent || jsonOutput.textContent.startsWith('Error')) {
         showStatus(characterCardGenerationStatusDiv, 'Nothing valid to copy', 'info');
         return;
    }
    navigator.clipboard.writeText(jsonOutput.textContent)
        .then(() => showStatus(characterCardGenerationStatusDiv, 'Character card JSON copied to clipboard!', 'success', 2000))
        .catch(err => {
            console.error('Failed to copy JSON:', err);
            showStatus(characterCardGenerationStatusDiv, 'Failed to copy JSON', 'error');
        });
}

/**
 * Update the state of the Generate Character Card button based on user and asset selection
 */
export function updateCharacterCardButtonState(): void {
    if (generateCharacterCardButton) {
        const enabled = !!state.currentUserId && state.selectedAssets.size > 0;
        generateCharacterCardButton.disabled = !enabled;
    }
} 