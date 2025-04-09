/**
 * assessmentModule.ts - Handles personality assessment functionality
 */
import { state, showStatus } from './utils.js';
import { 
    UserData, 
    TipiQuestionData, 
    AssessmentResult, 
    AlignmentResult,
    BasePromptText,
    PromptVariation
} from '../types';
// import Chart from 'chart.js/auto'; // Use Chart type from global scope for now

// Define interfaces/types
// --- REMOVED INTERFACES (moved to types.ts) ---
// interface TipiQuestionData { ... }
// interface AssessmentResult { ... }
// interface AlignmentScores { ... }
// interface AlignmentResult { ... }
// interface UserData { ... }

// Extend AppState (ideally imported)
// --- REMOVED MODULE AUGMENTATION --- 
// Module augmentation now uses the imported AppState
// declare module '../types.js' { // Augment the imported type declaration
//     interface AppState {
//         // User assessment scores might be stored directly on state or within currentUserData
//         userTipiScores?: { [key: string]: number } | null; 
//         aiTipiScores?: { [key: string]: number } | null;
//     }
// }

// Define a type for the elements passed to this module
interface AssessmentModuleElements {
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
    runsPerItemInput: HTMLInputElement | null; // Note: Seems unused in latest runAIAssessment
    itemAgreementSpan: HTMLSpanElement | null;
    aiAssessmentTempInput: HTMLInputElement | null;
    assessmentSystemPromptEditor: HTMLTextAreaElement | null;
    saveAssessmentPromptVariationButton: HTMLButtonElement | null;
    resetAssessmentPromptButton: HTMLButtonElement | null;
}

// UI Elements cache - typed
let startUserAssessmentButton: HTMLButtonElement | null = null;
let retakeUserAssessmentButton: HTMLButtonElement | null = null;
let assessmentModal: HTMLDivElement | null = null;
let tipiModalForm: HTMLFormElement | null = null;
let assessmentModalStatusDiv: HTMLDivElement | null = null;
let userAssessmentStatusSummary: HTMLDivElement | null = null;
let runAIAssessmentButton: HTMLButtonElement | null = null;
let aiAssessmentStatusDiv: HTMLDivElement | null = null;
let assessmentResultsArea: HTMLDivElement | null = null;
let overallAlignmentSpan: HTMLSpanElement | null = null;
let dimensionAlignmentList: HTMLUListElement | null = null;
let radarChartCanvas: HTMLCanvasElement | null = null;
let itemAgreementSpan: HTMLSpanElement | null = null;
let aiAssessmentTempInput: HTMLInputElement | null = null;
let assessmentSystemPromptEditor: HTMLTextAreaElement | null = null;
let saveAssessmentPromptVariationButton: HTMLButtonElement | null = null;
let resetAssessmentPromptButton: HTMLButtonElement | null = null;

// Chart instance for redrawing - Use Chart.js global type
// Make sure Chart.js is loaded globally in index.html
declare var Chart: any; // Use any for now, install @types/chart.js later if needed
let radarChart: any | null = null; // Use any for Chart instance type

// Store the currently loaded prompt source for assessment
let currentAssessmentPromptSource: 'base' | 'variation' | 'none' = 'none';

/**
 * Initialize the assessment module
 * @param elements - UI elements for assessment functionality
 */
