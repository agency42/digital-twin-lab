/**
 * contentMediumModule.ts - Manages the Interactions page, including switching between mediums,
 *                          editing system prompts and instructions per medium, and generating content.
 */
import { state, showStatus } from './utils.js';
// Import necessary types, including CharacterCard and the new prompt types
import { CharacterCard, SystemPrompt, InstructionTemplate } from '../types'; 

// Remove redundant interface definitions
/*
interface CharacterCard {
    id: string;
    user_id: string;
    card_name?: string | null;
    card_data: string; // JSON string
    is_current: number; // 0 or 1
    based_on_assets?: string | null; // JSON string of asset IDs
    created_at: string;
    updated_at: string;
}

interface SystemPrompt {
    id: string;
    user_id: string;
    type: 'chat' | 'post';
    prompt_text: string;
    is_custom: number; // 0 or 1
    created_at: string;
    updated_at: string;
}

interface InstructionTemplate {
    id?: number;
    user_id: string;
    type: string;
    instruction_text: string;
    mainGoal?: string | null;
    examples?: string | null; // Assuming JSON string
    created_at: string;
    updated_at: string;
}
*/

// Define the extended InstructionTemplate with parsed examples
interface InstructionTemplateWithMetadata extends InstructionTemplate {
    parsedExamples?: Record<string, any>; // Or a more specific type for examples
}

// Interface for data needed on this page
interface GenerationsData {
    characterCard: CharacterCard | null;
    systemPrompt: SystemPrompt | null;
    instructionTemplate: InstructionTemplateWithMetadata | null;
}

// --- Interfaces ---

interface ContentMediumInstruction {
    // Using a simplified structure for now, adjust based on actual needs
    instruction: string;
    // Add other fields if necessary based on agent-data-structures.mdc or specific needs
}

interface ContentMediumElements {
    mediumTabsContainer: HTMLElement | null;
    systemPromptEditor: HTMLTextAreaElement | null;
    instructionEditor: HTMLTextAreaElement | null; // Added instruction editor element
    saveVariationButton: HTMLButtonElement | null; // May remove later if auto-saving
    resetPromptButton: HTMLButtonElement | null; // Renamed from resetToBasePromptButton
    generateContentButton: HTMLButtonElement | null;
    generatedContentOutput: HTMLElement | null;
    generationStatusDiv: HTMLDivElement | null;
    showSystemPromptCheckbox: HTMLInputElement | null;
    mainGoalInput: HTMLTextAreaElement | null; // Added main goal input element
    examplesInput: HTMLTextAreaElement | null; // Added examples input element
    // Remove elements related to character card/instruction set selection
}

type ContentMediumType = 'chat' | 'post';

// --- Module State ---

let systemPromptEditor: HTMLTextAreaElement | null = null;
let instructionEditor: HTMLTextAreaElement | null = null;
let resetPromptButton: HTMLButtonElement | null = null;
let generateContentButton: HTMLButtonElement | null = null;
let generatedContentOutput: HTMLElement | null = null;
let generationStatusDiv: HTMLDivElement | null = null; // Status for generation
let systemPromptStatusDiv: HTMLDivElement | null = null; // Status for sys prompt save/reset
let instructionStatusDiv: HTMLDivElement | null = null; // Status for instruction save
let mediumTabsContainer: HTMLElement | null = null;
let showSystemPromptCheckbox: HTMLInputElement | null = null;
let saveSystemPromptButton: HTMLButtonElement | null = null; // ADDED
let saveInstructionsButton: HTMLButtonElement | null = null; // ADDED
let mainGoalInput: HTMLTextAreaElement | null = null; // ADDED
let examplesInput: HTMLTextAreaElement | null = null; // ADDED
let saveMainGoalButton: HTMLButtonElement | null = null;
let saveExamplesButton: HTMLButtonElement | null = null;
let mainGoalStatusDiv: HTMLDivElement | null = null;
let examplesStatusDiv: HTMLDivElement | null = null;

let currentMedium: ContentMediumType = 'chat'; // Default medium
let currentCharacterCardData: string | null = null; // Store the raw card data for reset reference
let isInitialized = false;


// --- Initialization ---

/**
 * Initialize the content medium module by finding its elements in the DOM.
 */
