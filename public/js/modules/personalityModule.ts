/**
 * personalityModule.ts - Handles personality profile generation and management
 */
import { state, showStatus } from './utils.js';
import { updateNavigationTabsState } from './navigationModule.js';
import { Profile, UserData } from '../types'; // Use extensionless path, removed unused PersonaVariation

// Re-add local definitions for types used within this module, 
// or import from a central types file later.
// --- REMOVED INTERFACES (moved to types.ts) ---
// interface Profile { ... }
// interface PersonaVariation { ... }
// interface UserData { ... }

// Define a type for the elements passed to this module
interface PersonalityModuleElements {
    personalityPromptTextarea: HTMLTextAreaElement | null;
    savePromptButton: HTMLButtonElement | null;
    resetPromptButton: HTMLButtonElement | null;
    promptStatusDiv: HTMLDivElement | null;
    generatePersonalityButton: HTMLButtonElement | null;
    personalityGenerationStatusDiv: HTMLDivElement | null;
    personalityJsonOutputPre: HTMLPreElement | null;
    copyJsonButton: HTMLButtonElement | null;
    profileCardTemplate: HTMLTemplateElement | null;
    // Elements below seem related to other modules, confirm if needed here
    // scrapeUrlInput: HTMLInputElement | null;
    // startScrapingButton: HTMLButtonElement | null;
    // scrapeStatusDiv: HTMLDivElement | null;
}

// UI Elements cache - typed
let personalityPromptTextarea: HTMLTextAreaElement | null = null;
let savePromptButton: HTMLButtonElement | null = null;
let resetPromptButton: HTMLButtonElement | null = null;
let promptStatusDiv: HTMLDivElement | null = null;
let generatePersonalityButton: HTMLButtonElement | null = null;
let personalityGenerationStatusDiv: HTMLDivElement | null = null;
let personalityJsonOutputPre: HTMLPreElement | null = null;
let copyJsonButton: HTMLButtonElement | null = null;
let primaryPersonaDisplayContainer: HTMLDivElement | null = null;
let noPrimaryPersonaMessage: HTMLElement | null = null;
let profileCardTemplate: HTMLTemplateElement | null = null;
// Caching scrape elements seems redundant if they belong to contentModule
// let scrapeUrlInput: HTMLInputElement | null = null;
// let startScrapingButton: HTMLButtonElement | null = null;
// let scrapeStatusDiv: HTMLDivElement | null = null;

/**
 * Initialize the personality module
 * @param elements - UI elements for personality management
 */
export function initPersonalityModule(elements: PersonalityModuleElements): void {
    personalityPromptTextarea = elements.personalityPromptTextarea;
    savePromptButton = elements.savePromptButton;
    resetPromptButton = elements.resetPromptButton;
    promptStatusDiv = elements.promptStatusDiv;
    generatePersonalityButton = elements.generatePersonalityButton;
    personalityGenerationStatusDiv = elements.personalityGenerationStatusDiv;
    personalityJsonOutputPre = elements.personalityJsonOutputPre;
    copyJsonButton = elements.copyJsonButton;
    profileCardTemplate = elements.profileCardTemplate;
    // Get persona display elements directly
    primaryPersonaDisplayContainer = document.getElementById('primary-persona-display-container') as HTMLDivElement | null;
    noPrimaryPersonaMessage = document.getElementById('no-primary-persona-message');

    // Set up event listeners with null checks
    savePromptButton?.addEventListener('click', savePersonalityPrompt);
    resetPromptButton?.addEventListener('click', resetPersonalityPrompt);
    generatePersonalityButton?.addEventListener('click', generatePersonalityProfile);
    copyJsonButton?.addEventListener('click', copyGeneratedJson);

    // Load the default prompt or user's saved prompt
    loadPersonalityPrompt();

    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('Personality module received user-data-loaded event');
        if (customEvent.detail?.userId) {
            // User data loaded, update button state and display persona
            updateGenerateButtonState();
            displayPrimaryPersona();
        }
    });

    // Listen for content library page activation (to refresh persona display)
    document.addEventListener('content-library-page-activated', (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('Personality module received content-library-page-activated event');
        if (customEvent.detail?.userId) {
            displayPrimaryPersona();
        }
    });

    // Listen for asset selection changes
    document.addEventListener('assets-selection-changed', (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('Personality module received assets-selection-changed event:', customEvent.detail);
        updateGenerateButtonState();
    });
    
    // Listen for library cleared event
    document.addEventListener('library-cleared', () => {
        console.log('Personality module received library-cleared event');
        displayPrimaryPersona(); // Refresh display (will show empty)
        // Clear generated output
        if (personalityJsonOutputPre) {
            personalityJsonOutputPre.textContent = '';
            personalityJsonOutputPre.style.display = 'none';
        }
        if (copyJsonButton) {
            copyJsonButton.style.display = 'none';
        }
        // Reset prompt to default if desired?
        // resetPersonalityPrompt(); 
    });

    console.log('Personality module initialized');
}