export function initAssessmentModule(elements: AssessmentModuleElements): void {
    // Assign elements
    startUserAssessmentButton = elements.startUserAssessmentButton;
    retakeUserAssessmentButton = elements.retakeUserAssessmentButton;
    assessmentModal = elements.assessmentModal;
    tipiModalForm = elements.tipiModalForm;
    assessmentModalStatusDiv = elements.assessmentModalStatusDiv;
    userAssessmentStatusSummary = elements.userAssessmentStatusSummary;
    runAIAssessmentButton = elements.runAIAssessmentButton;
    aiAssessmentStatusDiv = elements.aiAssessmentStatusDiv;
    assessmentResultsArea = elements.assessmentResultsArea;
    overallAlignmentSpan = elements.overallAlignmentSpan;
    dimensionAlignmentList = elements.dimensionAlignmentList;
    radarChartCanvas = elements.radarChartCanvas;
    itemAgreementSpan = elements.itemAgreementSpan;
    aiAssessmentTempInput = elements.aiAssessmentTempInput;
    assessmentSystemPromptEditor = elements.assessmentSystemPromptEditor;
    saveAssessmentPromptVariationButton = elements.saveAssessmentPromptVariationButton;
    resetAssessmentPromptButton = elements.resetAssessmentPromptButton;

    // Set up event listeners with null checks
    startUserAssessmentButton?.addEventListener('click', openAssessmentModal);
    retakeUserAssessmentButton?.addEventListener('click', confirmAndOpenAssessmentModal);
    tipiModalForm?.addEventListener('submit', handleUserAssessmentSubmit);
    runAIAssessmentButton?.addEventListener('click', runAIAssessment);
    saveAssessmentPromptVariationButton?.addEventListener('click', saveAssessmentPromptVariation);
    resetAssessmentPromptButton?.addEventListener('click', () => resetAssessmentPrompt());

    // Modal interaction listeners
    const closeModalButton = document.getElementById('close-assessment-modal') as HTMLSpanElement | null;
    const cancelButton = document.getElementById('cancel-assessment-button') as HTMLButtonElement | null;
    closeModalButton?.addEventListener('click', closeAssessmentModal);
    cancelButton?.addEventListener('click', closeAssessmentModal);
    assessmentModal?.addEventListener('click', handleModalBackgroundClick);

    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', handleUserDataUpdate);
    document.addEventListener('base-prompt-generated', handleUserDataUpdate);
    document.addEventListener('library-cleared', handleLibraryCleared);

    console.log('Assessment module initialized');
}

/**
 * Open the assessment modal
 */
export function openAssessmentModal(): void {
    if (!assessmentModal || !state.currentUserId) {
        console.error('Cannot open assessment modal: Element or user missing.');
        // Optionally show error to user
        showStatus(userAssessmentStatusSummary, 'Cannot open assessment. Please ensure you are logged in.', 'error');
        return;
    }
    console.log('Opening assessment modal');
    loadTipiQuestions(); // Load questions into the modal
    assessmentModal.style.display = 'block';
}

/**
 * Close the assessment modal
 */
export function closeAssessmentModal(): void {
    if (!assessmentModal) return;
    console.log('Closing assessment modal');
    assessmentModal.style.display = 'none';
    // Clear status message inside modal when closing
    showStatus(assessmentModalStatusDiv, '', 'info'); 
}

/**
 * Load TIPI questions into the modal
 */