export function initContentMediumModule(): void {
    console.log("Initializing Content Medium Module...");

    // Query elements directly within the init function
    mediumTabsContainer = document.querySelector('#generations-page .medium-tabs');
    systemPromptEditor = document.getElementById('system-prompt-editor') as HTMLTextAreaElement | null;
    instructionEditor = document.getElementById('instruction-editor') as HTMLTextAreaElement | null;
    resetPromptButton = document.getElementById('reset-prompt-button') as HTMLButtonElement | null;
    generateContentButton = document.getElementById('generate-content-button') as HTMLButtonElement | null;
    generatedContentOutput = document.getElementById('generated-content-output');
    generationStatusDiv = document.getElementById('generation-status') as HTMLDivElement | null;
    showSystemPromptCheckbox = document.getElementById('show-system-prompt-checkbox') as HTMLInputElement | null;
    
    // ADD selectors for new elements
    systemPromptStatusDiv = document.getElementById('system-prompt-status') as HTMLDivElement | null;
    instructionStatusDiv = document.getElementById('instruction-status') as HTMLDivElement | null;
    saveSystemPromptButton = document.getElementById('save-system-prompt-button') as HTMLButtonElement | null;
    saveInstructionsButton = document.getElementById('save-instructions-button') as HTMLButtonElement | null;
    mainGoalInput = document.getElementById('main-goal-input') as HTMLTextAreaElement | null;
    examplesInput = document.getElementById('examples-input') as HTMLTextAreaElement | null;
    
    // ADD selectors for new buttons and status divs with more logging
    saveMainGoalButton = document.getElementById('save-main-goal-button') as HTMLButtonElement | null;
    console.log("Found save-main-goal-button:", saveMainGoalButton !== null);
    
    saveExamplesButton = document.getElementById('save-examples-button') as HTMLButtonElement | null;
    console.log("Found save-examples-button:", saveExamplesButton !== null);
    
    mainGoalStatusDiv = document.getElementById('main-goal-status') as HTMLDivElement | null;
    examplesStatusDiv = document.getElementById('examples-status') as HTMLDivElement | null;

    // --- Add Robust Element Checks ---
    if (!mediumTabsContainer) console.error("ContentMediumModule Error: Could not find mediumTabsContainer (.medium-tabs)");
    if (!systemPromptEditor) console.error("ContentMediumModule Error: Could not find systemPromptEditor (#system-prompt-editor)");
    if (!instructionEditor) console.error("ContentMediumModule Error: Could not find instructionEditor (#instruction-editor)");
    if (!resetPromptButton) console.error("ContentMediumModule Error: Could not find resetPromptButton (#reset-prompt-button)");
    if (!generateContentButton) console.error("ContentMediumModule Error: Could not find generateContentButton (#generate-content-button)");
    if (!generatedContentOutput) console.error("ContentMediumModule Error: Could not find generatedContentOutput (#generated-content-output)");
    if (!generationStatusDiv) console.error("ContentMediumModule Error: Could not find generationStatusDiv (#generation-status)"); 
    if (!showSystemPromptCheckbox) console.error("ContentMediumModule Error: Could not find showSystemPromptCheckbox (#show-system-prompt-checkbox)");
    if (!systemPromptStatusDiv) console.error("ContentMediumModule Error: Could not find systemPromptStatusDiv (#system-prompt-status)");
    if (!instructionStatusDiv) console.error("ContentMediumModule Error: Could not find instructionStatusDiv (#instruction-status)");
    if (!saveSystemPromptButton) console.error("ContentMediumModule Error: Could not find saveSystemPromptButton (#save-system-prompt-button)");
    if (!saveInstructionsButton) console.error("ContentMediumModule Error: Could not find saveInstructionsButton (#save-instructions-button)");
    if (!mainGoalInput) console.error("ContentMediumModule Error: Could not find mainGoalInput (#main-goal-input)");
    if (!examplesInput) console.error("ContentMediumModule Error: Could not find examplesInput (#examples-input)");
    if (!saveMainGoalButton) console.error("ContentMediumModule Error: Could not find saveMainGoalButton (#save-main-goal-button)");
    if (!saveExamplesButton) console.error("ContentMediumModule Error: Could not find saveExamplesButton (#save-examples-button)");
    if (!mainGoalStatusDiv) console.error("ContentMediumModule Error: Could not find mainGoalStatusDiv (#main-goal-status)");
    if (!examplesStatusDiv) console.error("ContentMediumModule Error: Could not find examplesStatusDiv (#examples-status)");
    // --- End Element Checks ---

    // Add listeners only if elements exist
    if (mediumTabsContainer) {
        mediumTabsContainer.querySelectorAll('.medium-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const medium = tab.getAttribute('data-medium') as ContentMediumType | null;
                if (medium) {
                    switchMedium(medium); // Will now fetch data
                }
            });
        });
    } else {
         console.error("ContentMediumModule Error: Cannot add tab listeners because mediumTabsContainer was not found.");
    }

    resetPromptButton?.addEventListener('click', handleResetSystemPrompt);
    generateContentButton?.addEventListener('click', generateContent);
    saveSystemPromptButton?.addEventListener('click', handleSaveSystemPrompt);
    saveInstructionsButton?.addEventListener('click', handleSaveInstructions);
    
    // Remove event listener for the dedicated save main goal button
    // if (saveMainGoalButton) {
    //     console.log("Adding click event listener to saveMainGoalButton");
    //     saveMainGoalButton.addEventListener('click', function(event) {
    //         console.log("Main Goal save button clicked!");
    //         handleSaveMainGoal();
    //     });
    // } else {
    //     console.error("Cannot add click listener to saveMainGoalButton because element was not found");
    // }
    
    if (saveExamplesButton) {
        console.log("Adding click event listener to saveExamplesButton");
        saveExamplesButton.addEventListener('click', function(event) {
            console.log("Examples save button clicked!");
            handleSaveExamples();
        });
    } else {
        console.error("Cannot add click listener to saveExamplesButton because element was not found");
    }

    // Listen for user changes to trigger initial data load
    document.addEventListener('user-data-loaded', () => {
        console.log("ContentMediumModule: User data loaded, fetching initial generations data for", currentMedium);
        if (state.currentUserId) {
            fetchAndLoadGenerationsData(state.currentUserId, currentMedium);
        }
    });

    // Listen for character card updates to potentially refresh/reset data
    document.addEventListener('character-card-updated', (event: Event) => {
        const customEvent = event as CustomEvent<{ cardData: CharacterCard | null }>; // Expect full card object now
        console.log("%cContentMediumModule: Received 'character-card-updated' event!", "color: blue; font-weight: bold;");

        if (customEvent.detail && customEvent.detail.cardData) {
            const newCard = customEvent.detail.cardData;
            currentCharacterCardData = newCard.card_data; // Update the raw data for reset reference
            console.log("ContentMediumModule: Updated internal character card reference.");

            // If the current system prompt *was* the old character card (is_custom = 0),
            // automatically update the editor to reflect the new base card.
            // The backend handles updating non-custom prompts in the DB.
            if (systemPromptEditor && systemPromptEditor.getAttribute('data-is-custom') === '0') {
                console.log("ContentMediumModule: Current prompt was default, updating editor with new card data.");
                systemPromptEditor.value = currentCharacterCardData || '';
                // Optionally: Indicate that the prompt *is still* the default (maybe via UI styling or a message)
                showStatus(systemPromptStatusDiv, 'System prompt updated to match new character card.', 'info', 3000);
            } else {
                console.log("ContentMediumModule: Current prompt was custom, leaving editor as is. Reset button available.");
                // Optionally: Notify user that a new base card is available and they can reset
                showStatus(systemPromptStatusDiv, 'New character card generated. You can reset the system prompt if desired.', 'info', 5000);
            }
        } else {
            console.warn("ContentMediumModule: 'character-card-updated' event received, but no cardData in detail.");
        }
    });

    isInitialized = true;
    console.log("Content Medium Module Initialized.");
}

