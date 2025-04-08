/**
 * userModule.ts - User management functionality
 */
import { state, showStatus } from './utils.js';
import { updateNavigationTabsState } from './navigationModule.js'; // Import necessary functions
// UI Elements cache - typed
let userSelectDropdown = null;
let newUserInput = null;
let createUserButton = null;
let userStatusDiv = null;
let currentUserDisplaySpan = null;
let userBioTextarea = null;
let saveBioButton = null;
let bioStatusDiv = null;
let connectLinkedinButton = null;
let disconnectLinkedinButton = null;
let startUserAssessmentButton = null;
let retakeUserAssessmentButton = null;
let tipiModalForm = null;
let assessmentModalStatusDiv = null;
let assessmentModal = null;
let tipiModalQuestionsContainer = null;
let cancelAssessmentButton = null;
let closeAssessmentModalButton = null;
let userAssessmentStatusSummary = null;
/**
 * Initialize the user module
 * @param elements - UI elements for user management
 */
export function initUserModule(elements) {
    // Assign elements from the passed object
    userSelectDropdown = elements.userSelectDropdown;
    newUserInput = elements.newUserInput;
    createUserButton = elements.createUserButton;
    userStatusDiv = elements.userStatusDiv;
    currentUserDisplaySpan = elements.currentUserDisplaySpan;
    userBioTextarea = elements.userBioTextarea;
    saveBioButton = elements.saveBioButton;
    bioStatusDiv = elements.bioStatusDiv;
    connectLinkedinButton = elements.connectLinkedinButton;
    disconnectLinkedinButton = elements.disconnectLinkedinButton;
    startUserAssessmentButton = elements.startUserAssessmentButton;
    retakeUserAssessmentButton = elements.retakeUserAssessmentButton;
    tipiModalForm = elements.tipiModalForm;
    assessmentModalStatusDiv = elements.assessmentModalStatusDiv;
    assessmentModal = elements.assessmentModal;
    tipiModalQuestionsContainer = document.getElementById('tipi-modal-questions'); // Assuming ID exists
    cancelAssessmentButton = document.getElementById('cancel-assessment-button');
    closeAssessmentModalButton = document.getElementById('close-assessment-modal');
    userAssessmentStatusSummary = elements.userAssessmentStatusSummary;
    // Set up event listeners with null checks
    userSelectDropdown?.addEventListener('change', handleUserSelectChange);
    createUserButton?.addEventListener('click', handleCreateUser);
    saveBioButton?.addEventListener('click', handleSaveBio);
    // Clone LinkedIn buttons to ensure clean event listeners
    if (connectLinkedinButton && connectLinkedinButton.parentNode) {
        const newConnectButton = connectLinkedinButton.cloneNode(true);
        connectLinkedinButton.parentNode.replaceChild(newConnectButton, connectLinkedinButton);
        connectLinkedinButton = newConnectButton;
        connectLinkedinButton.addEventListener('click', handleLinkedInConnect);
        console.log('LinkedIn connect button listener attached (after clone)');
    }
    if (disconnectLinkedinButton && disconnectLinkedinButton.parentNode) {
        const newDisconnectButton = disconnectLinkedinButton.cloneNode(true);
        disconnectLinkedinButton.parentNode.replaceChild(newDisconnectButton, disconnectLinkedinButton);
        disconnectLinkedinButton = newDisconnectButton;
        disconnectLinkedinButton.addEventListener('click', handleLinkedInDisconnect);
        console.log('LinkedIn disconnect button listener attached (after clone)');
    }
    // Set up assessment buttons/modal listeners
    startUserAssessmentButton?.addEventListener('click', handleStartAssessment);
    retakeUserAssessmentButton?.addEventListener('click', handleRetakeAssessment);
    tipiModalForm?.addEventListener('submit', handleUserAssessmentSubmit);
    closeAssessmentModalButton?.addEventListener('click', () => assessmentModal?.style.setProperty('display', 'none'));
    cancelAssessmentButton?.addEventListener('click', () => assessmentModal?.style.setProperty('display', 'none'));
    // Load initial user list
    loadUserList();
    console.log('User module initialized');
}
/**
 * Load the list of available users
 */
