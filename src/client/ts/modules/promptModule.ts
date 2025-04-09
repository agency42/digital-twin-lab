/**
 * promptModule.ts - Handles base system prompt generation and management
 */
import { state, showStatus } from './utils.js';
import { updateNavigationTabsState } from './navigationModule.js';
import { BasePromptText, UserData } from '../types'; // Use new types

// Define a type for the elements passed to this module
interface PromptModuleElements {
    customGenerationPromptTextarea: HTMLTextAreaElement | null; // For user instructions to the generation process
    saveCustomGenerationPromptButton: HTMLButtonElement | null;
    resetCustomGenerationPromptButton: HTMLButtonElement | null;
    customGenerationPromptStatusDiv: HTMLDivElement | null;
    generateBasePromptButton: HTMLButtonElement | null; // Renamed button
    basePromptGenerationStatusDiv: HTMLDivElement | null; // Renamed status div
    basePromptOutputTextarea: HTMLTextAreaElement | null; // Renamed output area
    copyBasePromptButton: HTMLButtonElement | null; // Renamed button
    generateCharacterCardButton: HTMLButtonElement | null; 
    characterCardGenerationStatusDiv: HTMLDivElement | null;
}

// UI Elements cache - typed
let customGenerationPromptTextarea: HTMLTextAreaElement | null = null;
let saveCustomGenerationPromptButton: HTMLButtonElement | null = null;
let resetCustomGenerationPromptButton: HTMLButtonElement | null = null;
let customGenerationPromptStatusDiv: HTMLDivElement | null = null;
let generateBasePromptButton: HTMLButtonElement | null = null;
let basePromptGenerationStatusDiv: HTMLDivElement | null = null;
let basePromptOutputTextarea: HTMLTextAreaElement | null = null;
let copyBasePromptButton: HTMLButtonElement | null = null;
let basePromptDisplayContainer: HTMLDivElement | null = null; // Container for the base prompt text area
let noBasePromptMessage: HTMLElement | null = null; // Message when no prompt exists

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
    
    // Cache elements for base prompt generation/display section
    generateBasePromptButton = elements.generateBasePromptButton;
    basePromptGenerationStatusDiv = elements.basePromptGenerationStatusDiv;
    basePromptOutputTextarea = elements.basePromptOutputTextarea;
    copyBasePromptButton = elements.copyBasePromptButton;
    
    // Get base prompt display elements (assuming standard IDs)
    basePromptDisplayContainer = document.getElementById('base-prompt-display-container') as HTMLDivElement | null;
    noBasePromptMessage = document.getElementById('no-base-prompt-message');

    // Set up event listeners
    saveCustomGenerationPromptButton?.addEventListener('click', saveCustomGenerationPrompt);
    resetCustomGenerationPromptButton?.addEventListener('click', resetCustomGenerationPrompt);
    generateBasePromptButton?.addEventListener('click', generateBasePrompt);
    copyBasePromptButton?.addEventListener('click', copyBasePrompt);
    
    // Set up character card generation button
    const generateCharacterCardButton = document.getElementById('generate-character-card-button') as HTMLButtonElement;
    if (generateCharacterCardButton) {
        generateCharacterCardButton.addEventListener('click', generateCharacterCard);
    }

    // Load the custom generation prompt and display current base prompt on init
    loadCustomGenerationPrompt();
    displayBasePrompt(); // Display initial state

    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', (event: Event) => {
        console.log('Prompt module received user-data-loaded event');
        updateGenerateButtonState();
        updateCharacterCardButtonState();
        displayBasePrompt(); // Display user's saved base prompt
    });

    // Listen for asset selection changes
    document.addEventListener('assets-selection-changed', (event: Event) => {
        console.log('Prompt module received assets-selection-changed event:', (event as CustomEvent).detail);
        updateGenerateButtonState();
        updateCharacterCardButtonState();
    });
    
    // Listen for library cleared event
    document.addEventListener('library-cleared', () => {
        console.log('Prompt module received library-cleared event');
        state.currentBasePromptText = null; // Clear state
        displayBasePrompt(); // Refresh display (will show empty)
        resetCustomGenerationPrompt(); // Reset custom instructions
    });

    console.log('Prompt module initialized');
}