// --- Core Logic ---

/**
 * Fetches character card, system prompt, and instructions from the backend.
 * @param userId 
 * @param type 
 */
async function fetchAndLoadGenerationsData(userId: string, type: ContentMediumType): Promise<void> {
    console.log(`Fetching generations data for user ${userId}, type ${type}...`);
    try {
        const response = await fetch(`/api/prompts/${userId}/generations-data?type=${type}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to fetch generations data (${response.status})`);
        }
        const data: GenerationsData = await response.json();
        console.log("Received generations data:", data);

        // Update global state
        state.currentSystemPrompt = data.systemPrompt;
        state.currentInstructionTemplate = data.instructionTemplate;
        state.currentCharacterCardData = data.characterCard; // Also store the card from this response
        console.log("[State Update] Set state.currentSystemPrompt:", state.currentSystemPrompt);

        // Update UI
        if (systemPromptEditor) {
            systemPromptEditor.value = data.systemPrompt?.prompt_text ?? data.characterCard?.card_data ?? '';
            // Store is_custom status and current character card data for comparison/reset
            systemPromptEditor.setAttribute('data-is-custom', (data.systemPrompt?.is_custom ?? 0).toString());
            currentCharacterCardData = data.characterCard?.card_data ?? null;
             // Disable reset button if prompt is already default or no base card
            if (resetPromptButton) {
                resetPromptButton.disabled = !currentCharacterCardData || !data.systemPrompt?.is_custom;
            }
        } else {
            console.error("Cannot load system prompt, editor not found");
        }

        if (instructionEditor) {
            instructionEditor.value = data.instructionTemplate?.instruction_text ?? getDefaultInstructionText(type);
        } else {
            console.error("Cannot load instructions, editor not found");
        }

        // Populate the main goal field if it exists in the instruction template
        if (mainGoalInput && data.instructionTemplate && data.instructionTemplate.mainGoal) {
            mainGoalInput.value = data.instructionTemplate.mainGoal;
        } else if (mainGoalInput) {
            mainGoalInput.value = '';
        }
        
        // Populate the examples field if they exist in the instruction template
        if (examplesInput && data.instructionTemplate) {
            // Directly display the raw string from the database
            examplesInput.value = data.instructionTemplate.examples || ''; // Use empty string if null/undefined
        } else if (examplesInput) {
            examplesInput.value = ''; // Clear if no template or input element missing
        }

        // Dispatch event indicating data has been loaded for the current medium
        console.log("[Event Dispatch] Dispatching generations-data-loaded"); // Log before dispatch
        const event = new CustomEvent('generations-data-loaded', {
            detail: { userId: userId, type: type, systemPrompt: data.systemPrompt }
        });
        document.dispatchEvent(event);

    } catch (error: any) {
        console.error("Error fetching or loading generations data:", error);
        // Clear state on error
        state.currentSystemPrompt = null;
        state.currentInstructionTemplate = null;
        state.currentCharacterCardData = null; 
        showStatus(systemPromptStatusDiv, `Error loading data: ${error.message}`, 'error');
        // Optionally clear editors or show placeholder text on error
        if (systemPromptEditor) systemPromptEditor.value = 'Error loading prompt.';
        if (instructionEditor) instructionEditor.value = 'Error loading instructions.';
    }
}