export async function loadUserList() {
    if (!userSelectDropdown)
        return;
    try {
        showStatus(userStatusDiv, 'Loading users...', 'loading');
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
        }
        // The response is an array of user IDs (strings)
        const userIds = await response.json();
        // Clear select dropdown
        userSelectDropdown.innerHTML = '<option value="">-- Select User --</option>';
        // Add user options
        userIds.forEach(userId => {
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = userId;
            userSelectDropdown?.appendChild(option);
        });
        if (userIds.length === 0) {
            showStatus(userStatusDiv, 'No users found. Create a new user to get started.', 'info');
        }
        else {
            showStatus(userStatusDiv, `${userIds.length} user(s) found.`, 'success', 2000);
        }
    }
    catch (error) {
        console.error('Error loading user list:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error loading users: ${message}`, 'error');
    }
}
/**
 * Handle user selection change
 */
export async function handleUserSelectChange() {
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
        state.currentGeneratedProfile = null;
        updateNavigationTabsState();
        return;
    }
    console.log('handleUserSelectChange: Selected user ID:', selectedUserId);
    await loadUserData(selectedUserId);
    // After loading user data, verify state
    console.log('handleUserSelectChange finished loading user data. Current state:', {
        currentUserId: state.currentUserId,
        hasGeneratedProfile: !!state.currentGeneratedProfile,
    });
    // Force re-check of navigation state (already called within loadUserData, but belt-and-suspenders)
    updateNavigationTabsState();
    // Explicitly ensure Content Library is enabled 
    // This logic seems overly complex and potentially problematic, 
    // relying on updateNavigationTabsState should be sufficient if it correctly handles the logic.
    // Consider simplifying or removing this explicit block if nav state update is reliable.
    try {
        const contentLibraryTab = document.querySelector('.nav-tab[data-page="content-library-page"]');
        if (contentLibraryTab) {
            contentLibraryTab.classList.remove('disabled');
            contentLibraryTab.style.opacity = '1';
            contentLibraryTab.style.pointerEvents = 'auto';
            contentLibraryTab.style.cursor = 'pointer';
            contentLibraryTab.setAttribute('data-enabled', 'true');
            // Removing the direct onclick assignment as it overrides the standard listener
            // contentLibraryTab.onclick = null; 
            console.log('Explicitly ensured Content Library tab enabled after user selection');
        }
        else {
            console.warn('Could not find Content Library tab to ensure enabled state');
        }
    }
    catch (error) {
        console.error('Error ensuring Content Library tab enabled:', error);
    }
    // Check LinkedIn connection status
    checkLinkedInConnectionStatus();
}
/**
 * Load user data for the selected user
 * @param userId - The user ID to load
 * @returns The loaded user data or null on failure
 */
