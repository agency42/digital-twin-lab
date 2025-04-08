/**
 * assessmentModule.ts - Handles personality assessment functionality
 */
import { state, showStatus } from './utils.js';
// UI Elements cache - typed
let startUserAssessmentButton = null;
let retakeUserAssessmentButton = null;
let assessmentModal = null;
let tipiModalForm = null;
let assessmentModalStatusDiv = null;
let userAssessmentStatusSummary = null;
let runAIAssessmentButton = null;
let aiAssessmentStatusDiv = null;
let aiProfileSelect = null;
let assessmentResultsArea = null;
let overallAlignmentSpan = null;
let dimensionAlignmentList = null;
let radarChartCanvas = null;
let itemAgreementSpan = null;
let aiAssessmentTempInput = null;
let radarChart = null; // Use any for Chart instance type
/**
 * Initialize the assessment module
 * @param elements - UI elements for assessment functionality
 */
export function initAssessmentModule(elements) {
    // Assign elements
    startUserAssessmentButton = elements.startUserAssessmentButton;
    retakeUserAssessmentButton = elements.retakeUserAssessmentButton;
    assessmentModal = elements.assessmentModal;
    tipiModalForm = elements.tipiModalForm;
    assessmentModalStatusDiv = elements.assessmentModalStatusDiv;
    userAssessmentStatusSummary = elements.userAssessmentStatusSummary;
    runAIAssessmentButton = elements.runAIAssessmentButton;
    aiAssessmentStatusDiv = elements.aiAssessmentStatusDiv;
    aiProfileSelect = elements.aiProfileSelect;
    assessmentResultsArea = elements.assessmentResultsArea;
    overallAlignmentSpan = elements.overallAlignmentSpan;
    dimensionAlignmentList = elements.dimensionAlignmentList;
    radarChartCanvas = elements.radarChartCanvas;
    itemAgreementSpan = elements.itemAgreementSpan;
    aiAssessmentTempInput = elements.aiAssessmentTempInput;
    // Set up event listeners with null checks
    startUserAssessmentButton?.addEventListener('click', openAssessmentModal);
    retakeUserAssessmentButton?.addEventListener('click', () => {
        // Add confirmation for retake
        if (confirm('Are you sure you want to retake the assessment? Your previous answers will be overwritten.')) {
            openAssessmentModal();
        }
    });
    tipiModalForm?.addEventListener('submit', handleUserAssessmentSubmit);
    runAIAssessmentButton?.addEventListener('click', runAIAssessment);
    aiProfileSelect?.addEventListener('change', updateRunAIAssessmentButtonState);
    // Modal interaction listeners
    const closeModalButton = document.getElementById('close-assessment-modal');
    const cancelButton = document.getElementById('cancel-assessment-button');
    closeModalButton?.addEventListener('click', closeAssessmentModal);
    cancelButton?.addEventListener('click', closeAssessmentModal);
    assessmentModal?.addEventListener('click', (event) => {
        if (event.target === assessmentModal) {
            closeAssessmentModal();
        }
    });
    // Listen for user data loaded event
    document.addEventListener('user-data-loaded', (event) => {
        const customEvent = event;
        console.log('Assessment module received user-data-loaded event');
        if (customEvent.detail?.userId) {
            updateAssessmentUI(); // Update based on potentially loaded scores
            loadPersonalityProfiles(); // Load profiles for AI dropdown
        }
    });
    // Listen for library cleared event to reset UI
    document.addEventListener('library-cleared', () => {
        console.log('Assessment module received library-cleared event');
        updateAssessmentUI(); // Should reflect cleared state
        if (assessmentResultsArea)
            assessmentResultsArea.style.display = 'none'; // Hide old results
        if (radarChart)
            radarChart.destroy(); // Destroy chart
        if (aiProfileSelect)
            aiProfileSelect.innerHTML = '<option value="">-- Select Personality Profile --</option>'; // Clear profiles
    });
    console.log('Assessment module initialized');
}
/**
 * Open the assessment modal
 */
export function openAssessmentModal() {
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
export function closeAssessmentModal() {
    if (!assessmentModal)
        return;
    console.log('Closing assessment modal');
    assessmentModal.style.display = 'none';
    // Clear status message inside modal when closing
    showStatus(assessmentModalStatusDiv, '', 'info');
}
/**
 * Load TIPI questions into the modal
 */
async function loadTipiQuestions() {
    const questionsContainer = document.getElementById('tipi-modal-questions');
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
        const questions = await response.json();
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
    }
    catch (error) {
        console.error('Error loading TIPI questions:', error);
        questionsContainer.innerHTML = '<p class="error">Error loading questions. Please try again.</p>';
        showStatus(assessmentModalStatusDiv, 'Error loading questions. Please try again.', 'error');
    }
}
/**
 * Restore the user's previous assessment answers to the form
 */