/**
 * Switch the active medium tab and load its state by fetching from backend.
 * @param newMedium - The medium to switch to.
 */
function switchMedium(newMedium: ContentMediumType): void {
    if (newMedium === currentMedium && isInitialized) return; // No change or not ready
    if (!state.currentUserId) {
        console.warn("Cannot switch medium, no current user selected.");
        // Maybe show a status message
        return;
    }

    console.log(`Switching medium from ${currentMedium} to ${newMedium}`);

    // No need to save state locally, rely on explicit save buttons
    // saveCurrentMediumState(); 

    currentMedium = newMedium;
    setActiveTab(newMedium);

    // Fetch and load state for the new medium
    fetchAndLoadGenerationsData(state.currentUserId, newMedium);

    // Toggle UI elements visibility (Chat vs. Post)
    const chatInterface = document.getElementById('chat-interface');
    const contentGenerationArea = document.getElementById('content-generation-area');
    const mediumContentArea = document.getElementById('medium-content-area');

    // Logging added previously
    if (!chatInterface) console.error("switchMedium ERROR: Could not find chat-interface element");
    if (!contentGenerationArea) console.error("switchMedium ERROR: Could not find content-generation-area element");
    if (!mediumContentArea) console.error("switchMedium ERROR: Could not find medium-content-area element");

    if (chatInterface && contentGenerationArea) {
        if (newMedium === 'chat') {
            chatInterface.style.display = 'block';
            contentGenerationArea.style.display = 'none';
        } else { // 'post'
            chatInterface.style.display = 'none';
            contentGenerationArea.style.display = 'block';
        }
    }

    if (mediumContentArea) {
        mediumContentArea.style.display = 'block'; // Ensure main container visible
    }

    // Update Instruction Editor Label
    const instructionLabel = document.querySelector('.instruction-label');
    if (instructionLabel) {
        const mediumName = newMedium.charAt(0).toUpperCase() + newMedium.slice(1);
        instructionLabel.textContent = `Instructions for ${mediumName}:`;
    }

    // Clear previous generated output for 'post' mode
    if (newMedium === 'post' && generatedContentOutput) {
         generatedContentOutput.innerHTML = '';
         showStatus(generationStatusDiv, '', 'info'); // Clear generation status
    }
}