export async function loadUserData(userId) {
    if (!userId)
        return null;
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
        // Make sure assessment data is properly parsed if it's a string
        if (userData.assessment?.userTipiScores) {
            if (typeof userData.assessment.userTipiScores === 'string') {
                try {
                    state.userTipiScores = JSON.parse(userData.assessment.userTipiScores);
                }
                catch (error) {
                    console.error('Failed to parse userTipiScores string:', error);
                    state.userTipiScores = null; // Set to null on parsing error
                }
            }
            else {
                // Already an object
                state.userTipiScores = userData.assessment.userTipiScores;
            }
        }
        else {
            state.userTipiScores = null;
        }
        // Do the same for AI scores if they exist
        if (userData.assessment?.aiTipiScores) {
            if (typeof userData.assessment.aiTipiScores === 'string') {
                try {
                    state.aiTipiScores = JSON.parse(userData.assessment.aiTipiScores);
                }
                catch (error) {
                    console.error('Failed to parse aiTipiScores string:', error);
                    state.aiTipiScores = null;
                }
            }
            else {
                state.aiTipiScores = userData.assessment.aiTipiScores;
            }
        }
        else {
            state.aiTipiScores = null;
        }
        // Set current profile if primary persona exists
        if (userData.primaryPersona) {
            state.currentGeneratedProfile = userData.primaryPersona.profile;
        }
        else {
            state.currentGeneratedProfile = null;
        }
        // Update UI elements
        updateUIWithUserData(userData);
        // Check for LinkedIn connection status
        checkLinkedInConnectionStatus(); // Check status based on loaded data
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
    }
    catch (error) {
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
export function updateUIWithUserData(userData) {
    // Update user display
    if (currentUserDisplaySpan) {
        currentUserDisplaySpan.textContent = userData.id;
    }
    // Load bio if present
    if (userBioTextarea) {
        userBioTextarea.value = userData.bio || '';
    }
    // Log the entire userData structure to help debug
    console.log('Update UI with userData structure:', {
        has_primaryPersona: !!userData.primaryPersona,
        primary_persona_keys: userData.primaryPersona ? Object.keys(userData.primaryPersona) : [],
        has_primaryPersona_profile: !!userData.primaryPersona?.profile,
        has_generation: !!userData.generation,
        generation_keys: userData.generation ? Object.keys(userData.generation) : [],
        has_lastGeneratedProfile: !!userData.generation?.lastGeneratedProfile,
        raw_userData_keys: Object.keys(userData)
    });
    // Set personality data from userData
    // First check for primaryPersona which is the new structure
    if (userData.primaryPersona?.profile) {
        console.log('Profile loaded from userData.primaryPersona.profile');
        state.currentGeneratedProfile = userData.primaryPersona.profile;
        // Ensure currentUserData has primaryPersona
        if (state.currentUserData) {
            state.currentUserData.primaryPersona = userData.primaryPersona;
        }
    }
    // Then check legacy structures as fallback
    else if (userData.generation?.lastGeneratedProfile?.json) {
        console.log('Profile loaded from generation.lastGeneratedProfile.json');
        state.currentGeneratedProfile = userData.generation.lastGeneratedProfile.json;
    }
    else if (userData.personality) {
        console.log('Profile loaded from userData.personality (may be older structure)');
        state.currentGeneratedProfile = userData.personality;
    }
    else {
        console.log('No profile found in user data');
        state.currentGeneratedProfile = null;
    }
    // Load assessment data
    state.userTipiScores = userData.assessment?.userTipiScores || null;
    state.aiTipiScores = userData.assessment?.aiTipiScores || null;
    updateAssessmentUI(!!state.userTipiScores);
    // Load chat history
    state.currentChatHistory = Array.isArray(userData.chatHistory) ? userData.chatHistory : [];
    // Save the complete user data to state
    state.currentUserData = userData;
    // Log final state
    console.log('Final state after updateUIWithUserData:', {
        currentUserId: state.currentUserId,
        hasCurrentGeneratedProfile: !!state.currentGeneratedProfile,
        hasUserDataProfile: !!state.currentUserData?.primaryPersona?.profile,
        userDataPrimaryPersonaId: state.currentUserData?.primaryPersona?.id || 'none'
    });
    // Persist selected user ID
    localStorage.setItem('lastSelectedUser', userData.id);
}
/**
 * Update Assessment UI based on whether the user has scores
 * @param hasAssessment - Boolean indicating if assessment scores exist
 */
function updateAssessmentUI(hasAssessment) {
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
export async function handleCreateUser() {
    if (!newUserInput || !userStatusDiv)
        return;
    const newUserId = newUserInput.value.trim();
    if (!newUserId) {
        showStatus(userStatusDiv, 'Please enter a valid user ID (e.g., alphanumeric, underscores)', 'error');
        return;
    }
    // Basic validation for user ID format (optional, adjust as needed)
    if (!/^[a-zA-Z0-9_]+$/.test(newUserId)) {
        showStatus(userStatusDiv, 'User ID can only contain letters, numbers, and underscores.', 'error');
        return;
    }
    try {
        showStatus(userStatusDiv, 'Creating user...', 'loading');
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUserId })
        });
        if (!response.ok) {
            let errorMsg = `Failed to create user (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore JSON parsing error */ }
            throw new Error(errorMsg);
        }
        const newUser = await response.json();
        // Update user list and select the new user
        await loadUserList();
        if (userSelectDropdown) {
            userSelectDropdown.value = newUser.id;
            await handleUserSelectChange(); // Load the new user's data
        }
        showStatus(userStatusDiv, `User '${newUser.id}' created successfully`, 'success');
        newUserInput.value = ''; // Clear the input
    }
    catch (error) {
        console.error('Error creating user:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error creating user: ${message}`, 'error');
    }
}
/**
 * Save user bio
 */