async function loadTipiQuestions(): Promise<void> {
    const questionsContainer = document.getElementById('tipi-modal-questions') as HTMLDivElement | null;
    if (!questionsContainer) {
        console.error('TIPI questions container not found');
        showStatus(assessmentModalStatusDiv, 'Error: Assessment UI missing.', 'error');
        return;
    }

    try {
        // Fetch the questions from the backend
        const response = await fetch('/api/assessment/tipi-questions');
        if (!response.ok) {
            throw new Error(`Failed to load TIPI questions: ${response.statusText}`);
        }
        
        const questions: TipiQuestionData[] = await response.json();
        console.log('Loaded TIPI questions from backend:', questions);
        
        questionsContainer.innerHTML = ''; // Clear previous questions

        questions.forEach(question => {
            const questionItem = document.createElement('div');
            questionItem.className = 'tipi-question';
            questionItem.setAttribute('data-dimension', question.dimension);
            questionItem.setAttribute('data-direction', question.direction);

            // Improved HTML structure for better styling and accessibility
            const questionHTML = `
              <p class="tipi-question-text">${question.id.slice(1)}. ${question.text}</p>
              <div class="tipi-options">
                <div class="tipi-scale-labels">
                  <span>Strongly Disagree</span>
                  <span>Neutral</span>
                  <span>Strongly Agree</span>
                </div>
                <div class="tipi-radio-group">
                  ${[1, 2, 3, 4, 5, 6, 7].map(val => `
                    <div class="tipi-radio-option">
                      <input type="radio" name="${question.id}" id="${question.id}_${val}" value="${val}" required>
                      <label for="${question.id}_${val}">${val}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
            questionItem.innerHTML = questionHTML;
            questionsContainer.appendChild(questionItem);
        });

        // Add this style tag to the document head
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .tipi-questions-container {
                max-height: 70vh;
                overflow-y: auto;
                padding-right: 10px;
            }
            .tipi-question {
                margin-bottom: 25px;
                border-bottom: 1px solid #eee;
                padding-bottom: 20px;
            }
            .tipi-question-text {
                font-weight: 500;
                margin-bottom: 10px;
            }
            .tipi-options {
                display: flex;
                flex-direction: column;
            }
            .tipi-scale-labels {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 12px;
                color: #666;
            }
            .tipi-radio-group {
                display: flex;
                justify-content: space-between;
            }
            .tipi-radio-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .tipi-radio-option label {
                margin-top: 3px;
                font-size: 12px;
            }
        `;
        document.head.appendChild(styleTag);

        // Restore previous values if available in state
        if (state.userTipiScores) {
            restoreUserAssessmentFormState();
        }
        showStatus(assessmentModalStatusDiv, 'Please answer all 10 questions.', 'info');
    } catch (error) {
        console.error('Error loading TIPI questions:', error);
        questionsContainer.innerHTML = '<p class="error">Error loading questions. Please try again.</p>';
        showStatus(assessmentModalStatusDiv, 'Error loading questions. Please try again.', 'error');
    }
}

/**
 * Restore the user's previous assessment answers to the form
 */
function restoreUserAssessmentFormState(): void {
    if (!tipiModalForm || !state.userTipiScores) return;

    // Make sure we have an object of scores, not a string
    let scores: Record<string, number>;
    
    if (typeof state.userTipiScores === 'string') {
        try {
            // Try to parse if it's a JSON string
            scores = JSON.parse(state.userTipiScores);
        } catch (error) {
            console.error('Failed to parse userTipiScores string:', error);
            return;
        }
    } else {
        // Already an object
        scores = state.userTipiScores;
    }

    const currentForm = tipiModalForm;

    // Only iterate through pairs of question IDs and scores
    Object.entries(scores).forEach(([questionId, score]) => {
        // Only handle entries that look like question IDs (q1, q2, etc.)
        if (questionId.startsWith('q') && typeof score === 'number') {
            const input = currentForm.querySelector(`input[name="${questionId}"][value="${score}"]`) as HTMLInputElement | null;
            if (input) {
                input.checked = true;
            }
        } else {
            console.warn(`Invalid score type for ${questionId}:`, score);
        }
    });
}

/**
 * Handle user assessment submission
 * @param event - The form submission event
 */
export async function handleUserAssessmentSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (!state.currentUserId || !tipiModalForm) {
        showStatus(assessmentModalStatusDiv, 'Cannot submit: User or form not found.', 'error');
        return;
    }
    const currentUserId = state.currentUserId;

    const formData = new FormData(tipiModalForm);
    const scores: { [key: string]: number } = {};
    const expectedQuestionCount = 10; // TIPI has 10 questions
    let answeredCount = 0;

    for (const [name, value] of formData.entries()) {
        if (name.startsWith('q') && !isNaN(parseInt(value as string, 10))) {
            scores[name] = parseInt(value as string, 10);
            answeredCount++;
        }
    }

    if (answeredCount < expectedQuestionCount) {
        showStatus(assessmentModalStatusDiv, `Please answer all ${expectedQuestionCount} questions.`, 'error');
        return;
    }

    console.log('User assessment scores:', scores);
    showStatus(assessmentModalStatusDiv, 'Saving assessment...', 'loading');

    try {
        // First try the legacy endpoint
        let response = await fetch(`/api/users/${currentUserId}/assessment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userTipiScores: scores })
        });

        // If that fails with a 404, try the new endpoint
        if (response.status === 404) {
            console.log('Legacy endpoint not found, trying new assessment endpoint...');
            response = await fetch(`/api/assessment/${currentUserId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: scores })
            });
        }

        if (!response.ok) {
            let errorMsg = `Failed to save assessment (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch { /* Ignore */ }
            throw new Error(errorMsg);
        }

        // First try to get the response data
        let responseData;
        try {
            responseData = await response.json();
        } catch (error) {
            console.warn('Could not parse assessment response JSON, continuing with saved scores');
        }

        // Always update state with the actual scores object (not a string)
        state.userTipiScores = scores;
        
        // Also update within currentUserData if it exists
        if (state.currentUserData?.assessment) {
             state.currentUserData.assessment.userTipiScores = scores;
        } else if (state.currentUserData) {
             state.currentUserData.assessment = { userTipiScores: scores };
        }

        closeAssessmentModal();
        updateAssessmentUI(); // Update main page UI
        showStatus(userAssessmentStatusSummary, 'Assessment completed successfully!', 'success', 3000);

        // Dispatch event
        const customEvent = new CustomEvent('assessment-completed', {
            detail: { userId: currentUserId, scores }
        });
        document.dispatchEvent(customEvent);

    } catch (error) {
        console.error('Error saving assessment:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(assessmentModalStatusDiv, `Error saving assessment: ${message}`, 'error');
    }
}

/**
 * Update the assessment system prompt editor with the relevant prompt (variation or base).
 */
function updateAssessmentSystemPrompt(): void {
    if (!assessmentSystemPromptEditor) return;

    let promptContent: BasePromptText | null = null;
    let promptSourceInfo = 'none';
    currentAssessmentPromptSource = 'none'; // Reset source indicator

    const assessmentVariation = state.currentUserData?.promptVariations?.assessment;
    const basePrompt = state.currentUserData?.basePrompt;

    if (assessmentVariation?.system_prompt_override) {
        promptContent = assessmentVariation.system_prompt_override;
        promptSourceInfo = `Assessment Variation (Saved: ${new Date(assessmentVariation.updated_at).toLocaleDateString()})`;
        currentAssessmentPromptSource = 'variation';
    } else if (basePrompt?.promptText) {
        promptContent = basePrompt.promptText;
        promptSourceInfo = `Base Prompt (Generated: ${new Date(basePrompt.updatedAt).toLocaleDateString()})`;
        currentAssessmentPromptSource = 'base';
    } else {
        promptContent = '// No base prompt available. Generate one first.';
        promptSourceInfo = 'none';
    }

    assessmentSystemPromptEditor.value = promptContent || '';
    console.log(`Assessment system prompt loaded from: ${promptSourceInfo}`);
    showStatus(aiAssessmentStatusDiv, `Using Prompt: ${promptSourceInfo}`, 'info', 4000);
    updateAssessmentPromptButtons();
}

/**
 * Update the enable/disable state and tooltip of prompt editing buttons.
 */
function updateAssessmentPromptButtons(): void {
     if (saveAssessmentPromptVariationButton) {
         saveAssessmentPromptVariationButton.disabled = currentAssessmentPromptSource === 'none';
         saveAssessmentPromptVariationButton.title = currentAssessmentPromptSource === 'none' ? "Cannot save variation without a base prompt" : "Save current text as assessment-specific prompt variation";
     }
     if (resetAssessmentPromptButton) {
         resetAssessmentPromptButton.disabled = currentAssessmentPromptSource !== 'variation';
         resetAssessmentPromptButton.title = currentAssessmentPromptSource === 'variation' ? "Reset assessment prompt to the base prompt (deletes variation)" : "Assessment is already using the base prompt";
     }
}

/**
 * Saves the current content of the assessment prompt editor as the 'assessment' variation.
 */
async function saveAssessmentPromptVariation(): Promise<void> {
    if (!assessmentSystemPromptEditor || !state.currentUserId || !state.currentUserData?.basePrompt) {
         showStatus(aiAssessmentStatusDiv, 'Cannot save variation: User or base prompt missing.', 'error');
         return;
    }
    const currentUserId = state.currentUserId;
    const promptOverrideText = assessmentSystemPromptEditor.value.trim();

    if (!promptOverrideText) {
         showStatus(aiAssessmentStatusDiv, 'Cannot save an empty prompt variation.', 'info');
         return;
    }

    try {
        showStatus(aiAssessmentStatusDiv, 'Saving assessment prompt variation...', 'loading');

        const response = await fetch(`/api/prompts/${currentUserId}/variations/assessment`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPromptOverride: promptOverrideText })
        });

        if (!response.ok) {
             const errorMsg = await getErrorMessage(response, 'Failed to save variation');
            throw new Error(errorMsg);
        }
        
        await fetchAndUpdateUserData(currentUserId);
        updateAssessmentSystemPrompt(); 
        showStatus(aiAssessmentStatusDiv, 'Assessment variation saved.', 'success', 3000);

    } catch (error) {
        console.error('Error saving assessment prompt variation:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        showStatus(aiAssessmentStatusDiv, `Error saving variation: ${message}`, 'error');
    }
}