/**
 * Handles saving the system prompt via API call.
 */
async function handleSaveSystemPrompt(): Promise<void> {
    if (!state.currentUserId || !systemPromptEditor || !saveSystemPromptButton || !systemPromptStatusDiv) return;

    const userId = state.currentUserId;
    const promptText = systemPromptEditor.value;
    const type = currentMedium;

    saveSystemPromptButton.disabled = true;
    showStatus(systemPromptStatusDiv, `Saving ${type} system prompt...`, 'loading');

    try {
        const response = await fetch(`/api/prompts/${userId}/system-prompts/${type}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to save system prompt (${response.status})`);
        }
        const savedPrompt: SystemPrompt = await response.json();
        
        // Update custom status attribute and disable reset button if needed
        systemPromptEditor.setAttribute('data-is-custom', savedPrompt.is_custom.toString());
        if (resetPromptButton) {
            resetPromptButton.disabled = !savedPrompt.is_custom;
        }

        showStatus(systemPromptStatusDiv, `${type.charAt(0).toUpperCase() + type.slice(1)} system prompt saved successfully.`, 'success', 3000);
    } catch (error: any) {
        console.error("Error saving system prompt:", error);
        showStatus(systemPromptStatusDiv, `Error saving: ${error.message}`, 'error');
    } finally {
        saveSystemPromptButton.disabled = false;
    }
}

/**
 * Handles resetting the system prompt via API call.
 */