export async function handleSaveBio() {
    if (!userBioTextarea || !state.currentUserId) {
        showStatus(bioStatusDiv, 'Please select a user first', 'error');
        return;
    }
    const bioText = userBioTextarea.value; // Keep whitespace potentially
    try {
        showStatus(bioStatusDiv, 'Saving bio...', 'loading');
        const response = await fetch(`/api/users/${state.currentUserId}/bio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bioText })
        });
        if (!response.ok) {
            let errorMsg = `Failed to save bio (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore JSON parsing error */ }
            throw new Error(errorMsg);
        }
        showStatus(bioStatusDiv, 'Bio saved successfully', 'success', 2000);
    }
    catch (error) {
        console.error('Error saving bio:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(bioStatusDiv, `Error saving bio: ${message}`, 'error');
    }
}
/**
 * Check LinkedIn connection status - relies on other functions to update UI
 */
export function checkLinkedInConnectionStatus() {
    if (!state.currentUserId) {
        console.warn('checkLinkedInConnectionStatus called without a user context.');
        // Attempt to restore context - might be redundant if called after loadUserData
        const userDisplaySpan = document.getElementById('current-user-display');
        if (userDisplaySpan?.textContent && userDisplaySpan.textContent !== 'None Selected') {
            state.currentUserId = userDisplaySpan.textContent;
            console.log('Restored user context during LinkedIn check:', state.currentUserId);
        }
        else {
            // If still no user, ensure UI shows disconnected state
            handleLinkedInStatus(false, false);
            return;
        }
    }
    const currentUserId = state.currentUserId;
    console.log(`Checking LinkedIn connection status for user: ${currentUserId}`);
    const urlParams = new URLSearchParams(window.location.search);
    const isCallbackDetected = detectLinkedInCallback(urlParams);
    const paramUserId = urlParams.get('user_id');
    // If callback detected for a *different* user than current, something is wrong
    if (isCallbackDetected && paramUserId && paramUserId !== currentUserId) {
        console.warn(`LinkedIn callback detected for user ${paramUserId}, but current user is ${currentUserId}. Ignoring callback.`);
        // Clear potentially incorrect callback state
        clearLinkedInCallbackState(urlParams);
        // Proceed to check status for the *current* user
    }
    else if (isCallbackDetected) {
        console.log(`LinkedIn callback detected for current user ${currentUserId}`);
    }
    // Check assets first as primary indicator
    fetch(`/api/assets/${currentUserId}`)
        .then(response => {
        if (!response.ok) {
            // Don't throw error, just assume no assets if fetch fails for status check
            console.warn(`Failed to fetch assets for status check: ${response.status}`);
            return [];
        }
        return response.json();
    })
        .then((assets) => {
        const hasLinkedInAssets = assets.some(asset => asset.sourceType === 'linkedin' ||
            asset.context === 'LinkedIn Profile' ||
            asset.fileName === 'linkedin_profile.json' ||
            (asset.context && typeof asset.context === 'string' && asset.context.toLowerCase().includes('linkedin')) ||
            (asset.fileName && typeof asset.fileName === 'string' && asset.fileName.toLowerCase().includes('linkedin')));
        console.log(`LinkedIn asset check for ${currentUserId}: ${hasLinkedInAssets}`);
        if (hasLinkedInAssets || (isCallbackDetected && currentUserId === paramUserId)) {
            // If assets found OR callback matches current user, treat as connected
            handleLinkedInStatus(true, isCallbackDetected);
            return;
        }
        else {
            // If no assets and no relevant callback, check user flag as fallback
            return fetch(`/api/users/${currentUserId}`)
                .then(response => {
                if (!response.ok) {
                    console.warn(`Failed to fetch user data for status check: ${response.status}`);
                    return { linkedInConnected: false }; // Assume not connected on error
                }
                return response.json();
            })
                .then((userData) => {
                const isConnected = !!userData.linkedInConnected;
                console.log(`User data flag check for ${currentUserId}: ${isConnected}`);
                handleLinkedInStatus(isConnected, false); // Callback relevance handled above
                return;
            });
        }
    })
        .catch(error => {
        console.error(`Error checking LinkedIn status for ${currentUserId}:`, error);
        // Assume disconnected on error, but clear callback state if detected
        handleLinkedInStatus(false, isCallbackDetected);
    });
}
/**
 * Detects if the current URL parameters indicate a LinkedIn callback.
 */
function detectLinkedInCallback(urlParams) {
    const authStatus = urlParams.get('auth_status');
    const oauthSource = urlParams.get('oauth_source');
    const status = urlParams.get('status');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');
    // Check localStorage as well, as URL params might be cleared quickly
    const pendingAuth = localStorage.getItem('pendingLinkedInAuth') === 'true';
    // Check for error first
    if (error) {
        console.error(`LinkedIn Auth Error detected in URL: ${error}`);
        return true; // Treat error as a callback that needs clearing
    }
    return ((authStatus === 'success' && (provider === 'linkedin' || !provider)) ||
        (status === 'success' && (oauthSource === 'linkedin' || !oauthSource)) ||
        pendingAuth);
}
/**
 * Clears LinkedIn callback state from localStorage and URL.
 */
function clearLinkedInCallbackState(urlParams) {
    localStorage.removeItem('pendingLinkedInAuth');
    localStorage.removeItem('linkedInAuthUserId');
    console.log('Cleared LinkedIn auth localStorage state.');
    // Check which params actually exist before trying to clear
    const paramsToClear = ['auth_status', 'oauth_source', 'status', 'provider', 'user_id', 'error']
        .filter(p => urlParams.has(p));
    if (paramsToClear.length > 0) {
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('Cleared LinkedIn URL parameters.');
    }
}
/**
 * Updates UI and potentially backend based on LinkedIn connection status.
 * @param isConnected - Whether LinkedIn is determined to be connected.
 * @param wasCallbackDetected - Whether this check was triggered by detecting callback params.
 */
function handleLinkedInStatus(isConnected, wasCallbackDetected) {
    const currentUserId = state.currentUserId;
    // Update UI immediately
    if (isConnected) {
        showLinkedInConnectedUI();
    }
    else {
        showLinkedInDisconnectedUI();
    }
    // If connected, ensure backend user flag is set
    if (isConnected && currentUserId) {
        fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkedInConnected: true })
        })
            .then(response => {
            if (!response.ok)
                console.error('Failed to update backend user linkedInConnected flag.');
            else
                console.log('Backend user linkedInConnected flag updated.');
        })
            .catch(error => console.error('Error updating backend user flag:', error));
        // Show success message if this was triggered by a callback
        if (wasCallbackDetected) {
            showStatus(userStatusDiv, 'LinkedIn connected successfully!', 'success', 3000);
        }
    }
    // If a callback was detected (success or error), clear the state
    if (wasCallbackDetected) {
        clearLinkedInCallbackState(new URLSearchParams(window.location.search));
    }
}
/**
 * Handle LinkedIn connect button click
 */
