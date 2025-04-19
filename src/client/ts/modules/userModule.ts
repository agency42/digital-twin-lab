/**
 * userModule.ts - User management functionality
 */
import { state, showStatus } from './utils.js';
import { updateNavigationTabsState } from './navigationModule.js'; // Import necessary functions

// Define interfaces for expected data structures
interface User {
    id: string;
    bio?: string;
    createdAt?: string; // Assuming ISO string format
    // Include other relevant fields from API response as needed
    assessment?: {
        userTipiScores?: Record<string, number> | null;
        aiTipiScores?: Record<string, number> | null;
    };
    personality?: any; // Define more specific type later if possible
    generation?: { lastGeneratedProfile?: { json?: any } }; // Define more specific type later
    chatHistory?: any[]; // Define specific chat message type later
    primaryPersona?: any; // Define more specific type later
}

interface TipiQuestion {
    id: string;
    text: string;
    trait: string;
    reverse_scored: boolean;
}

// Define a type for the elements passed to this module
// Based on usage within the file
interface UserModuleElements {
    userSelectDropdown: HTMLSelectElement | null;
    newUserInput: HTMLInputElement | null;
    createUserButton: HTMLButtonElement | null;
    userStatusDiv: HTMLDivElement | null;
    currentUserDisplaySpan: HTMLSpanElement | null;
    userBioTextarea: HTMLTextAreaElement | null;
    saveBioButton: HTMLButtonElement | null;
    bioStatusDiv: HTMLDivElement | null;
    startUserAssessmentButton: HTMLButtonElement | null;
    retakeUserAssessmentButton: HTMLButtonElement | null;
    tipiModalForm: HTMLFormElement | null;
    assessmentModalStatusDiv: HTMLDivElement | null;
    // Add other elements if needed by other functions in this module
    assessmentModal: HTMLDivElement | null;
    tipiModalQuestionsContainer: HTMLDivElement | null;
    cancelAssessmentButton: HTMLButtonElement | null;
    submitAssessmentModalButton: HTMLButtonElement | null;
    closeAssessmentModalButton: HTMLSpanElement | null;
    userAssessmentStatusSummary: HTMLDivElement | null;
}

// UI Elements cache - typed
let userSelectDropdown: HTMLSelectElement | null = null;
let newUserInput: HTMLInputElement | null = null;
let createUserButton: HTMLButtonElement | null = null;
let userStatusDiv: HTMLDivElement | null = null;
let currentUserDisplaySpan: HTMLSpanElement | null = null;
let userBioTextarea: HTMLTextAreaElement | null = null;
let saveBioButton: HTMLButtonElement | null = null;
let bioStatusDiv: HTMLDivElement | null = null;
let startUserAssessmentButton: HTMLButtonElement | null = null;
let retakeUserAssessmentButton: HTMLButtonElement | null = null;
let tipiModalForm: HTMLFormElement | null = null;
let assessmentModalStatusDiv: HTMLDivElement | null = null;
let assessmentModal: HTMLDivElement | null = null;
let tipiModalQuestionsContainer: HTMLDivElement | null = null;
let cancelAssessmentButton: HTMLButtonElement | null = null;
let closeAssessmentModalButton: HTMLSpanElement | null = null;
let userAssessmentStatusSummary: HTMLDivElement | null = null;

/**
 * Initialize the user module
 * @param elements - UI elements for user management
 */
export function initUserModule(elements: UserModuleElements): void {
    // Assign elements from the passed object
    userSelectDropdown = elements.userSelectDropdown;
    newUserInput = elements.newUserInput;
    createUserButton = elements.createUserButton;
    userStatusDiv = elements.userStatusDiv;
    currentUserDisplaySpan = elements.currentUserDisplaySpan;
    userBioTextarea = elements.userBioTextarea;
    saveBioButton = elements.saveBioButton;
    bioStatusDiv = elements.bioStatusDiv;
    startUserAssessmentButton = elements.startUserAssessmentButton;
    retakeUserAssessmentButton = elements.retakeUserAssessmentButton;
    tipiModalForm = elements.tipiModalForm;
    assessmentModalStatusDiv = elements.assessmentModalStatusDiv;
    assessmentModal = elements.assessmentModal;
    tipiModalQuestionsContainer = document.getElementById(
        'tipi-modal-questions'
    ) as HTMLDivElement | null; // Assuming ID exists
    cancelAssessmentButton = document.getElementById(
        'cancel-assessment-button'
    ) as HTMLButtonElement | null;
    closeAssessmentModalButton = document.getElementById(
        'close-assessment-modal'
    ) as HTMLSpanElement | null;
    userAssessmentStatusSummary = elements.userAssessmentStatusSummary;

    // Set up event listeners with null checks
    userSelectDropdown?.addEventListener('change', handleUserSelectChange);
    createUserButton?.addEventListener('click', handleCreateUser);
    saveBioButton?.addEventListener('click', handleSaveBio);

    // Set up assessment buttons/modal listeners
    startUserAssessmentButton?.addEventListener('click', handleStartAssessment);
    retakeUserAssessmentButton?.addEventListener('click', handleRetakeAssessment);
    tipiModalForm?.addEventListener('submit', handleUserAssessmentSubmit);
    closeAssessmentModalButton?.addEventListener('click', () =>
        assessmentModal?.style.setProperty('display', 'none')
    );
    cancelAssessmentButton?.addEventListener('click', () =>
        assessmentModal?.style.setProperty('display', 'none')
    );

    // Load initial user list
    loadUserList();

    console.log('User module initialized');
}

