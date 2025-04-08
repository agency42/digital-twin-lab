/**
 * chatModule.ts - Handles chat interaction with the digital twin
 */
import { state, showStatus, formatMessageContent } from './utils.js';
// UI Elements cache - typed
let chatHistoryDiv = null;
let chatInputElement = null;
let chatStatusDiv = null;
let clearChatButton = null;
let systemPromptEditor = null;
let saveChatPromptVariationButton = null;
let resetChatPromptButton = null;
let showSystemPromptCheckbox = null;
/**
 * Initialize the chat module
 * @param elements - UI elements for chat functionality
 */
export function initChatModule(elements) {
    chatHistoryDiv = elements.chatHistoryDiv;
    chatInputElement = elements.chatInputElement;
    chatStatusDiv = elements.chatStatusDiv;
    clearChatButton = elements.clearChatButton;
    systemPromptEditor = elements.systemPromptEditor;
    showSystemPromptCheckbox = elements.showSystemPromptCheckbox;
    // Get other buttons by ID
    saveChatPromptVariationButton = document.getElementById('save-chat-prompt-variation-button');
    resetChatPromptButton = document.getElementById('reset-chat-prompt-button');
    // Set up event listeners with null checks
    chatInputElement?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });
    clearChatButton?.addEventListener('click', clearChat);
    showSystemPromptCheckbox?.addEventListener('change', toggleSystemPromptVisibility);
    saveChatPromptVariationButton?.addEventListener('click', saveChatPromptVariation);
    resetChatPromptButton?.addEventListener('click', () => resetChatPrompt());
    // Listen for user data loaded event to update chat state
    document.addEventListener('user-data-loaded', (event) => {
        const customEvent = event;
        console.log('Chat module received user-data-loaded event');
        if (customEvent.detail?.userId) {
            // Assuming state.currentUserData is now populated by userModule
            loadChatHistory();
            updateSystemPrompt();
            toggleSystemPromptVisibility(); // Ensure visibility matches checkbox
        }
    });
    // Listen for personality generated event to update prompt
    document.addEventListener('personality-generated', (event) => {
        const customEvent = event;
        console.log('Chat module received personality-generated event');
        if (customEvent.detail?.userId === state.currentUserId) {
            // New persona generated, reset chat prompt to use it
            resetChatPrompt(false); // Pass false to avoid confirmation dialog
        }
    });
    console.log('Chat module initialized.');
}
/**
 * Send a chat message
 */