export function handleLinkedInConnect() {
    if (!state.currentUserId) {
        // Attempt context restoration one last time
        const userDisplaySpan = document.getElementById('current-user-display');
        if (userDisplaySpan?.textContent && userDisplaySpan.textContent !== 'None Selected') {
            state.currentUserId = userDisplaySpan.textContent;
        }
        else {
            showStatus(userStatusDiv, 'Please select or create a user profile first.', 'error');
            return;
        }
    }
    const userIdToConnect = state.currentUserId;
    console.log('Initiating LinkedIn connection for user:', userIdToConnect);
    const authUrl = `/api/oauth/linkedin/authorize?userId=${encodeURIComponent(userIdToConnect)}`;
    // Set flags before redirecting
    localStorage.setItem('pendingLinkedInAuth', 'true');
    localStorage.setItem('linkedInAuthUserId', userIdToConnect);
    localStorage.setItem('lastSelectedUser', userIdToConnect); // Ensure user context is saved
    showStatus(userStatusDiv, 'Redirecting to LinkedIn for authentication...', 'loading');
    // Redirect
    window.location.href = authUrl;
}
/** Helper function to update UI for LinkedIn connected state */
function showLinkedInConnectedUI() {
    connectLinkedinButton?.style.setProperty('display', 'none');
    disconnectLinkedinButton?.style.setProperty('display', 'flex');
    document.getElementById('linkedin-status-badge')?.style.setProperty('display', 'inline-block');
    console.log('UI updated to show LinkedIn connected.');
}
/** Helper function to update UI for LinkedIn disconnected state */
function showLinkedInDisconnectedUI() {
    connectLinkedinButton?.style.setProperty('display', 'flex');
    disconnectLinkedinButton?.style.setProperty('display', 'none');
    document.getElementById('linkedin-status-badge')?.style.setProperty('display', 'none');
    console.log('UI updated to show LinkedIn disconnected.');
}
/**
 * Handle LinkedIn disconnect button click
 */