/**
 * Load the list of available users
 */
export async function loadUserList(): Promise<void> {
    if (!userSelectDropdown) return;

    try {
        showStatus(userStatusDiv, 'Loading users...', 'loading');

        const response = await fetch('/api/users');

        if (!response.ok) {
            throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
        }

        // The response is an array of user IDs (strings)
        const userIds: string[] = await response.json();

        // Clear select dropdown
        userSelectDropdown.innerHTML = '<option value="">-- Select User --</option>';

        // Add user options
        userIds.forEach((userId) => {
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = userId;
            userSelectDropdown?.appendChild(option);
        });

        if (userIds.length === 0) {
            showStatus(userStatusDiv, 'No users found. Create a new user to get started.', 'info');
        } else {
            showStatus(userStatusDiv, `${userIds.length} user(s) found.`, 'success', 2000);
        }
    } catch (error) {
        console.error('Error loading user list:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error loading users: ${message}`, 'error');
    }
}

/**
 * Handle user selection change
 */
export async function handleUserSelectChange(): Promise<void> {
    if (!userSelectDropdown) {
        console.error('handleUserSelectChange: userSelectDropdown is null or undefined!');
        return;
    }
    console.log('handleUserSelectChange started...');
    const selectedUserId = userSelectDropdown.value;

    if (!selectedUserId) {
        clearUIState();
        console.log('handleUserSelectChange: No user selected, clearing state.');
        // Also update nav state when user is deselected
        state.currentUserId = null;
        updateNavigationTabsState();
        return;
    }

    console.log('handleUserSelectChange: Selected user ID:', selectedUserId);
    await loadUserData(selectedUserId);

    // After loading user data, verify state
    console.log('handleUserSelectChange finished loading user data. Current state:', {
        currentUserId: state.currentUserId,
    });

    // Force re-check of navigation state (already called within loadUserData, but belt-and-suspenders)
    updateNavigationTabsState();

    // Explicitly ensure Content Library is enabled
    // This logic seems overly complex and potentially problematic,
    // relying on updateNavigationTabsState should be sufficient if it correctly handles the logic.
    // Consider simplifying or removing this explicit block if nav state update is reliable.
    try {
        const contentLibraryTab = document.querySelector(
            '.nav-tab[data-page="content-library-page"]'
        ) as HTMLElement | null;
        if (contentLibraryTab) {
            contentLibraryTab.classList.remove('disabled');
            contentLibraryTab.style.opacity = '1';
            contentLibraryTab.style.pointerEvents = 'auto';
            contentLibraryTab.style.cursor = 'pointer';
            contentLibraryTab.setAttribute('data-enabled', 'true');

            // Removing the direct onclick assignment as it overrides the standard listener
            // contentLibraryTab.onclick = null;

            console.log('Explicitly ensured Content Library tab enabled after user selection');
        } else {
            console.warn('Could not find Content Library tab to ensure enabled state');
        }
    } catch (error) {
        console.error('Error ensuring Content Library tab enabled:', error);
    }
}

/**
 * Load user data for the selected user
 * @param userId - The user ID to load
 * @returns The loaded user data or null on failure
 */
export async function loadUserData(userId: string): Promise<any | null> {
    if (!userId) return null;
    console.log(`loadUserData started for user: ${userId}`);

    try {
        showStatus(userStatusDiv, 'Loading user data...', 'loading');

        const response = await fetch(`/api/users/${userId}`);

        if (!response.ok) {
            throw new Error(`Failed to load user data: ${response.status} ${response.statusText}`);
        }

        const userData = await response.json();
        console.log(`User data loaded for ${userId}:`, userData);

        if (!userData) {
            throw new Error(`No user data found for ${userId}`);
        }

        // Set currentUserId in state
        state.currentUserId = userId;
        state.currentUserData = userData;
        console.log(`loadUserData: currentUserId set to: ${state.currentUserId}`);

        // Update UI based on loaded data
        updateUIWithUserData(userData);

        // Update nav tabs BEFORE showing success message
        updateNavigationTabsState();

        showStatus(userStatusDiv, 'User data loaded successfully', 'success', 2000);

        console.log('Loaded user data:', userData);
        console.log(`loadUserData successfully finished for user: ${userId}`);

        // Dispatch event to notify other modules
        const eventDetail = { detail: { userId, userData } };
        const event = new CustomEvent('user-data-loaded', eventDetail);
        document.dispatchEvent(event);

        return userData;
    } catch (error) {
        console.error('Error loading user data:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error loading user data: ${message}`, 'error');
        clearUIState();
        console.log(`loadUserData failed for user: ${userId}`);
        return null;
    }
}

/**
 * Update UI elements with loaded user data
 * @param userData - The user data object
 */
export function updateUIWithUserData(userData: User): void {
    // Update user display
    if (currentUserDisplaySpan) {
        currentUserDisplaySpan.textContent = userData.id;
    }

    // Update UI elements (Bio)
    if (userBioTextarea) userBioTextarea.value = userData.bio || '';

    // Log final state for debugging
    console.log('Final state after updateUIWithUserData:', {
        currentUserId: state.currentUserId,
    });

    // Persist selected user ID
    localStorage.setItem('lastSelectedUser', userData.id);
}

/**
 * Update Assessment UI based on whether the user has scores
 * @param hasAssessment - Boolean indicating if assessment scores exist
 */
function updateAssessmentUI(hasAssessment: boolean): void {
    if (userAssessmentStatusSummary) {
        userAssessmentStatusSummary.textContent = hasAssessment
            ? 'You have completed the assessment.'
            : 'Assessment not yet taken.';
        userAssessmentStatusSummary.style.display = 'block';
    }
    if (startUserAssessmentButton) {
        startUserAssessmentButton.style.display = hasAssessment ? 'none' : 'inline-block';
    }
    if (retakeUserAssessmentButton) {
        retakeUserAssessmentButton.style.display = hasAssessment ? 'inline-block' : 'none';
    }
}

/**
 * Create a new user
 */
export async function handleCreateUser(): Promise<void> {
    if (!newUserInput || !userStatusDiv) return;

    const newUserId = newUserInput.value.trim();

    if (!newUserId) {
        showStatus(
            userStatusDiv,
            'Please enter a valid user ID (e.g., alphanumeric, underscores)',
            'error'
        );
        return;
    }

    // Basic validation for user ID format (optional, adjust as needed)
    if (!/^[a-zA-Z0-9_]+$/.test(newUserId)) {
        showStatus(
            userStatusDiv,
            'User ID can only contain letters, numbers, and underscores.',
            'error'
        );
        return;
    }

    try {
        showStatus(userStatusDiv, 'Creating user...', 'loading');

        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUserId }),
        });

        if (!response.ok) {
            let errorMsg = `Failed to create user (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch {
                /* Ignore JSON parsing error */
            }
            throw new Error(errorMsg);
        }

        const newUser: User = await response.json();

        // Update user list and select the new user
        await loadUserList();
        if (userSelectDropdown) {
            userSelectDropdown.value = newUser.id;
            await handleUserSelectChange(); // Load the new user's data
        }

        showStatus(userStatusDiv, `User '${newUser.id}' created successfully`, 'success');
        newUserInput.value = ''; // Clear the input
    } catch (error) {
        console.error('Error creating user:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error creating user: ${message}`, 'error');
    }
}