/**
 * Resets the assessment prompt editor to the base prompt, deleting the 'assessment' variation.
 */
async function resetAssessmentPrompt(confirmReset = true): Promise<void> {
    if (!assessmentSystemPromptEditor || !state.currentUserId || !state.currentUserData?.basePrompt) {
        showStatus(aiAssessmentStatusDiv, 'Cannot reset: User or base prompt missing.', 'error');
        return;
    }
    const currentUserId = state.currentUserId;

    if (currentAssessmentPromptSource !== 'variation') {
         showStatus(aiAssessmentStatusDiv, 'Already using the base prompt.', 'info');
         return;
    }
    if (confirmReset && !confirm('Reset assessment prompt to the base prompt? This deletes saved changes.')) {
        return;
    }

    try {
        showStatus(aiAssessmentStatusDiv, 'Resetting prompt to base...', 'loading');
        const response = await fetch(`/api/prompts/${currentUserId}/variations/assessment`, {
            method: 'DELETE',
        });
        if (!response.ok) { 
            const errorMsg = await getErrorMessage(response, 'Failed to delete variation');
            throw new Error(errorMsg);
        }
        await fetchAndUpdateUserData(currentUserId);
        updateAssessmentSystemPrompt(); 
        showStatus(aiAssessmentStatusDiv, 'Prompt reset to base.', 'success', 3000);
    } catch (error) {
        console.error('Error resetting assessment prompt:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        showStatus(aiAssessmentStatusDiv, `Error resetting prompt: ${message}`, 'error');
    }
}

/**
 * Update the state of the Run AI Assessment button based on user score availability and prompt state.
 */
function updateRunAIAssessmentButtonState(): void {
    if (!runAIAssessmentButton) return;
    const hasUserScores = !!state.userTipiScores; // Assuming userTipiScores are correctly loaded into state
    // Check if *any* assessment prompt (base or variation) is loaded and ready
    const promptLoaded = currentAssessmentPromptSource !== 'none'; 
    const canRunAssessment = hasUserScores && promptLoaded;
    
    runAIAssessmentButton.disabled = !canRunAssessment;
    runAIAssessmentButton.title = canRunAssessment 
        ? 'Run AI simulation using the current assessment prompt' 
        : 'Complete user assessment and ensure a base prompt exists first';
        
    // Update status message if needed (optional, can conflict with other messages)
    // if (!canRunAssessment && aiAssessmentStatusDiv) {
    //     if (!hasUserScores) showStatus(aiAssessmentStatusDiv, 'Complete user assessment first.', 'info');
    //     else if (!promptLoaded) showStatus(aiAssessmentStatusDiv, 'Load or generate a base prompt first.', 'info');
    // }
}

/**
 * Run the AI assessment simulation using the current assessment prompt.
 */
async function runAIAssessment(): Promise<void> {
    if (!state.currentUserId || !state.userTipiScores || !assessmentSystemPromptEditor) {
        showStatus(aiAssessmentStatusDiv, 'User assessment or prompt missing.', 'error');
        return;
    }
    const currentUserId = state.currentUserId;
    const systemPrompt = assessmentSystemPromptEditor.value; // Use current editor content
    const temperature = aiAssessmentTempInput ? parseFloat(aiAssessmentTempInput.value) : 0.8;
    
    if (!systemPrompt || systemPrompt.startsWith('// No')) {
         showStatus(aiAssessmentStatusDiv, 'Cannot run simulation without a valid prompt.', 'error');
         return;
    }
    if (isNaN(temperature) || temperature < 0 || temperature > 2.0) {
         showStatus(aiAssessmentStatusDiv, 'Invalid temperature (must be 0-2.0)', 'error');
         return;
    }

    try {
        showStatus(aiAssessmentStatusDiv, `Running AI assessment simulation...`, 'loading');
        if (runAIAssessmentButton) runAIAssessmentButton.disabled = true;

        // Call simulation endpoint, now sending the prompt text
        const simulateResponse = await fetch(`/api/assessment/${currentUserId}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                systemPrompt, // Send the actual prompt text
                temperature 
                // Backend will determine if it matches base or a variation if needed
            })
        });
        
        if (!simulateResponse.ok) {
            const errorMsg = await getErrorMessage(simulateResponse, 'AI simulation failed');
            throw new Error(errorMsg);
        }
        
        const simulationResult = await simulateResponse.json();
        console.log('AI Simulation Result:', simulationResult);
        showStatus(aiAssessmentStatusDiv, 'Simulation complete. Calculating alignment...', 'loading');

        // Calculate Alignment (no change needed here, backend uses latest results)
        const alignmentResponse = await fetch(`/api/assessment/${currentUserId}/calculate-alignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessmentType: 'TIPI' }) 
        });
        if (!alignmentResponse.ok) {
             const errorMsg = await getErrorMessage(alignmentResponse, 'Alignment calculation failed');
            throw new Error(errorMsg);
        }
        const alignmentResult: AlignmentResult = await alignmentResponse.json();
        console.log('Alignment Calculation Result:', alignmentResult);

        // Display Results
        displayAssessmentResults(alignmentResult); 
        showStatus(aiAssessmentStatusDiv, 'AI assessment & alignment complete.', 'success', 3000);

    } catch (error) {
        console.error('Error running AI assessment pipeline:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        showStatus(aiAssessmentStatusDiv, `Error: ${message}`, 'error');
    } finally {
         if (runAIAssessmentButton) runAIAssessmentButton.disabled = false;
         updateRunAIAssessmentButtonState(); 
    }
}