async function handleResetSystemPrompt(): Promise<void> {
    if (!state.currentUserId || !resetPromptButton || !systemPromptEditor || !systemPromptStatusDiv) return;
    
    const userId = state.currentUserId;
    const type = currentMedium;

    if (!confirm(`Are you sure you want to reset the ${type} system prompt to the current character card?`)) {
        return;
    }

    resetPromptButton.disabled = true;
    showStatus(systemPromptStatusDiv, `Resetting ${type} system prompt...`, 'loading');

    try {
        const response = await fetch(`/api/prompts/${userId}/system-prompts/${type}/reset`, {
            method: 'POST' // Using POST for actions with side effects
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to reset system prompt (${response.status})`);
        }
        const resetPrompt: SystemPrompt = await response.json();

        // Update editor and custom status
        systemPromptEditor.value = resetPrompt.prompt_text;
        systemPromptEditor.setAttribute('data-is-custom', resetPrompt.is_custom.toString());
        // Reset button should now be disabled as is_custom is 0
        resetPromptButton.disabled = true; 

        showStatus(systemPromptStatusDiv, `${type.charAt(0).toUpperCase() + type.slice(1)} system prompt reset successfully.`, 'success', 3000);
    } catch (error: any) {
        console.error("Error resetting system prompt:", error);
        showStatus(systemPromptStatusDiv, `Error resetting: ${error.message}`, 'error');
        // Re-enable button on error if appropriate (depends if state is known)
        // resetPromptButton.disabled = false; 
    } 
}

/**
 * Handles saving the instructions via API call.
 */
async function handleSaveInstructions(): Promise<void> {
     if (!state.currentUserId || !instructionEditor || !saveInstructionsButton || !instructionStatusDiv) return;

    const userId = state.currentUserId;
    const instructionText = instructionEditor.value;
    const type = currentMedium;
    
    // Get values from the main goal and examples fields
    const mainGoal = mainGoalInput?.value.trim() || "";
    let examples: string[] = [];
    if (examplesInput?.value.trim()) {
        examples = examplesInput.value.trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line); // Remove empty lines
    }

    saveInstructionsButton.disabled = true;
    showStatus(instructionStatusDiv, `Saving ${type} instructions...`, 'loading');

    try {
        const response = await fetch(`/api/prompts/${userId}/instruction-templates/${type}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                instructionText,
                mainGoal,
                examples
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to save instructions (${response.status})`);
        }
        await response.json(); // Consume response body

        showStatus(instructionStatusDiv, `${type.charAt(0).toUpperCase() + type.slice(1)} instructions saved successfully.`, 'success', 3000);
    } catch (error: any) {
        console.error("Error saving instructions:", error);
        showStatus(instructionStatusDiv, `Error saving: ${error.message}`, 'error');
    } finally {
        saveInstructionsButton.disabled = false;
    }
}

/**
 * Set the visual active state for the medium tabs.
 * @param medium - The medium to set as active.
 */
function setActiveTab(medium: ContentMediumType): void {
    mediumTabsContainer?.querySelectorAll('.medium-tab').forEach(tab => {
        if (tab.getAttribute('data-medium') === medium) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Interface for data returned by getCombinedPromptForAPI
interface CombinedPrompt {
    systemPrompt: string;
    instructions: string;
    mainGoal?: string;
    examples?: string[];
}

/**
 * Get the combined prompt for the API request
 * @returns Object with system prompt, instructions, main goal and examples
 */
export function getCombinedPromptForAPI(): CombinedPrompt | null {
    if (!systemPromptEditor || !instructionEditor) {
        console.error("Cannot get prompt data, editors not found");
        return null;
    }

    // Extract main prompt sections
    const systemPrompt = systemPromptEditor.value.trim();
    const instructions = instructionEditor.value.trim();
    
    // Use the dedicated main goal input field if available, otherwise use structured parsing from instructions
    let mainGoal = mainGoalInput?.value.trim() || "";
    
    // Get examples from the dedicated examples input field if available
    let examples: string[] = [];
    if (examplesInput?.value.trim()) {
        examples = examplesInput.value.trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line); // Remove empty lines
    }
    
    // Fall back to structured parsing from instructions if no separate fields are populated
    if (!mainGoal && !examples.length) {
        // Try to extract main goal if the instructions contain a section marker
        if (instructions.includes("## Main Goal:")) {
            const mainGoalMatch = instructions.match(/## Main Goal:(.*?)(?:##|$)/s);
            if (mainGoalMatch && mainGoalMatch[1]) {
                mainGoal = mainGoalMatch[1].trim();
            }
        }
        
        // Try to extract examples if the instructions contain an examples section
        if (instructions.includes("## Examples:")) {
            const examplesMatch = instructions.match(/## Examples:(.*?)(?:##|$)/s);
            if (examplesMatch && examplesMatch[1]) {
                // Split by newlines and remove empty lines
                examples = examplesMatch[1].split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('##'));
            }
        }
    }
    
    if (!systemPrompt || !instructions) {
        console.error("System prompt or instructions are empty");
        return null;
    }

    return {
        systemPrompt,
        instructions,
        mainGoal: mainGoal || undefined,
        examples: examples.length > 0 ? examples : undefined
    };
}


// --- Content Generation (Updated to use new fields) ---

async function generateContent(): Promise<void> {
    // Ensure all necessary elements exist
    if (!generateContentButton || !generationStatusDiv || !generatedContentOutput || !mainGoalInput) {
        console.error("GenerateContent: Missing required UI elements.");
        // Attempt to show status even if some elements are missing
        if (generationStatusDiv) {
            showStatus(generationStatusDiv, 'UI Error: Missing required elements.', 'error');
        }
        return;
    }
    
    if (!state.currentUserId) {
        showStatus(generationStatusDiv, 'Please select a user first', 'error');
        return;
    }
    
    generateContentButton.disabled = true;
    showStatus(generationStatusDiv, 'Saving goal & generating content...', 'loading');
    
    // --- 1. Save the current Main Goal --- 
    const userId = state.currentUserId;
    const mainGoalText = mainGoalInput.value.trim();
    const type = currentMedium;

    try {
        console.log("Attempting to save main goal before generation...");
        const saveResponse = await fetch(`/api/prompts/${userId}/instruction-templates/${type}/main-goal`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mainGoal: mainGoalText }) // Use the current input value
        });

        if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: `HTTP error ${saveResponse.status}` }));
            throw new Error(`Failed to save main goal: ${errorData.error || saveResponse.statusText}`);
        }
        await saveResponse.json(); // Consume response body
        console.log("Main goal saved successfully before generation.");
        // Optionally show a temporary success message for the save action
        // showStatus(generationStatusDiv, 'Main goal saved. Generating content...', 'loading'); 

    } catch (error: any) {
        console.error("Error saving main goal before generation:", error);
        showStatus(generationStatusDiv, `Error saving main goal: ${error.message}`, 'error');
        generateContentButton.disabled = false; // Re-enable button on save error
        return; // Stop if saving failed
    }
    
    // --- 2. Proceed with Content Generation --- 
    
    // Get the current state of the prompt editors
    const combinedPrompt = {
        systemPrompt: systemPromptEditor?.value || '',
        instructions: instructionEditor?.value || '',
        mainGoal: mainGoalText, // Use the text we just tried to save
        examples: examplesInput?.value.split('\n').filter(line => line.trim() !== '') || []
    };
    
    try {
        // Log using the current medium rather than platform
        console.log(`Generating content for type: ${currentMedium}`);
        console.log("System Prompt Used:", combinedPrompt.systemPrompt);
        console.log("Instruction Used:", combinedPrompt.instructions);
        console.log("Main Goal Used:", combinedPrompt.mainGoal); // Changed log label
        console.log("Examples:", combinedPrompt.examples);

        // ** FIX: Validate Main Goal **
        if (!combinedPrompt.mainGoal) {
            showStatus(generationStatusDiv, 'Error: Main Goal cannot be empty to generate content.', 'error'); // Updated error message
            generateContentButton.disabled = false; // Re-enable button
            return; // Stop execution
        }
        
        // Extract all components for the API call
        const systemPrompt = combinedPrompt.systemPrompt;
        const instructions = combinedPrompt.instructions;
        const mainGoal = combinedPrompt.mainGoal; // Use the validated mainGoal
        const examples = combinedPrompt.examples || [];
        
        // *** DEBUG LOGGING START ***
        const requestBody = {
            systemPrompt,
            instructions,
            examples,
            mainGoal,
            contentType: currentMedium, // Use currentMedium ("post") as the contentType
            stream: false
        };
        console.log("Sending request body:", JSON.stringify(requestBody, null, 2));
        // *** DEBUG LOGGING END ***
        
        const response = await fetch(`/api/chat/${state.currentUserId}/generate-content`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody) // Use the logged variable
        });
        
        if (!response.ok) {
            let errorMsg = `Error generating content (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                errorMsg = `${errorMsg}: ${await response.text()}`;
            }
            throw new Error(errorMsg);
        }
        
        const result = await response.json();
        
        // Display the generated content using the new structure and class
        generatedContentOutput.innerHTML = `
            <h4>Generated ${currentMedium.charAt(0).toUpperCase() + currentMedium.slice(1)} Content</h4>
            <div class="generated-post">
                ${result.content} 
            </div>
            <div class="content-actions">
                <button class="copy-button">Copy</button>
            </div>
        `;
        
        // Add copy button functionality
        const copyButton = generatedContentOutput.querySelector('.copy-button');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const contentText = result.content;
                navigator.clipboard.writeText(contentText)
                    .then(() => {
                        copyButton.textContent = 'Copied!';
                        setTimeout(() => {
                            copyButton.textContent = 'Copy';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy:', err);
                        copyButton.textContent = 'Copy Failed';
                        setTimeout(() => {
                            copyButton.textContent = 'Copy';
                        }, 2000);
                    });
            });
        }
        
        // Show success message
        showStatus(generationStatusDiv, 'Content generated successfully', 'success', 3000);
        
    } catch (error) {
        console.error('Error generating content:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(generationStatusDiv, `Error generating content: ${message}`, 'error'); // Added context to error
    } finally {
        generateContentButton.disabled = false;
    }
}

// Remove resetMediumInstructions - backend handles defaults
// Remove loadBaseCharacterCard

// Re-add the helper function for default instructions
function getDefaultInstructionText(type: 'chat' | 'post'): string {
    if (type === 'chat') {
        return "Engage in a helpful and informative conversation.";
    }
    return "Generate content for a specific platform (e.g., Twitter, LinkedIn, Blog). Specify platform requirements in your instructions, such as 'Create a tweet under 280 characters' or 'Write a professional LinkedIn post'.";
}

/**
 * Handles saving the main goal via API call.
 */
async function handleSaveMainGoal(): Promise<void> {
    console.log("handleSaveMainGoal called");
    if (!state.currentUserId || !mainGoalInput || !saveMainGoalButton || !mainGoalStatusDiv) {
        console.error("Missing required elements for saving main goal:", {
            userId: !!state.currentUserId,
            mainGoalInput: !!mainGoalInput,
            saveMainGoalButton: !!saveMainGoalButton,
            mainGoalStatusDiv: !!mainGoalStatusDiv
        });
        return;
    }

    const userId = state.currentUserId;
    const mainGoal = mainGoalInput.value.trim();
    const type = currentMedium;
    
    console.log("Saving main goal:", mainGoal, "for user:", userId, "type:", type);
    
    saveMainGoalButton.disabled = true;
    showStatus(mainGoalStatusDiv, `Saving ${type} main goal...`, 'loading');

    try {
        console.log("Sending main goal save request to:", `/api/prompts/${userId}/instruction-templates/${type}/main-goal`);
        const response = await fetch(`/api/prompts/${userId}/instruction-templates/${type}/main-goal`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mainGoal })
        });
        
        console.log("Save main goal response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to save main goal (${response.status})`);
        }
        await response.json(); // Consume response body

        console.log("Main goal saved successfully");
        showStatus(mainGoalStatusDiv, `${type.charAt(0).toUpperCase() + type.slice(1)} main goal saved successfully.`, 'success', 3000);
    } catch (error: any) {
        console.error("Error saving main goal:", error);
        showStatus(mainGoalStatusDiv, `Error saving: ${error.message}`, 'error');
    } finally {
        saveMainGoalButton.disabled = false;
    }
}