/**
 * Load the personality generation prompt from storage or default
 */
export async function loadPersonalityPrompt(): Promise<void> {
    if (!personalityPromptTextarea) return;

    // Set a default prompt first
    const defaultPrompt = getDefaultPersonalityPrompt();
    personalityPromptTextarea.value = defaultPrompt;

    // If a user is selected, try to load their custom prompt from the state
    if (state.currentUserId && state.currentUserData?.generation?.customPrompt) {
        console.log('Loading custom prompt from state.currentUserData');
        personalityPromptTextarea.value = state.currentUserData.generation.customPrompt;
    } else if (state.currentUserId) {
         // Fallback: Fetch if not in state (should ideally be loaded by userModule)
        console.warn('Custom prompt not found in state, attempting fetch (may be redundant)');
        try {
            const response = await fetch(`/api/users/${state.currentUserId}`);
            if (!response.ok) throw new Error('Failed to fetch user data for prompt');
            const userData: UserData = await response.json();
            if (userData?.generation?.customPrompt) {
                personalityPromptTextarea.value = userData.generation.customPrompt;
            } else {
                 personalityPromptTextarea.value = defaultPrompt; // Ensure default if fetch fails or no prompt
            }
        } catch (error) {
            console.error('Error loading personality prompt via fallback fetch:', error);
            personalityPromptTextarea.value = defaultPrompt; // Ensure default on error
        }
    }
}

/**
 * Get the default personality generation prompt
 * @returns The default prompt text
 */
export function getDefaultPersonalityPrompt(): string {
    return `You are a personality profiler who creates detailed AI personalities from a user's content.\n\nYour task is to analyze the provided content to extract the user's personality traits, voice, interests, and values. This will be used to create a digital twin that authentically represents them. \n\nCreate a structured SoulScript JSON personality profile with these components:\n1. Core Traits - The key personality characteristics that define them\n2. Values - Fundamental beliefs and principles they hold dear\n3. Voice - Their communication style, vocabulary, and expression patterns\n4. Big Five Traits - Explicit openness, conscientiousness, extraversion, agreeableness, neuroticism mapping\n5. Relationship Style - How they interact with others\n6. Entity Details - Information for contextualizing the personality\n\nAnalyze personality patterns rather than specific knowledge. Focus on VOICE patterns that reveal personality.\n\nI've collected content representing this person. Analyze it to create their personality profile as a JSON object.`;
}

/**
 * Save the current personality prompt text
 */