/**
 * Display assessment alignment results in the UI.
 * @param results - The alignment result object from the backend.
 */
function displayAssessmentResults(results: AlignmentResult): void {
    if (!assessmentResultsArea || !overallAlignmentSpan || !dimensionAlignmentList || !radarChartCanvas || !itemAgreementSpan) {
         console.error('Cannot display results: Missing UI elements.');
         return;
    }

    assessmentResultsArea.style.display = 'block';
    const alignmentScores = results.alignment_scores;

    if (!alignmentScores) {
        console.error('Alignment scores missing in results:', results);
        overallAlignmentSpan.textContent = 'Error';
        itemAgreementSpan.textContent = 'Error';
        dimensionAlignmentList.innerHTML = '<li>Error loading alignment scores</li>';
        if (radarChart) { radarChart.destroy(); radarChart = null; }
        return;
    }

    // Display scores
    overallAlignmentSpan.textContent = alignmentScores.traitCorrelation !== null
        ? `${Math.round(alignmentScores.traitCorrelation * 100)}% (Trait Correlation)`
        : `N/A`;
    itemAgreementSpan.textContent = `${Math.round(alignmentScores.itemAgreement * 100)}%`;

    // Fetch detailed scores for chart and list
    fetchComparisonDataAndDrawChart(results.user_result_id, results.ai_result_id);
}