/**
 * Save user bio
 */
export async function handleSaveBio(): Promise<void> {
    if (!userBioTextarea || !state.currentUserId) {
        showStatus(bioStatusDiv, 'Please select a user first', 'error');
        return;
    }

    const bioText = userBioTextarea.value; // Keep whitespace potentially
    const currentUserId = state.currentUserId; // Cache the ID

    try {
        showStatus(bioStatusDiv, 'Saving bio...', 'loading');

        const response = await fetch(`/api/users/${currentUserId}`, {
            // Correct endpoint
            method: 'PUT', // Correct method
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bioText }), // Send only the bio field
        });

        if (!response.ok) {
            let errorMsg = `Failed to save bio (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch {
                /* Ignore JSON parsing error */
            }
            throw new Error(errorMsg);
        }

        showStatus(bioStatusDiv, 'Bio saved successfully', 'success', 2000);

        // Optionally, fetch updated user data and re-render UI if needed
        // E.g., await loadUserData(currentUserId);
        // updateUIWithUserData(updatedData);

        await loadUserData(currentUserId); // Refresh user data to dispatch the user-data-loaded event
    } catch (error) {
        console.error('Error saving bio:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(bioStatusDiv, `Error saving bio: ${message}`, 'error');
    }
}

/**
 * Handle the start assessment button click
 */
export function handleStartAssessment(): void {
    console.log('Starting assessment for user:', state.currentUserId);
    if (!state.currentUserId) {
        showStatus(userStatusDiv, 'Please select a user first', 'error');
        return;
    }
    if (!assessmentModal) {
        console.error('Assessment modal element not found!');
        return;
    }

    loadTipiQuestions(); // Load questions into the modal
    assessmentModal.style.display = 'block'; // Show the modal
    showStatus(assessmentModalStatusDiv, '', 'info'); // Clear previous status
}

/**
 * Handle the retake assessment button click
 */
export function handleRetakeAssessment(): void {
    if (
        !confirm(
            'Are you sure you want to retake the assessment? Your previous answers will be overwritten.'
        )
    ) {
        return;
    }
    handleStartAssessment(); // Reuse the start assessment logic
}

/**
 * Load TIPI questions into the assessment modal
 */
async function loadTipiQuestions(): Promise<void> {
    if (!tipiModalQuestionsContainer) {
        console.error('TIPI questions container not found in the DOM.');
        showStatus(assessmentModalStatusDiv, 'Error: Assessment UI elements missing.', 'error');
        return;
    }
    // Assign to a new const after the null check to help the type checker
    const questionsContainer = tipiModalQuestionsContainer;

    try {
        // Use the non-null const variable
        questionsContainer.innerHTML = '<p>Loading questions...</p>';
        showStatus(assessmentModalStatusDiv, 'Loading questions...', 'loading');

        const response = await fetch('/api/assessment/tipi-questions');
        if (!response.ok) {
            throw new Error(`Failed to load TIPI questions: ${response.statusText}`);
        }
        const questions = await response.json();

        questionsContainer.innerHTML = ''; // Clear loading message

        questions.forEach((q: any, index: number) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tipi-question-item';
            itemDiv.innerHTML = `
                <div class="question-header">
                    <strong>${index + 1}. ${q.text}</strong>
                </div>
                <div class="scale-container">
                    <div class="scale-labels">
                        <span>Strongly Disagree</span>
                        <span></span>
                        <span>Neutral</span>
                        <span></span>
                        <span>Strongly Agree</span>
                    </div>
                    <div class="radio-options">
                        ${[1, 2, 3, 4, 5, 6, 7]
                            .map(
                                (val) => `
                            <div class="radio-option">
                                <input type="radio" id="tipi-q-${q.id}-${val}" name="${q.id}" value="${val}" required>
                                <label for="tipi-q-${q.id}-${val}">${val}</label>
                            </div>
                        `
                            )
                            .join('')}
                    </div>
                </div>
            `;
            questionsContainer.appendChild(itemDiv);
        });

        // Add styles for the assessment form
        const style = document.createElement('style');
        style.textContent = `
            .tipi-questions-container {
                max-height: 70vh;
                overflow-y: auto;
                padding: 15px;
                background-color: #fff;
                border-radius: 8px;
            }
            
            .tipi-question-item {
                margin-bottom: 25px;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 8px;
            }
            
            .question-header {
                margin-bottom: 15px;
                color: #333;
                font-size: 16px;
            }
            
            .scale-container {
                background-color: white;
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #eee;
            }
            
            .scale-labels {
                display: flex;
                justify-content: space-between;
                color: #555;
                font-size: 13px;
                margin-bottom: 8px;
            }
            
            .radio-options {
                display: flex;
                justify-content: space-between;
            }
            
            .radio-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 40px;
            }
            
            .radio-option input[type="radio"] {
                margin: 0;
                cursor: pointer;
                width: 18px;
                height: 18px;
            }
            
            .radio-option label {
                margin-top: 5px;
                font-size: 14px;
                color: #333;
                cursor: pointer;
            }
            
            .assessment-modal-content {
                background-color: #fff;
                color: #333;
            }
            
            #assessment-modal-title {
                color: #333;
            }
        `;
        document.head.appendChild(style);

        showStatus(assessmentModalStatusDiv, 'Please answer all questions.', 'info');
    } catch (error) {
        console.error('Error loading TIPI questions:', error);
        const message = error instanceof Error ? error.message : String(error);
        // Use the non-null const variable here too
        questionsContainer.innerHTML = `<p style="color: red;">Error loading questions: ${message}</p>`;
        showStatus(assessmentModalStatusDiv, `Error: ${message}`, 'error');
    }
}

/**
 * Handle the submission of the user's TIPI assessment
 * @param event - The form submission event
 */
export async function handleUserAssessmentSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault(); // Prevent default form submission
    if (!tipiModalForm || !state.currentUserId) {
        showStatus(
            assessmentModalStatusDiv,
            'Error: Cannot submit assessment. User or form not found.',
            'error'
        );
        return;
    }

    const formData = new FormData(tipiModalForm);
    const answers: Record<string, number> = {};
    let allAnswered = true;

    // Extract answers directly from form data
    for (const [questionId, value] of formData.entries()) {
        if (questionId.startsWith('q')) {
            answers[questionId] = parseInt(value as string, 10);
        }
    }

    // Check if we have all 10 questions answered
    if (Object.keys(answers).length !== 10) {
        allAnswered = false;
    }

    if (!allAnswered) {
        showStatus(
            assessmentModalStatusDiv,
            'Please answer all questions before submitting.',
            'error'
        );
        return;
    }

    console.log('Submitting assessment answers:', answers);
    showStatus(assessmentModalStatusDiv, 'Submitting answers...', 'loading');

    try {
        const response = await fetch(`/api/assessment/${state.currentUserId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers }),
        });

        if (!response.ok) {
            let errorMsg = `Failed to submit assessment (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch {
                /* Ignore */
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log('Assessment submission result:', result);
        state.userTipiScores = answers; // Store raw answers in state

        showStatus(assessmentModalStatusDiv, 'Assessment submitted successfully!', 'success', 2000);

        // Close modal after a short delay
        setTimeout(() => {
            assessmentModal?.style.setProperty('display', 'none');
            updateAssessmentUI(true); // Update the main page UI
        }, 1500);
    } catch (error) {
        console.error('Error submitting assessment:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(assessmentModalStatusDiv, `Error submitting: ${message}`, 'error');
    }
}

/**
 * Clear UI state when no user is selected
 */
export function clearUIState(): void {
    console.log('Clearing UI state');
    // Reset state variables
    state.currentUserId = null;
    state.selectedAssets = new Set<string>();
    state.currentChatHistory = [];
    state.userTipiScores = null;
    state.aiTipiScores = null;

    // Clear UI elements
    if (currentUserDisplaySpan) currentUserDisplaySpan.textContent = 'None Selected';
    if (userBioTextarea) userBioTextarea.value = '';
    if (newUserInput) newUserInput.value = ''; // Clear create user input

    // Reset button states / visibility
    updateAssessmentUI(false);

    // Reset status messages
    showStatus(userStatusDiv, '', 'info');
    showStatus(bioStatusDiv, '', 'info');

    // Update navigation (will disable relevant tabs)
    updateNavigationTabsState();

    // Dispatch event to notify other modules
    document.dispatchEvent(new CustomEvent('user-cleared'));
}

/**
 * Handle user deselection (e.g., selecting the "Select User" option)
 */
// @ts-ignore - Used indirectly as event handler in loadUsers based on dropdown value
function handleUserDeselect(): void {
    console.log('User deselected');
    // Reset the state related to the current user
    state.currentUserId = null;
    state.selectedAssets.clear();
    state.currentChatHistory = [];
    state.currentChatSessionId = null;
    state.userTipiScores = null;
    state.aiTipiScores = null;

    // Update UI elements managed DIRECTLY by userModule
    if (currentUserDisplaySpan) currentUserDisplaySpan.textContent = 'None Selected';
    if (userBioTextarea) userBioTextarea.value = '';

    // Trigger events to notify other modules
    document.dispatchEvent(new CustomEvent('user-deselected'));
    document.dispatchEvent(new CustomEvent('library-cleared', { detail: { userId: null } })); // Notify content/personality modules

    localStorage.removeItem('lastSelectedUser'); // Clear saved user
    showStatus(userStatusDiv, 'No user selected', 'info');
}