export async function savePersonalityPrompt(): Promise<void> {
    if (!state.currentUserId || !personalityPromptTextarea) {
        showStatus(promptStatusDiv, 'Please select a user first', 'error');
        return;
    }
    const currentUserId = state.currentUserId;

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
        });

        if (!response.ok) {
            let errorMsg = `Failed to save prompt (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore parsing error */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('Prompt save response:', data);
        
        // Update state if currentUserData exists
        if (state.currentUserData) {
            if (!state.currentUserData.generation) {
                state.currentUserData.generation = {};
            }
            state.currentUserData.generation.customPrompt = promptText;
        }

        showStatus(promptStatusDiv, 'Prompt saved successfully', 'success', 2000);
    } catch (error) {
        console.error('Error saving prompt:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(promptStatusDiv, `Error saving prompt: ${message}`, 'error');
    }
}

/**
 * Reset the personality prompt to the default
 */
export function resetPersonalityPrompt(): void {
    if (!personalityPromptTextarea) return;

    const defaultPrompt = getDefaultPersonalityPrompt();
    personalityPromptTextarea.value = defaultPrompt;

    // If a user is selected, save this default prompt as their custom prompt
    if (state.currentUserId) {
        savePersonalityPrompt(); // This will save the default text
    } else {
        showStatus(promptStatusDiv, 'Default prompt loaded (no user selected)', 'info');
    }
}

/**
 * Generate a personality profile
 */
export async function generatePersonalityProfile(): Promise<void> {
    if (!generatePersonalityButton || !personalityGenerationStatusDiv) return;
    
    // Log pre-generation state for debugging
    console.log('PRE-GENERATION STATE:', {
        currentUserId: state.currentUserId,
        hasCurrentGeneratedProfile: !!state.currentGeneratedProfile,
        hasUserDataProfile: !!state.currentUserData?.primaryPersona?.profile,
        userDataPrimaryPersonaId: state.currentUserData?.primaryPersona?.id || 'none',
        selectedAssetCount: state.selectedAssets.size
    });
    
    if (!state.currentUserId) {
        showStatus(personalityGenerationStatusDiv, 'Please select a user first', 'error');
        return;
    }
    if (state.selectedAssets.size === 0) {
        showStatus(personalityGenerationStatusDiv, 'Please select content assets first', 'error');
        return;
    }

    generatePersonalityButton.disabled = true;
    showStatus(personalityGenerationStatusDiv, 'Generating personality profile...', 'loading');

    try {
        const selectedAssetIds = Array.from(state.selectedAssets);
        
        const response = await fetch(`/api/personality/${state.currentUserId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetIds: selectedAssetIds })
        });

        if (!response.ok) {
            let errorMsg = `Failed to generate personality (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('Generated personality:', data);

        // Debug log the data structure
        console.log('PERSONALITY RESPONSE DATA:', {
            persona_id: data.persona_id,
            personality: data.personality ? 'exists' : 'missing',
            keys: Object.keys(data)
        });

        // Update state
        state.currentGeneratedProfile = data.personality;
        console.log('Updated state.currentGeneratedProfile:', !!state.currentGeneratedProfile);
        
        // Update userData if it exists
        if (state.currentUserData) {
            // Make sure primaryPersona exists and is properly structured
            state.currentUserData.primaryPersona = {
                id: data.persona_id,
                profile: data.personality,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            console.log('Updated state.currentUserData.primaryPersona:', {
                id: state.currentUserData.primaryPersona.id || 'none',
                hasProfile: !!state.currentUserData.primaryPersona.profile
            });
            
            // Clear variations as they are based on the old persona
            state.currentUserData.personaVariations = {}; 
        } else {
            console.warn('state.currentUserData is null/undefined! Cannot update primaryPersona.');
        }

        // Update UI
        if (personalityJsonOutputPre) {
            personalityJsonOutputPre.textContent = JSON.stringify(data.personality, null, 2);
            personalityJsonOutputPre.style.display = 'block';
        }
        if (copyJsonButton) {
            copyJsonButton.style.display = 'block';
        }

        // Reload user data to ensure all state is properly updated
        if (state.currentUserId) {
            try {
                console.log('Fetching fresh user data after personality generation');
                const userResponse = await fetch(`/api/users/${state.currentUserId}`);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    
                    // Log the structure of the userData response
                    console.log('FETCHED USER DATA AFTER GENERATION:', {
                        has_primaryPersona: !!userData.primaryPersona,
                        primaryPersona_id: userData.primaryPersona?.id || 'none',
                        has_profile: !!userData.primaryPersona?.profile,
                        raw_keys: Object.keys(userData)
                    });
                    
                    // Update user data in state
                    state.currentUserData = userData;
                    
                    // If the userData doesn't have primaryPersona structure,
                    // we need to create it for the frontend
                    if (!userData.primaryPersona && state.currentGeneratedProfile) {
                        console.log('Creating primaryPersona structure in state');
                        state.currentUserData!.primaryPersona = {
                            id: data.persona_id, // Use the persona_id from the generation response
                            profile: state.currentGeneratedProfile,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                    }
                }
            } catch (error) {
                console.warn('Error refreshing user data after personality generation:', error);
                // Continue even if this fails
            }
        }

        // Log the updated state before calling updateNavigationTabsState
        console.log('POST-GENERATION STATE (pre-navigation update):', {
            currentUserId: state.currentUserId,
            hasCurrentGeneratedProfile: !!state.currentGeneratedProfile,
            hasUserDataProfile: !!state.currentUserData?.primaryPersona?.profile,
            userDataPrimaryPersonaId: state.currentUserData?.primaryPersona?.id || 'none',
            userData: state.currentUserData ? {
                has_primary_persona: !!state.currentUserData.primaryPersona,
                has_primary_persona_profile: !!state.currentUserData.primaryPersona?.profile,
                primaryPersonaId: state.currentUserData.primaryPersona?.id || 'none'
            } : 'null'
        });

        updateNavigationTabsState(); // Enable chat/assessment tabs
        displayPrimaryPersona(); // Refresh the saved persona display
        showStatus(personalityGenerationStatusDiv, 'Personality profile generated successfully', 'success', 3000);

        // Dispatch event
        const event = new CustomEvent('personality-generated', {
            detail: { userId: state.currentUserId, profile: data.personality, personaId: data.persona_id }
        });
        document.dispatchEvent(event);

        // Final state check
        console.log('FINAL POST-GENERATION STATE:', {
            currentUserId: state.currentUserId,
            hasCurrentGeneratedProfile: !!state.currentGeneratedProfile,
            hasUserDataProfile: !!state.currentUserData?.primaryPersona?.profile,
            userDataPrimaryPersonaId: state.currentUserData?.primaryPersona?.id || 'none'
        });

    } catch (error) {
        console.error('Error generating personality:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(personalityGenerationStatusDiv, `Error generating personality: ${message}`, 'error');
    } finally {
         if (generatePersonalityButton) generatePersonalityButton.disabled = false;
    }
}

/**
 * Copy the generated personality JSON to clipboard
 */
export function copyGeneratedJson(): void {
    if (!personalityJsonOutputPre?.textContent) {
         showStatus(personalityGenerationStatusDiv, 'Nothing to copy', 'info');
         return;
    }
    
    const jsonText = personalityJsonOutputPre.textContent;

    navigator.clipboard.writeText(jsonText)
        .then(() => {
            showStatus(personalityGenerationStatusDiv, 'JSON copied to clipboard', 'success', 2000);
        })
        .catch(err => {
            console.error('Clipboard API error:', err);
            showStatus(personalityGenerationStatusDiv, 'Failed to copy using Clipboard API', 'error');
            // Fallback selection method (less reliable)
            try {
                if (!personalityJsonOutputPre) throw new Error('JSON output element not found');
                const range = document.createRange();
                range.selectNodeContents(personalityJsonOutputPre); 
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand('copy');
                    selection.removeAllRanges();
                    showStatus(personalityGenerationStatusDiv, 'JSON selected (manual copy might be needed)', 'info', 3000);
                } else {
                     throw new Error('window.getSelection() is null');
                }
            } catch (fallbackErr) {
                console.error('Fallback copy method failed:', fallbackErr);
                 showStatus(personalityGenerationStatusDiv, 'Failed to copy JSON automatically', 'error');
            }
        });
}

/**
 * Update the generate button state based on selected assets and user
 */
export function updateGenerateButtonState(): void {
    if (!generatePersonalityButton) return;
    const canGenerate = !!state.currentUserId && state.selectedAssets.size > 0;
    generatePersonalityButton.disabled = !canGenerate;
    generatePersonalityButton.style.opacity = canGenerate ? '1' : '0.5';
}

/**
 * Displays the primary persona in the UI, if available in state.
 */
function displayPrimaryPersona(): void {
    if (!primaryPersonaDisplayContainer || !noPrimaryPersonaMessage || !profileCardTemplate) {
        console.warn('displayPrimaryPersona: Missing required display or template elements.');
        return;
    }

    const primaryPersona = state.currentUserData?.primaryPersona;

    primaryPersonaDisplayContainer.innerHTML = ''; // Clear previous content

    if (primaryPersona?.profile) {
        console.log('Displaying primary persona:', primaryPersona.id);
        try {
            const card = createProfileCard(primaryPersona.profile, primaryPersona.updatedAt || primaryPersona.createdAt);
            primaryPersonaDisplayContainer.appendChild(card);
            noPrimaryPersonaMessage.style.display = 'none';
        } catch (error) {
            console.error('Error creating profile card:', error);
             noPrimaryPersonaMessage.textContent = 'Error displaying primary persona.';
             noPrimaryPersonaMessage.style.display = 'block';
        }
    } else {
        console.log('No primary persona found in state to display.');
        noPrimaryPersonaMessage.textContent = 'No primary personality profile generated yet. Use the "Generate Personality" section above.';
        noPrimaryPersonaMessage.style.display = 'block';
    }
}

/**
 * Create a profile card element for a personality
 * @param profile - The personality profile data object
 * @param timestamp - Creation/update timestamp string
 * @returns The card element (HTMLElement)
 */
export function createProfileCard(profile: Profile, timestamp: string): HTMLElement {
    if (!profileCardTemplate) {
        console.error('Profile card template not found');
        const fallback = document.createElement('div');
        fallback.textContent = 'Error: Profile template missing.';
        return fallback;
    }

    const clone = document.importNode(profileCardTemplate.content, true);
    const card = clone.querySelector('.profile-card') as HTMLElement | null;
    if (!card) throw new Error ('Invalid profile card template: Missing .profile-card element');

    // Set title and date
    const titleEl = card.querySelector('.profile-card-title') as HTMLElement | null;
    const dateEl = card.querySelector('.profile-card-date') as HTMLElement | null;
    if (titleEl) titleEl.textContent = 'Primary Personality Profile'; // Static title for now
    if (dateEl) dateEl.textContent = `Updated: ${new Date(timestamp).toLocaleString()}`;

    // Add trait badges
    const traitsEl = card.querySelector('.traits-summary') as HTMLElement | null;
    if (traitsEl && profile.big_five_traits) {
        traitsEl.innerHTML = ''; // Clear any template placeholders
        for (const [trait, level] of Object.entries(profile.big_five_traits)) {
            if (typeof level !== 'string') continue; // Skip if level is not a string
            const badge = document.createElement('span');
            badge.className = 'trait-badge';
            badge.textContent = `${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${level}`;
            // Add basic styling based on level (could be improved)
            if (level.toLowerCase() === 'high') badge.style.cssText = 'background-color:#d4edda; color:#155724;';
            else if (level.toLowerCase() === 'low') badge.style.cssText = 'background-color:#f8d7da; color:#721c24;';
            else badge.style.cssText = 'background-color:#e0e0e0; color:#333;';
            traitsEl.appendChild(badge);
        }
    }

    // Setup view button action
    const viewBtn = card.querySelector('.view-profile-button') as HTMLButtonElement | null;
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            showProfileModal(profile);
        });
    }

    return card;
}

/**
 * Show a personality profile in a modal (Dispatches event)
 * @param profile - The personality profile object to display
 */
export function showProfileModal(profile: Profile): void {
    console.log('Dispatching show-profile-modal event');
    const event = new CustomEvent('show-profile-modal', {
        detail: { profile }
    });
    document.dispatchEvent(event);
    // Actual modal display logic should be handled by the main app or a dedicated modal module
} 