/**
 * Fetches the specific user and AI assessment results by ID and draws the radar chart.
 * @param userResultId - ID of the user's assessment result record.
 * @param aiResultId - ID of the AI's assessment result record.
 */
async function fetchComparisonDataAndDrawChart(userResultId: string, aiResultId: string): Promise<void> {
    if (!userResultId || !aiResultId) {
        console.error('Missing result IDs to fetch comparison data.');
        if (dimensionAlignmentList) dimensionAlignmentList.innerHTML = '<li>Error: Missing result IDs</li>';
        if (radarChart) { radarChart.destroy(); radarChart = null; }
        return;
    }

    if (!dimensionAlignmentList) {
        console.error('Dimension alignment list element not found');
        if (radarChart) { radarChart.destroy(); radarChart = null; } 
        return;
    }
    const listElement = dimensionAlignmentList;

    try {
        // Fetch both results concurrently
        const [userResResponse, aiResResponse] = await Promise.all([
            fetch(`/api/assessment/results/${userResultId}`),
            fetch(`/api/assessment/results/${aiResultId}`)
        ]);

        if (!userResResponse.ok) throw new Error(`Fetch user result failed (${userResResponse.status})`);
        if (!aiResResponse.ok) throw new Error(`Fetch AI result failed (${aiResResponse.status})`);

        const userResult = await userResResponse.json();
        const aiResult = await aiResResponse.json();
        
        console.log("User result:", userResult);
        console.log("AI result:", aiResult);
        
        // Parse scores from JSON strings if needed
        let userScores: Record<string, number>;
        let aiScores: Record<string, number>;
        
        // Handle user scores
        if (typeof userResult.scores === 'string') {
            try {
                userScores = JSON.parse(userResult.scores);
            } catch (error) {
                console.error('Failed to parse user scores JSON:', error);
                throw new Error('Invalid user scores data');
            }
        } else if (userResult.parsedScores && typeof userResult.parsedScores === 'object') {
            userScores = userResult.parsedScores;
        } else {
            throw new Error('Invalid user scores format');
        }
        
        // Handle AI scores
        if (typeof aiResult.scores === 'string') {
            try {
                aiScores = JSON.parse(aiResult.scores);
            } catch (error) {
                console.error('Failed to parse AI scores JSON:', error);
                throw new Error('Invalid AI scores data');
            }
        } else if (aiResult.parsedScores && typeof aiResult.parsedScores === 'object') {
            aiScores = aiResult.parsedScores;
        } else {
            throw new Error('Invalid AI scores format');
        }

        // Verify we have valid objects
        if (!userScores || typeof userScores !== 'object' || !aiScores || typeof aiScores !== 'object') {
            throw new Error('Invalid score data received from results endpoint.');
        }

        // Display dimension scores in list
        listElement.innerHTML = '<li>User vs AI Scores (Scale 1-7):</li>';
        const dimensions = Object.keys(userScores).sort(); // Consistent order
        dimensions.forEach(dim => {
            const li = document.createElement('li');
            const userScoreText = typeof userScores[dim] === 'number' ? userScores[dim].toFixed(1) : 'N/A';
            const aiScoreText = typeof aiScores[dim] === 'number' ? aiScores[dim].toFixed(1) : 'N/A';
            li.textContent = `${dim.charAt(0).toUpperCase() + dim.slice(1)}: ${userScoreText} vs ${aiScoreText}`;
            listElement.appendChild(li);
        });

        // Create/update radar chart
        createRadarChart({ user: userScores, ai: aiScores });

    } catch (error) {
        console.error('Error fetching comparison data for chart:', error);
        listElement.innerHTML = '<li>Error loading scores for chart: ' + (error instanceof Error ? error.message : String(error)) + '</li>';
        if (radarChart) { radarChart.destroy(); radarChart = null; }
    }
}