export async function handleLinkedInDisconnect() {
    if (!state.currentUserId) {
        showStatus(userStatusDiv, 'Please select a user first.', 'error');
        return;
    }
    if (!confirm("Are you sure you want to disconnect your LinkedIn account? This revokes access but keeps already imported data.")) {
        return;
    }
    const userIdToDisconnect = state.currentUserId;
    console.log('Disconnecting LinkedIn for user:', userIdToDisconnect);
    showStatus(userStatusDiv, 'Disconnecting LinkedIn...', 'loading');
    try {
        const response = await fetch(`/api/oauth/linkedin/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userIdToDisconnect })
        });
        if (!response.ok) {
            let errorMsg = `Failed to disconnect (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        console.log('LinkedIn disconnect result:', data);
        // Update UI and clear state
        showLinkedInDisconnectedUI();
        clearLinkedInCallbackState(new URLSearchParams()); // Clear any potential leftover state
        showStatus(userStatusDiv, 'LinkedIn disconnected successfully', 'success', 3000);
        // Update user data flag on backend
        await fetch(`/api/users/${userIdToDisconnect}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkedInConnected: false })
        });
    }
    catch (error) {
        console.error('Error disconnecting LinkedIn:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(userStatusDiv, `Error disconnecting LinkedIn: ${message}`, 'error');
        // Optionally attempt to force UI to disconnected state even on error
        showLinkedInDisconnectedUI();
    }
}
/**
 * Handle the start assessment button click
 */
export function handleStartAssessment() {
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
export function handleRetakeAssessment() {
    if (!confirm('Are you sure you want to retake the assessment? Your previous answers will be overwritten.')) {
        return;
    }
    handleStartAssessment(); // Reuse the start assessment logic
}
/**
 * Load TIPI questions into the assessment modal
 */
async function loadTipiQuestions() {
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
        questions.forEach((q, index) => {
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
                        ${[1, 2, 3, 4, 5, 6, 7].map(val => `
                            <div class="radio-option">
                                <input type="radio" id="tipi-q-${q.id}-${val}" name="${q.id}" value="${val}" required>
                                <label for="tipi-q-${q.id}-${val}">${val}</label>
                            </div>
                        `).join('')}
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
    }
    catch (error) {
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
export async function handleUserAssessmentSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    if (!tipiModalForm || !state.currentUserId) {
        showStatus(assessmentModalStatusDiv, 'Error: Cannot submit assessment. User or form not found.', 'error');
        return;
    }
    const formData = new FormData(tipiModalForm);
    const answers = {};
    let allAnswered = true;
    // Extract answers directly from form data
    for (const [questionId, value] of formData.entries()) {
        if (questionId.startsWith('q')) {
            answers[questionId] = parseInt(value, 10);
        }
    }
    // Check if we have all 10 questions answered
    if (Object.keys(answers).length !== 10) {
        allAnswered = false;
    }
    if (!allAnswered) {
        showStatus(assessmentModalStatusDiv, 'Please answer all questions before submitting.', 'error');
        return;
    }
    console.log('Submitting assessment answers:', answers);
    showStatus(assessmentModalStatusDiv, 'Submitting answers...', 'loading');
    try {
        const response = await fetch(`/api/assessment/${state.currentUserId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        if (!response.ok) {
            let errorMsg = `Failed to submit assessment (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore */ }
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
    }
    catch (error) {
        console.error('Error submitting assessment:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(assessmentModalStatusDiv, `Error submitting: ${message}`, 'error');
    }
}
/**
 * Clear UI state when no user is selected
 */
export function clearUIState() {
    console.log('Clearing UI state');
    // Reset state variables
    state.currentUserId = null;
    state.currentGeneratedProfile = null;
    state.selectedAssets = new Set();
    state.currentChatHistory = [];
    state.userTipiScores = null;
    state.aiTipiScores = null;
    // Clear UI elements
    if (currentUserDisplaySpan)
        currentUserDisplaySpan.textContent = 'None Selected';
    if (userBioTextarea)
        userBioTextarea.value = '';
    if (newUserInput)
        newUserInput.value = ''; // Clear create user input
    // Reset button states / visibility
    showLinkedInDisconnectedUI();
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
function handleUserDeselect() {
    console.log('User deselected');
    // Reset the state related to the current user
    state.currentUserId = null;
    state.currentGeneratedProfile = null;
    state.selectedAssets.clear();
    state.currentChatHistory = [];
    state.currentChatSessionId = null;
    state.userTipiScores = null;
    state.aiTipiScores = null;
    // Update UI elements managed DIRECTLY by userModule
    if (currentUserDisplaySpan)
        currentUserDisplaySpan.textContent = 'None Selected';
    if (userBioTextarea)
        userBioTextarea.value = '';
    // Trigger events to notify other modules
    document.dispatchEvent(new CustomEvent('user-deselected'));
    document.dispatchEvent(new CustomEvent('library-cleared', { detail: { userId: null } })); // Notify content/personality modules
    localStorage.removeItem('lastSelectedUser'); // Clear saved user
    showStatus(userStatusDiv, 'No user selected', 'info');
}
//# sourceMappingURL=userModule.js.map