/**
 * Handles saving the examples via API call.
 */
async function handleSaveExamples(): Promise<void> {
    console.log("handleSaveExamples called");
    if (!state.currentUserId || !examplesInput || !saveExamplesButton || !examplesStatusDiv) {
        console.error("Missing required elements for saving examples:", {
            userId: !!state.currentUserId,
            examplesInput: !!examplesInput,
            saveExamplesButton: !!saveExamplesButton,
            examplesStatusDiv: !!examplesStatusDiv
        });
        return;
    }

    const userId = state.currentUserId;
    const type = currentMedium;
    
    // Get the raw text content from the textarea
    const examplesString = examplesInput.value.trim(); // Keep as a single string
    
    // Optional: Basic validation if it should be JSON-like (optional)
    // if (examplesString && (!examplesString.startsWith('[') || !examplesString.endsWith(']'))) {
    //     showStatus(examplesStatusDiv, 'Warning: Examples do not look like a JSON array.', 'warning', 3000);
    // }
    
    console.log("Saving examples string:", examplesString, "for user:", userId, "type:", type);
    
    saveExamplesButton.disabled = true;
    showStatus(examplesStatusDiv, `Saving ${type} examples...`, 'loading');

    try {
        console.log("Sending examples save request to:", `/api/prompts/${userId}/instruction-templates/${type}/examples`);
        const response = await fetch(`/api/prompts/${userId}/instruction-templates/${type}/examples`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examples: examplesString }) // Send the raw string
        });
        
        console.log("Save examples response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
            throw new Error(errorData.error || `Failed to save examples (${response.status})`);
        }
        await response.json(); // Consume response body

        console.log("Examples saved successfully");
        showStatus(examplesStatusDiv, `${type.charAt(0).toUpperCase() + type.slice(1)} examples saved successfully.`, 'success', 3000);
    } catch (error: any) {
        console.error("Error saving examples:", error);
        showStatus(examplesStatusDiv, `Error saving: ${error.message}`, 'error');
    } finally {
        saveExamplesButton.disabled = false;
    }
}

// (Add any other helper functions needed) 