/**
 * Create or update the radar chart.
 * @param dimensionScores - Object with user and AI scores: { user: {dim: score,...}, ai: {dim: score,...} }
 */
function createRadarChart(dimensionScores: { user: { [key: string]: number }, ai: { [key: string]: number } }): void {
    if (!radarChartCanvas) return;
    const ctx = radarChartCanvas.getContext('2d');
    if (!ctx) return;

    if (radarChart) {
        radarChart.destroy(); // Destroy existing chart instance
        radarChart = null;
    }

    const labels = Object.keys(dimensionScores.user).sort().map(dim => dim.charAt(0).toUpperCase() + dim.slice(1));
    const userData = Object.keys(dimensionScores.user).sort().map(key => dimensionScores.user[key]);
    const aiData = Object.keys(dimensionScores.ai).sort().map(key => dimensionScores.ai[key]);

    // Use the global Chart constructor (make sure Chart.js is loaded)
    try {
        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels,
                datasets: [
                    { label: 'You', data: userData, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgb(54, 162, 235)', pointBackgroundColor: 'rgb(54, 162, 235)' },
                    { label: 'Digital Twin', data: aiData, backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgb(255, 99, 132)', pointBackgroundColor: 'rgb(255, 99, 132)' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: { angleLines: { display: true }, suggestedMin: 1, suggestedMax: 7, pointLabels: { font: { size: 10 } } }
                },
                 plugins: {
                    legend: { position: 'top' },
                    tooltip: { enabled: true }
                }
            }
        });
    } catch (error) {
        console.error("Failed to create Chart.js instance:", error);
        // Display error in canvas area?
    }
}