export async function sendChatMessage() {
    if (!chatInputElement || !chatHistoryDiv || !chatStatusDiv)
        return;
    const message = chatInputElement.value.trim();
    if (!message)
        return;
    if (!state.currentUserId) {
        showStatus(chatStatusDiv, 'Please select a user first', 'error');
        return;
    }
    const personaId = state.currentUserData?.primaryPersona?.id;
    if (!personaId) {
        showStatus(chatStatusDiv, 'Please ensure a primary personality profile exists for the user.', 'error');
        return;
    }
    const currentUserId = state.currentUserId; // Use const after check
    // Add user message to chat UI first
    addMessageToChat('user', message);
    chatInputElement.value = ''; // Clear input
    // Add to in-memory history immediately for context
    // Use a copy to avoid potential modification issues if state update is slow
    const currentHistory = [...(state.currentChatHistory || [])];
    currentHistory.push({ role: 'user', content: message });
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message-wrapper assistant-message';
    typingIndicator.innerHTML = `<div class="message typing-indicator"><span></span><span></span><span></span></div>`;
    chatHistoryDiv.appendChild(typingIndicator);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    try {
        showStatus(chatStatusDiv, 'Generating response...', 'loading');
        const systemPromptText = systemPromptEditor ? systemPromptEditor.value : '';
        const response = await fetch(`/api/chat/${currentUserId}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: currentHistory.slice(-10), // Send recent history for context (adjust slice as needed)
                systemPrompt: systemPromptText,
                personaId,
                sessionId: state.currentChatSessionId
            })
        });
        typingIndicator.remove(); // Remove indicator
        if (!response.ok) {
            let errorMsg = `Failed to generate response (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        // Add assistant response to chat
        addMessageToChat('assistant', data.response);
        // Update state history (assuming API returns the full updated history or relevant parts)
        // If API manages history/sessions, we might just update the session ID
        state.currentChatHistory = data.updatedHistory || [...currentHistory, { role: 'assistant', content: data.response }];
        state.currentChatSessionId = data.sessionId || state.currentChatSessionId;
        showStatus(chatStatusDiv, '', 'info'); // Clear status
    }
    catch (error) {
        console.error('Error generating response:', error);
        typingIndicator.remove(); // Ensure indicator is removed on error
        const message = error instanceof Error ? error.message : String(error);
        addMessageToChat('system', `Error: ${message}`);
        showStatus(chatStatusDiv, `Error: ${message}`, 'error');
    }
}
/**
 * Add a message to the chat history UI
 * @param role - 'user', 'assistant', or 'system'
 * @param content - The message content
 */
export function addMessageToChat(role, content) {
    if (!chatHistoryDiv)
        return;
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message-wrapper ${role}-message`;
    const formattedContent = formatMessageContent(content);
    messageWrapper.innerHTML = `<div class="message"><div class="content">${formattedContent}</div></div>`;
    chatHistoryDiv.appendChild(messageWrapper);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to bottom
}
/**
 * Clear the chat history (UI and potentially state/backend)
 */
export function clearChat() {
    if (!chatHistoryDiv || !state.currentUserId)
        return;
    if (!confirm('Are you sure you want to clear the chat history for this session?')) {
        return;
    }
    // Clear UI
    chatHistoryDiv.innerHTML = '';
    // Add default terminal messages
    addMessageToChat('system', '# Digital Twin Terminal v1.0');
    addMessageToChat('system', '# Type your messages and press Enter to communicate...');
    addMessageToChat('system', "# Chat cleared.");
    // Clear state
    state.currentChatHistory = [];
    // Consider resetting session ID or triggering new session creation on backend
    state.currentChatSessionId = null;
    // Backend Interaction: Should ideally trigger a new session or clear the current one
    // Example (needs API endpoint):
    // fetch(`/api/chat/${state.currentUserId}/session`, { method: 'DELETE' }); 
    showStatus(chatStatusDiv, 'Chat history cleared', 'success', 2000);
}
/**
 * Load chat history from the latest session in state.
 */
export function loadChatHistory() {
    if (!chatHistoryDiv)
        return;
    chatHistoryDiv.innerHTML = ''; // Clear current display
    // Add default terminal messages
    addMessageToChat('system', '# Digital Twin Terminal v1.0');
    addMessageToChat('system', '# Type messages to interact...');
    const latestSession = state.currentUserData?.latestChatSession;
    state.currentChatSessionId = latestSession?.id || null;
    if (latestSession?.messages?.length) {
        latestSession.messages.forEach((message) => {
            addMessageToChat(message.role, message.content);
        });
        console.log(`Chat history displayed for session: ${latestSession.id} (${latestSession.messages.length} messages)`);
        state.currentChatHistory = latestSession.messages;
    }
    else {
        console.log('No previous chat session found or session is empty.');
        addMessageToChat('system', '# No previous messages found.');
        state.currentChatHistory = [];
    }
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll after loading
}
/**
 * Update the system prompt editor based on the current user state.
 * Loads the chat-specific variation if available, otherwise the base persona.
 */
export function updateSystemPrompt() {
    if (!systemPromptEditor)
        return;
    let promptContent = '';
    let source = 'none';
    const chatVariation = state.currentUserData?.personaVariations?.chat;
    const baseProfile = state.currentUserData?.primaryPersona?.profile;
    const basePersonaId = state.currentUserData?.primaryPersona?.id;
    if (chatVariation?.systemPrompt) {
        promptContent = chatVariation.systemPrompt;
        source = `Chat Variation (Updated: ${new Date(chatVariation.updatedAt).toLocaleDateString()})`;
    }
    else if (baseProfile) {
        try {
            promptContent = JSON.stringify(baseProfile, null, 2);
            source = `Base Persona (${basePersonaId || 'Unknown ID'})`;
        }
        catch (error) {
            console.error('Error stringifying base profile:', error);
            promptContent = '// Error loading base persona profile.';
            source = 'error';
        }
    }
    else {
        promptContent = '// No persona available. Generate a Primary Persona first.';
        source = 'none';
    }
    systemPromptEditor.value = promptContent;
    console.log(`System prompt updated from: ${source}`);
    // Use chatStatusDiv for status messages related to prompt loading
    showStatus(chatStatusDiv, `Prompt Loaded: ${source}`, 'info', 4000);
}
/**
 * Toggle system prompt editor visibility based on checkbox state.
 */
function toggleSystemPromptVisibility() {
    if (!showSystemPromptCheckbox || !systemPromptEditor)
        return;
    // Find the container - assuming a structure like <div class="system-prompt-container">...<textarea>...</textarea>...</div>
    const container = systemPromptEditor.closest('.system-prompt-container');
    if (!container) {
        console.warn('Could not find system prompt container element to toggle visibility.');
        // Fallback: toggle editor directly?
        // systemPromptEditor.style.display = showSystemPromptCheckbox.checked ? 'block' : 'none';
        return;
    }
    container.style.display = showSystemPromptCheckbox.checked ? 'block' : 'none';
}
/**
 * Save the current system prompt content as the 'chat' variation.
 */
async function saveChatPromptVariation() {
    if (!systemPromptEditor || !state.currentUserId)
        return;
    const currentUserId = state.currentUserId;
    const promptContent = systemPromptEditor.value;
    const personaId = state.currentUserData?.primaryPersona?.id;
    if (!personaId) {
        showStatus(chatStatusDiv, 'Cannot save variation: No primary persona found.', 'error');
        return;
    }
    try {
        showStatus(chatStatusDiv, 'Saving chat prompt variation...', 'loading');
        const response = await fetch(`/api/personality/${currentUserId}/variations/chat`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personaId, systemPrompt: promptContent })
        });
        if (!response.ok) {
            let errorMsg = `Failed to save variation (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        const result = await response.json(); // Assuming API returns { variation_id, updatedAt }
        // Update local state
        if (state.currentUserData) {
            if (!state.currentUserData.personaVariations) {
                state.currentUserData.personaVariations = {};
            }
            state.currentUserData.personaVariations['chat'] = {
                id: result.variation_id,
                systemPrompt: promptContent,
                updatedAt: result.updated_at || new Date().toISOString()
            };
        }
        showStatus(chatStatusDiv, 'Chat variation saved. Clear chat for changes to take effect.', 'success', 4000);
    }
    catch (error) {
        console.error('Error saving chat prompt variation:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(chatStatusDiv, `Error saving variation: ${message}`, 'error');
    }
}
/**
 * Reset the chat system prompt back to the user's primary persona profile.
 * Deletes the 'chat' variation on the server.
 * @param {boolean} [confirmReset=true] - Whether to show a confirmation dialog.
 */
async function resetChatPrompt(confirmReset = true) {
    if (!systemPromptEditor || !state.currentUserId)
        return;
    const currentUserId = state.currentUserId;
    const baseProfile = state.currentUserData?.primaryPersona?.profile;
    if (!baseProfile) {
        showStatus(chatStatusDiv, 'Cannot reset: No primary persona profile found.', 'error');
        return;
    }
    if (confirmReset && !confirm('Reset chat prompt to the base persona? This deletes saved chat changes.')) {
        return;
    }
    try {
        showStatus(chatStatusDiv, 'Resetting prompt...', 'loading');
        // Delete variation on server
        const response = await fetch(`/api/personality/${currentUserId}/variations/chat`, {
            method: 'DELETE',
        });
        if (!response.ok && response.status !== 404) { // Ignore 404 (not found)
            let errorMsg = `Failed to delete variation (${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            }
            catch { /* Ignore */ }
            throw new Error(errorMsg);
        }
        // Remove variation from local state
        if (state.currentUserData?.personaVariations?.chat) {
            delete state.currentUserData.personaVariations.chat;
        }
        // Reload base persona into editor
        try {
            const baseJsonString = JSON.stringify(baseProfile, null, 2);
            systemPromptEditor.value = baseJsonString;
            showStatus(chatStatusDiv, 'Prompt reset to base persona. Clear chat for changes.', 'success', 4000);
        }
        catch (stringifyError) {
            console.error('Error stringifying base profile for reset:', stringifyError);
            systemPromptEditor.value = '// Error loading base persona after reset.';
            showStatus(chatStatusDiv, 'Chat variation deleted, but failed to load base profile.', 'error');
        }
    }
    catch (error) {
        console.error('Error resetting chat prompt:', error);
        const message = error instanceof Error ? error.message : String(error);
        showStatus(chatStatusDiv, `Error resetting prompt: ${message}`, 'error');
    }
}
//# sourceMappingURL=chatModule.js.map