// --- Functions for Custom Generation Prompt --- 

export async function loadCustomGenerationPrompt(): Promise<void> {
    // ... (Implementation similar to old loadPersonalityPrompt, but fetches/saves to a different user data field or local storage) ...
    // For now, just load a default
    if (customGenerationPromptTextarea) {
         customGenerationPromptTextarea.value = getDefaultCustomGenerationPrompt();
    }
}

export function getDefaultCustomGenerationPrompt(): string {
    return `Analyze the following text which represents writings and information about a person. Based *only* on this text, generate a structured JSON object representing their personality profile. 

The JSON object should follow the character card template structure you've been provided. Include personality traits, voice characteristics, communication patterns, and platform-specific adaptations where discernible from the content.

Ensure the output is ONLY the JSON object, starting with { and ending with }.`;
}

export async function saveCustomGenerationPrompt(): Promise<void> {
    // ... (Implementation similar to old savePersonalityPrompt, saving to UserData.generation.customPrompt? or separate API?) ...
     showStatus(customGenerationPromptStatusDiv, 'Save custom generation prompt - Not implemented yet.', 'info');
}

export function resetCustomGenerationPrompt(): void {
    if (customGenerationPromptTextarea) {
        customGenerationPromptTextarea.value = getDefaultCustomGenerationPrompt();
        // Optionally save the reset state
        // saveCustomGenerationPrompt(); 
        showStatus(customGenerationPromptStatusDiv, 'Custom generation prompt reset to default.', 'success', 2000);
    }
}

// --- Functions for Base Prompt Generation & Display ---

/**
 * Generate a base system prompt
 */