/**
 * Update assessment section UI based on current state.
 */
export function updateAssessmentUI(): void {
    const hasUserScores = !!state.userTipiScores;
    if (startUserAssessmentButton) startUserAssessmentButton.style.display = hasUserScores ? 'none' : 'inline-block';
    if (retakeUserAssessmentButton) retakeUserAssessmentButton.style.display = hasUserScores ? 'inline-block' : 'none';
    if (userAssessmentStatusSummary) {
        userAssessmentStatusSummary.textContent = hasUserScores 
            ? 'Assessment Completed. You can retake it if needed.' 
            : 'Take the 10-item personality assessment (TIPI).';
    }
    // Call the updated button state functions
    updateRunAIAssessmentButtonState(); 
    updateAssessmentPromptButtons(); 
}

// Refactored event handlers
function confirmAndOpenAssessmentModal(): void {
    if (confirm('Retake assessment? Previous answers will be overwritten.')) {
        openAssessmentModal();
    }
}

function handleModalBackgroundClick(event: MouseEvent): void {
    if (event.target === assessmentModal) {
        closeAssessmentModal();
    }
}

function handleUserDataUpdate(): void {
    console.log('Assessment module received user-data-update related event');
    updateAssessmentUI(); 
    updateAssessmentSystemPrompt(); // Load correct prompt
}

function handleLibraryCleared(): void {
    console.log('Assessment module received library-cleared event');
    updateAssessmentUI();
    if (assessmentResultsArea) assessmentResultsArea.style.display = 'none';
    if (radarChart) { radarChart.destroy(); radarChart = null; }
    updateAssessmentSystemPrompt(); // Will load default/empty state
}

// Helper (duplicate from chatModule - consider moving to utils.ts)
async function fetchAndUpdateUserData(userId: string): Promise<void> {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        state.currentUserData = await response.json();
        console.log('User data updated in state (from assessment module).');
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

// Helper (duplicate from chatModule - consider moving to utils.ts)
async function getErrorMessage(response: Response, defaultMessage: string): Promise<string> {
    let msg = `${defaultMessage} (${response.status})`;
    try { const errorData = await response.json(); msg = errorData.error || msg; } catch {} 
    return msg;
} 