function restoreUserAssessmentFormState() {
    if (!tipiModalForm || !state.userTipiScores)
        return;
    // Make sure we have an object of scores, not a string
    let scores;
    if (typeof state.userTipiScores === 'string') {
        try {
            // Try to parse if it's a JSON string
            scores = JSON.parse(state.userTipiScores);
        }
        catch (error) {
            console.error('Failed to parse userTipiScores string:', error);
            return;
        }
    }
    else {
        // Already an object
        scores = state.userTipiScores;
    }
    const currentForm = tipiModalForm;
    // Only iterate through pairs of question IDs and scores
    Object.entries(scores).forEach(([questionId, score]) => {
        // Only handle entries that look like question IDs (q1, q2, etc.)
        if (questionId.startsWith('q') && typeof score === 'number') {
            const input = currentForm.querySelector(`input[name="${questionId}"][value="${score}"]`);
            if (input) {
                input.checked = true;
            }
        }
        else {
            console.warn(`Invalid score type for ${questionId}:`, score);
        }
    });
}
/**
 * Handle user assessment submission
 * @param event - The form submission event
 */
export async function handleUserAssessmentSubmit(event) {
    event.preventDefault();
    if (!state.currentUserId || !tipiModalForm) {
        showStatus(assessmentModalStatusDiv, 'Cannot submit: User or form not found.', 'error');
        return;
    }
    const currentUserId = state.currentUserId;
    const formData = new FormData(tipiModalForm);
    const scores = {};
    const expectedQuestionCount = 10; // TIPI has 10 questions
    let answeredCount = 0;
    for (const [name, value] of formData.entries()) {
        if (name.startsWith('q') && !isNaN(parseInt(value, 10))) {
            scores[name] = parseInt(value, 10);
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
            }
            catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        // First try to get the response data
        let responseData;
        try {
            responseData = await response.json();
        }
        catch (error) {
            console.warn('Could not parse assessment response JSON, continuing with saved scores');
        }
        // Always update state with the actual scores object (not a string)
        state.userTipiScores = scores;
        // Also update within currentUserData if it exists
        if (state.currentUserData?.assessment) {
            state.currentUserData.assessment.userTipiScores = scores;
        }
        else if (state.currentUserData) {
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
    }
    catch (error) {
        console.error('Error saving assessment:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(assessmentModalStatusDiv, `Error saving assessment: ${message}`, 'error');
    }
}
/**
 * Load available personality profiles into the AI assessment dropdown
 */
async function loadPersonalityProfiles() {
    if (!aiProfileSelect || !state.currentUserId)
        return;
    const currentUserId = state.currentUserId;
    try {
        // Fetch personas associated with the user
        // Assuming an endpoint like /api/personality/:userId exists (or use /api/users/:userId)
        const response = await fetch(`/api/users/${currentUserId}`);
        if (!response.ok)
            throw new Error(`Failed to load user data for profiles (${response.status})`);
        const userData = await response.json();
        const primaryPersona = userData.primaryPersona; // Get the single primary persona
        aiProfileSelect.innerHTML = '<option value="">-- Select Personality Profile --</option>';
        if (primaryPersona) {
            const option = document.createElement('option');
            option.value = primaryPersona.id; // Use the persona ID
            option.textContent = `Primary Persona (Updated: ${new Date(primaryPersona.updatedAt).toLocaleDateString()})`;
            aiProfileSelect.appendChild(option);
            // Auto-select the profile if it's the only one
            aiProfileSelect.value = primaryPersona.id;
            console.log('Auto-selected primary persona:', primaryPersona.id);
        }
        else {
            // Optionally disable or show message if no persona exists
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No Primary Persona Generated';
            option.disabled = true;
            aiProfileSelect.appendChild(option);
        }
        updateRunAIAssessmentButtonState();
    }
    catch (error) {
        console.error('Error loading personality profiles:', error);
        aiProfileSelect.innerHTML = '<option value="">Error loading profiles</option>';
    }
}
/**
 * Update the state (enabled/disabled) of the Run AI Assessment button
 */
function updateRunAIAssessmentButtonState() {
    if (!runAIAssessmentButton || !aiProfileSelect)
        return;
    const hasUserScores = !!state.userTipiScores;
    const profileSelected = !!aiProfileSelect.value; // Check if a valid profile ID is selected
    const canRunAssessment = hasUserScores && profileSelected;
    runAIAssessmentButton.disabled = !canRunAssessment;
    // Provide feedback if button is disabled
    if (!canRunAssessment && userAssessmentStatusSummary) {
        if (!hasUserScores) {
            userAssessmentStatusSummary.textContent = 'Complete your assessment first.';
        }
        else if (!profileSelected) {
            // Don't overwrite user assessment status, maybe add tooltip to button?
            runAIAssessmentButton.title = 'Select a personality profile to compare against.';
        }
        else {
            runAIAssessmentButton.title = ''; // Clear tooltip
        }
    }
    else if (runAIAssessmentButton) {
        runAIAssessmentButton.title = ''; // Clear tooltip
    }
}
/**
 * Run the AI assessment simulation and calculate alignment.
 */
async function runAIAssessment() {
    if (!state.currentUserId || !state.userTipiScores || !aiProfileSelect?.value) {
        showStatus(aiAssessmentStatusDiv, 'Complete your assessment and select a profile first', 'error');
        return;
    }
    const currentUserId = state.currentUserId;
    const selectedPersonaId = aiProfileSelect.value;
    const temperature = aiAssessmentTempInput ? parseFloat(aiAssessmentTempInput.value) : 0.8;
    // Get runs per item (default to 1 if not set or invalid)
    const runsPerItemInput = document.getElementById('runs-per-item');
    const runsPerItem = runsPerItemInput ? Math.max(1, Math.min(10, parseInt(runsPerItemInput.value) || 1)) : 1;
    // Validate temperature
    if (isNaN(temperature) || temperature < 0 || temperature > 2.0) {
        showStatus(aiAssessmentStatusDiv, 'Invalid temperature value (must be 0-2.0)', 'error');
        return;
    }
    try {
        showStatus(aiAssessmentStatusDiv, `Running AI assessment simulation (${runsPerItem} ${runsPerItem === 1 ? 'run' : 'runs'} per item)...`, 'loading');
        if (runAIAssessmentButton)
            runAIAssessmentButton.disabled = true;
        // Run simulation multiple times if runsPerItem > 1
        let simulationResults = [];
        for (let i = 0; i < runsPerItem; i++) {
            if (runsPerItem > 1) {
                showStatus(aiAssessmentStatusDiv, `Running simulation ${i + 1} of ${runsPerItem}...`, 'loading');
            }
            // Run the simulation
            const simulateResponse = await fetch(`/api/assessment/${currentUserId}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personaId: selectedPersonaId, temperature })
            });
            if (!simulateResponse.ok) {
                const errorData = await simulateResponse.json().catch(() => ({ error: `Sim request failed (${simulateResponse.status})` }));
                throw new Error(errorData.error || `AI simulation failed`);
            }
            const result = await simulateResponse.json();
            console.log(`Simulation ${i + 1} result:`, result);
            simulationResults.push(result);
        }
        // Use the last simulation result for the assessment calculation
        // (The backend stores each result, but we'll use the latest for consistency)
        const simulationResult = simulationResults[simulationResults.length - 1];
        console.log('AI Simulation Result (Final):', simulationResult);
        // If we did multiple runs, show a summary
        if (runsPerItem > 1) {
            console.log(`Completed ${runsPerItem} simulation runs. Using latest result for alignment.`);
        }
        showStatus(aiAssessmentStatusDiv, 'Simulation complete. Calculating alignment...', 'loading');
        // Calculate Alignment
        const alignmentResponse = await fetch(`/api/assessment/${currentUserId}/calculate-alignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessmentType: 'TIPI' }) // Backend fetches latest results based on type
        });
        if (!alignmentResponse.ok) {
            const errorData = await alignmentResponse.json().catch(() => ({ error: `Align request failed (${alignmentResponse.status})` }));
            throw new Error(errorData.error || `Alignment calculation failed`);
        }
        const alignmentResult = await alignmentResponse.json();
        console.log('Alignment Calculation Result:', alignmentResult);
        // Display Results
        displayAssessmentResults(alignmentResult);
        showStatus(aiAssessmentStatusDiv, 'AI assessment & alignment complete.', 'success', 3000);
    }
    catch (error) {
        console.error('Error running AI assessment pipeline:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(aiAssessmentStatusDiv, `Error: ${message}`, 'error');
    }
    finally {
        if (runAIAssessmentButton)
            runAIAssessmentButton.disabled = false;
        updateRunAIAssessmentButtonState(); // Re-check if still valid
    }
}
/**
 * Display assessment alignment results in the UI.
 * @param results - The alignment result object from the backend.
 */
function displayAssessmentResults(results) {
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
        if (radarChart) {
            radarChart.destroy();
            radarChart = null;
        }
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
async function fetchComparisonDataAndDrawChart(userResultId, aiResultId) {
    if (!userResultId || !aiResultId) {
        console.error('Missing result IDs to fetch comparison data.');
        if (dimensionAlignmentList)
            dimensionAlignmentList.innerHTML = '<li>Error: Missing result IDs</li>';
        if (radarChart) {
            radarChart.destroy();
            radarChart = null;
        }
        return;
    }
    if (!dimensionAlignmentList) {
        console.error('Dimension alignment list element not found');
        if (radarChart) {
            radarChart.destroy();
            radarChart = null;
        }
        return;
    }
    const listElement = dimensionAlignmentList;
    try {
        // Fetch both results concurrently
        const [userResResponse, aiResResponse] = await Promise.all([
            fetch(`/api/assessment/results/${userResultId}`),
            fetch(`/api/assessment/results/${aiResultId}`)
        ]);
        if (!userResResponse.ok)
            throw new Error(`Fetch user result failed (${userResResponse.status})`);
        if (!aiResResponse.ok)
            throw new Error(`Fetch AI result failed (${aiResResponse.status})`);
        const userResult = await userResResponse.json();
        const aiResult = await aiResResponse.json();
        console.log("User result:", userResult);
        console.log("AI result:", aiResult);
        // Parse scores from JSON strings if needed
        let userScores;
        let aiScores;
        // Handle user scores
        if (typeof userResult.scores === 'string') {
            try {
                userScores = JSON.parse(userResult.scores);
            }
            catch (error) {
                console.error('Failed to parse user scores JSON:', error);
                throw new Error('Invalid user scores data');
            }
        }
        else if (userResult.parsedScores && typeof userResult.parsedScores === 'object') {
            userScores = userResult.parsedScores;
        }
        else {
            throw new Error('Invalid user scores format');
        }
        // Handle AI scores
        if (typeof aiResult.scores === 'string') {
            try {
                aiScores = JSON.parse(aiResult.scores);
            }
            catch (error) {
                console.error('Failed to parse AI scores JSON:', error);
                throw new Error('Invalid AI scores data');
            }
        }
        else if (aiResult.parsedScores && typeof aiResult.parsedScores === 'object') {
            aiScores = aiResult.parsedScores;
        }
        else {
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
    }
    catch (error) {
        console.error('Error fetching comparison data for chart:', error);
        listElement.innerHTML = '<li>Error loading scores for chart: ' + (error instanceof Error ? error.message : String(error)) + '</li>';
        if (radarChart) {
            radarChart.destroy();
            radarChart = null;
        }
    }
}
/**
 * Create or update the radar chart.
 * @param dimensionScores - Object with user and AI scores: { user: {dim: score,...}, ai: {dim: score,...} }
 */
function createRadarChart(dimensionScores) {
    if (!radarChartCanvas)
        return;
    const ctx = radarChartCanvas.getContext('2d');
    if (!ctx)
        return;
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
    }
    catch (error) {
        console.error("Failed to create Chart.js instance:", error);
        // Display error in canvas area?
    }
}
/**
 * Update assessment section UI based on current state (e.g., user scores availability).
 */
export function updateAssessmentUI() {
    const hasUserScores = !!state.userTipiScores;
    if (startUserAssessmentButton) {
        startUserAssessmentButton.style.display = hasUserScores ? 'none' : 'inline-block';
    }
    if (retakeUserAssessmentButton) {
        retakeUserAssessmentButton.style.display = hasUserScores ? 'inline-block' : 'none';
    }
    if (userAssessmentStatusSummary) {
        userAssessmentStatusSummary.textContent = hasUserScores
            ? 'You have completed the assessment.'
            : 'Assessment not yet taken.';
        userAssessmentStatusSummary.className = hasUserScores ? 'status success' : 'status info';
        userAssessmentStatusSummary.style.display = 'block';
    }
    updateRunAIAssessmentButtonState(); // Update dependent button
}
//# sourceMappingURL=assessmentModule.js.map