export async function generateBasePrompt(): Promise<void> {
    if (!generateBasePromptButton || !basePromptGenerationStatusDiv) return;
    
    console.log('PRE-GENERATION STATE:', { /* Log relevant state */ });
    
    if (!state.currentUserId) {
        showStatus(basePromptGenerationStatusDiv, 'Please select a user first', 'error');
        return;
    }
    if (state.selectedAssets.size === 0) {
        showStatus(basePromptGenerationStatusDiv, 'Please select content assets first', 'error');
        return;
    }

    generateBasePromptButton.disabled = true;
    showStatus(basePromptGenerationStatusDiv, 'Generating base system prompt...', 'loading');

    // Get custom generation instructions
    const customPromptText = customGenerationPromptTextarea?.value.trim() || null;

    try {
        const selectedAssetIds = Array.from(state.selectedAssets);
        
        // Use the new API endpoint
        const response = await fetch(`/api/prompts/${state.currentUserId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                assetIds: selectedAssetIds,
                customPrompt: customPromptText // Send custom instructions
             })
        });

        if (!response.ok) {
            let errorMsg = `Failed to generate base prompt (${response.status})`;
            try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch {} 
            throw new Error(errorMsg);
        }

        const savedPromptData = await response.json(); // Backend now returns the full saved BasePrompt object
        console.log('Generated and saved base prompt data:', savedPromptData);

        // Update state
        state.currentBasePromptText = savedPromptData.prompt_text;
        if (state.currentUserData) {
            state.currentUserData.basePrompt = {
                id: savedPromptData.base_prompt_id,
                name: savedPromptData.prompt_name,
                promptText: savedPromptData.prompt_text,
                createdAt: savedPromptData.created_at,
                updatedAt: savedPromptData.updated_at
            };
            // Clear variations as they are based on the old base prompt
            state.currentUserData.promptVariations = {}; 
        } else {
             console.warn('generateBasePrompt: state.currentUserData is null, cannot update.');
        }

        // Update UI
        displayBasePrompt(); // Display the newly generated prompt
        showStatus(basePromptGenerationStatusDiv, 'Base prompt generated successfully', 'success', 3000);

        // Enable other tabs now that a base prompt exists
        updateNavigationTabsState(); 

        // Dispatch event (optional, if other modules need to react)
        const event = new CustomEvent('base-prompt-generated', {
            detail: { userId: state.currentUserId, prompt: savedPromptData }
        });
        document.dispatchEvent(event);

    } catch (error) {
        console.error('Error generating base prompt:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(basePromptGenerationStatusDiv, `Error: ${message}`, 'error');
    } finally {
         if (generateBasePromptButton) generateBasePromptButton.disabled = false;
    }
}

/**
 * Copy the base prompt text to clipboard
 */
export function copyBasePrompt(): void {
    if (!basePromptOutputTextarea?.value) {
         showStatus(basePromptGenerationStatusDiv, 'Nothing to copy', 'info');
         return;
    }
    navigator.clipboard.writeText(basePromptOutputTextarea.value)
        .then(() => {
            showStatus(basePromptGenerationStatusDiv, 'Base prompt copied', 'success', 2000);
        })
        .catch(err => {
            console.error('Clipboard API error:', err);
            showStatus(basePromptGenerationStatusDiv, 'Failed to copy prompt', 'error');
        });
}

/**
 * Update the generate button state based on selected assets and user
 */
export function updateGenerateButtonState(): void {
    if (!generateBasePromptButton) return;
    const canGenerate = !!state.currentUserId && state.selectedAssets.size > 0;
    generateBasePromptButton.disabled = !canGenerate;
    generateBasePromptButton.title = canGenerate ? 'Generate base prompt from selected assets' : 'Select a user and assets first';
    generateBasePromptButton.style.opacity = canGenerate ? '1' : '0.5';
}

/**
 * Displays the base prompt in the UI, if available in state.
 */
function displayBasePrompt(): void {
    console.log('[displayBasePrompt] Attempting to display base prompt...'); 
    if (!basePromptOutputTextarea || !noBasePromptMessage) {
        console.error('[displayBasePrompt] Missing required display elements:', {
            outputArea: !!basePromptOutputTextarea,
            message: !!noBasePromptMessage
        });
        return;
    }
    
    const basePromptText = state.currentUserData?.basePrompt?.promptText;
    console.log('[displayBasePrompt] Found basePromptText in state:', basePromptText ? `${basePromptText.substring(0,50)}...` : null);

    if (basePromptText) {
        basePromptOutputTextarea.value = basePromptText;
        basePromptOutputTextarea.style.display = 'block';
        noBasePromptMessage.style.display = 'none';
        if (copyBasePromptButton) copyBasePromptButton.style.display = 'block';
        console.log('[displayBasePrompt] Displayed base prompt text.');
    } else {
        console.log('[displayBasePrompt] No base prompt text found in state. Showing message.');
        basePromptOutputTextarea.value = ''; // Clear textarea
        basePromptOutputTextarea.style.display = 'none';
        noBasePromptMessage.style.display = 'block';
        if (copyBasePromptButton) copyBasePromptButton.style.display = 'none';
    }
}

/**
 * Function to generate a character card
 * This replaces the old base prompt generation with a more targeted approach
 */
export async function generateCharacterCard(): Promise<void> {
    // Get required elements
    const generateCharacterCardButton = document.getElementById('generate-character-card-button') as HTMLButtonElement;
    const characterCardGenerationStatus = document.getElementById('character-card-generation-status') as HTMLDivElement;
    
    if (!generateCharacterCardButton || !characterCardGenerationStatus) {
        console.error('Missing required elements for character card generation');
        return;
    }
    
    if (!state.currentUserId) {
        showStatus(characterCardGenerationStatus, 'Please select a user first', 'error');
        return;
    }
    
    if (state.selectedAssets.size === 0) {
        showStatus(characterCardGenerationStatus, 'Please select content assets first', 'error');
        return;
    }

    generateCharacterCardButton.disabled = true;
    showStatus(characterCardGenerationStatus, 'Generating character card...', 'loading');

    // Get the full prompt text
    const customGenerationPromptTextarea = document.getElementById('custom-generation-prompt') as HTMLTextAreaElement;
    const promptText = customGenerationPromptTextarea?.value.trim() || null;
    const selectedAssetIds = Array.from(state.selectedAssets);
    
    try {
        const response = await fetch(`/api/prompts/${state.currentUserId}/generate-character-card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                assetIds: selectedAssetIds,
                customPrompt: promptText // This is now the complete prompt
            })
        });
        
        if (!response.ok) {
            let errorMsg = `Failed to generate character card (${response.status})`;
            try { 
                const errorData = await response.json(); 
                errorMsg = errorData.error || errorMsg; 
            } catch {}
            throw new Error(errorMsg);
        }
        
        const savedPromptData = await response.json();
        console.log('Generated and saved character card:', savedPromptData);
        
        // Try to parse the JSON content
        try {
            const jsonContent = JSON.parse(savedPromptData.prompt_text);
            
            // Display in the JSON output container
            const jsonOutputContainer = document.getElementById('json-output-container');
            const jsonOutput = document.getElementById('json-output');
            const copyJsonButton = document.getElementById('copy-json-button');
            
            if (jsonOutputContainer && jsonOutput) {
                jsonOutput.textContent = JSON.stringify(jsonContent, null, 2);
                jsonOutputContainer.style.display = 'block';
                
                // Add copy functionality
                if (copyJsonButton) {
                    copyJsonButton.onclick = function() {
                        navigator.clipboard.writeText(jsonOutput.textContent || '')
                            .then(() => {
                                showStatus(characterCardGenerationStatus, 'JSON copied to clipboard!', 'success');
                                setTimeout(() => {
                                    showStatus(characterCardGenerationStatus, 'Character card generated successfully!', 'success');
                                }, 2000);
                            })
                            .catch(err => {
                                console.error('Failed to copy: ', err);
                                showStatus(characterCardGenerationStatus, 'Failed to copy JSON', 'error');
                            });
                    };
                }
            }
        } catch (parseError) {
            console.error('Error parsing generated JSON:', parseError);
            // If JSON parsing fails, just display as text
            const jsonOutputContainer = document.getElementById('json-output-container');
            const jsonOutput = document.getElementById('json-output');
            
            if (jsonOutputContainer && jsonOutput) {
                jsonOutput.textContent = savedPromptData.prompt_text;
                jsonOutputContainer.style.display = 'block';
            }
        }
        
        showStatus(characterCardGenerationStatus, 'Character card generated successfully!', 'success');
        
        // Enable other tabs if updateNavigationTabsState is available
        updateNavigationTabsState();
        
        // Dispatch event for character card generation
        const event = new CustomEvent('character-card-generated', {
            detail: { userId: state.currentUserId, prompt: savedPromptData }
        });
        document.dispatchEvent(event);
        
    } catch (error) {
        console.error('Error generating character card:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(characterCardGenerationStatus, `Error: ${message}`, 'error');
    } finally {
        generateCharacterCardButton.disabled = false;
    }
}

/**
 * Update the character card button state based on selected assets and user
 */
export function updateCharacterCardButtonState(): void {
    const generateCharacterCardButton = document.getElementById('generate-character-card-button') as HTMLButtonElement;
    if (!generateCharacterCardButton) return;
    
    const canGenerate = !!state.currentUserId && state.selectedAssets.size > 0;
    generateCharacterCardButton.disabled = !canGenerate;
    generateCharacterCardButton.title = canGenerate ? 'Generate character card from selected assets' : 'Select a user and assets first';
    generateCharacterCardButton.style.opacity = canGenerate ? '1' : '0.5';
} 