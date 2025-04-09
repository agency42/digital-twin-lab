/**
 * chatModule.ts - Handles chat interaction with the digital twin
 */
import { state, showStatus, formatMessageContent } from './utils.js';
import { ChatMessage, UserData, PromptVariation, BasePromptText } from '../types'; // Use updated types

// Define interfaces/types
// --- REMOVED INTERFACES (moved to types.ts) ---
// interface ChatMessage { ... }


// Define a type for the elements passed to this module
interface ChatModuleElements {
    chatHistoryDiv: HTMLDivElement | null;
    chatInputElement: HTMLInputElement | null;
    chatStatusDiv: HTMLDivElement | null;
    clearChatButton: HTMLButtonElement | null;
    systemPromptEditor: HTMLTextAreaElement | null;
    showSystemPromptCheckbox: HTMLInputElement | null;
    // Buttons below are fetched by ID within init, could be passed instead
    // saveChatPromptVariationButton?: HTMLButtonElement | null;
    // resetChatPromptButton?: HTMLButtonElement | null;
}

// UI Elements cache - typed
let chatHistoryDiv: HTMLDivElement | null = null;
let chatInputElement: HTMLInputElement | null = null;
let chatStatusDiv: HTMLDivElement | null = null;
let clearChatButton: HTMLButtonElement | null = null;
let systemPromptEditor: HTMLTextAreaElement | null = null;
let saveChatPromptVariationButton: HTMLButtonElement | null = null;
let resetChatPromptButton: HTMLButtonElement | null = null;
let showSystemPromptCheckbox: HTMLInputElement | null = null;

// Store the currently loaded prompt source (base or variation)
let currentPromptSource: 'base' | 'variation' | 'none' = 'none';

/**
 * Initialize the chat module
 * @param elements - UI elements for chat functionality
 */
export function initChatModule(elements: ChatModuleElements): void {
    chatHistoryDiv = elements.chatHistoryDiv;
    chatInputElement = elements.chatInputElement;
    chatStatusDiv = elements.chatStatusDiv;
    clearChatButton = elements.clearChatButton;
    systemPromptEditor = elements.systemPromptEditor;
    showSystemPromptCheckbox = elements.showSystemPromptCheckbox;
    // Get other buttons by ID
    saveChatPromptVariationButton = document.getElementById('save-chat-prompt-variation-button') as HTMLButtonElement | null;
    resetChatPromptButton = document.getElementById('reset-chat-prompt-button') as HTMLButtonElement | null;

    // Set up event listeners with null checks
    chatInputElement?.addEventListener('keydown', handleChatInputKeydown);
    clearChatButton?.addEventListener('click', clearChat);
    showSystemPromptCheckbox?.addEventListener('change', toggleSystemPromptVisibility);
    saveChatPromptVariationButton?.addEventListener('click', saveChatPromptVariation);
    resetChatPromptButton?.addEventListener('click', () => resetChatPrompt());
    
    // Add event handler for toggle button
    const toggleSystemPromptButton = document.getElementById('toggle-system-prompt-button') as HTMLButtonElement | null;
    toggleSystemPromptButton?.addEventListener('click', forceToggleSystemPrompt);

    // Listen for user data changes
    document.addEventListener('user-data-loaded', handleUserDataUpdate);
    document.addEventListener('base-prompt-generated', handleUserDataUpdate); // Also update if base prompt changes
    // Listen for character card generation
    document.addEventListener('character-card-generated', handleUserDataUpdate);

    console.log('Chat module initialized.');
}

function handleChatInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

function handleUserDataUpdate(event: Event): void {
    const customEvent = event as CustomEvent;
    console.log(`Chat module received ${event.type} event`);
    if (customEvent.detail?.userId) {
        loadChatHistory();
        updateSystemPrompt(); // Load base or variation
        toggleSystemPromptVisibility();
    }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(): Promise<void> {
    if (!chatInputElement || !chatHistoryDiv || !chatStatusDiv || !systemPromptEditor) return;

    const message = chatInputElement.value.trim();
    if (!message || !state.currentUserId) return;

    const currentUserId = state.currentUserId;
    const systemPromptText = systemPromptEditor.value; // Use the currently displayed prompt

    if (!systemPromptText || systemPromptText.startsWith('// No prompt')) {
         showStatus(chatStatusDiv, 'Cannot chat without a system prompt.', 'error');
         return;
    }

    addMessageToChat('user', message);
    chatInputElement.value = '';
    const currentHistory: ChatMessage[] = [...(state.currentChatHistory || [])];
    currentHistory.push({ role: 'user', content: message });

    const typingIndicator = showTypingIndicator();

    try {
        showStatus(chatStatusDiv, 'Generating response...', 'loading');

        const response = await fetch(`/api/chat/${currentUserId}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: currentHistory.slice(-10),
                systemPrompt: systemPromptText, 
                // basePromptId and variationId are implicitly handled by the backend using the systemPrompt text for now
                sessionId: state.currentChatSessionId
            })
        });

        if (typingIndicator) typingIndicator.remove();

        if (!response.ok) {
            const errorMsg = await getErrorMessage(response, 'Failed to generate response');
            throw new Error(errorMsg);
        }

        const data = await response.json();
        addMessageToChat('assistant', data.response);
        state.currentChatHistory = data.updatedHistory || [...currentHistory, { role: 'assistant', content: data.response }];
        state.currentChatSessionId = data.sessionId || state.currentChatSessionId;
        showStatus(chatStatusDiv, '', 'info');

    } catch (error) {
        console.error('Error generating response:', error);
        if (typingIndicator) typingIndicator.remove();
        const message = error instanceof Error ? error.message : 'Unknown error';
        addMessageToChat('system', `Error: ${message}`);
        showStatus(chatStatusDiv, `Error: ${message}`, 'error');
    }
}

function showTypingIndicator(): HTMLDivElement | null {
     if (!chatHistoryDiv) return null;
     const indicator = document.createElement('div');
     indicator.className = 'message-wrapper assistant-message';
     indicator.innerHTML = `<div class="message typing-indicator"><span></span><span></span><span></span></div>`;
     chatHistoryDiv.appendChild(indicator);
     chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
     return indicator;
}

async function getErrorMessage(response: Response, defaultMessage: string): Promise<string> {
    let msg = `${defaultMessage} (${response.status})`;
    try { const errorData = await response.json(); msg = errorData.error || msg; } catch {} 
    return msg;
}

/**
 * Add a message to the chat history UI
 * @param role - 'user', 'assistant', or 'system'
 * @param content - The message content
 */
export function addMessageToChat(role: 'user' | 'assistant' | 'system', content: string): void {
    if (!chatHistoryDiv) return;

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
export function clearChat(): void {
    if (!chatHistoryDiv || !state.currentUserId) return;

    if (!confirm('Clear chat history? This starts a new session.')) {
        return;
    }

    // Clear UI
    chatHistoryDiv.innerHTML = ''; 
    // Add default terminal messages
    addMessageToChat('system', '# Digital Twin Terminal v1.0');
    addMessageToChat('system', '# Type messages to interact...');
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
export function loadChatHistory(): void {
    if (!chatHistoryDiv) return;

    chatHistoryDiv.innerHTML = ''; // Clear current display

    // Add default terminal messages
    addMessageToChat('system', '# Digital Twin Terminal v1.0');
    addMessageToChat('system', '# Type messages to interact...');

    const latestSession = state.currentUserData?.latestChatSession;
    state.currentChatSessionId = latestSession?.id || null;

    if (latestSession?.messages?.length) {
        latestSession.messages.forEach((message: ChatMessage) => {
            addMessageToChat(message.role, message.content);
        });
        console.log(`Chat history displayed for session: ${latestSession.id} (${latestSession.messages.length} messages)`);
        state.currentChatHistory = latestSession.messages;
    } else {
        console.log('No previous chat session found or session is empty.');
        addMessageToChat('system', '# No previous messages found.');
        state.currentChatHistory = [];
    }
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll after loading
}

/**
 * Force toggle the system prompt visibility regardless of checkbox state
 */
function forceToggleSystemPrompt(): void {
    if (!systemPromptEditor) return;
    
    // Find the container 
    const container = systemPromptEditor.closest('.system-prompt-container') as HTMLElement | null;
    if (!container) {
        console.warn('Could not find system prompt container element.');
        return;
    }
    
    // Toggle visibility directly
    const currentDisplay = container.style.display;
    container.style.display = currentDisplay === 'none' ? 'block' : 'none';
    
    // Update checkbox to match
    if (showSystemPromptCheckbox) {
        showSystemPromptCheckbox.checked = container.style.display !== 'none';
    }
    
    console.log('System prompt visibility toggled to:', container.style.display);
}

/**
 * Update the system prompt editor with the relevant prompt (variation or base).
 */
export function updateSystemPrompt(): void {
    if (!systemPromptEditor) return;

    let promptContent: BasePromptText | null = null;
    let promptSourceInfo = 'none';
    currentPromptSource = 'none'; // Reset source indicator

    const chatVariation = state.currentUserData?.promptVariations?.chat;
    const basePrompt = state.currentUserData?.basePrompt;

    // Debug to check what's in the basePrompt 
    console.log("Current basePrompt:", basePrompt);
    
    if (chatVariation?.system_prompt_override) {
        promptContent = chatVariation.system_prompt_override;
        promptSourceInfo = `Chat Variation (Saved: ${new Date(chatVariation.updated_at).toLocaleDateString()})`;
        currentPromptSource = 'variation';
    } else if (basePrompt?.promptText) {
        promptContent = basePrompt.promptText;
        promptSourceInfo = `Base Prompt (Generated: ${new Date(basePrompt.updatedAt).toLocaleDateString()})`;
        currentPromptSource = 'base';
        
        // Check if promptText is actually JSON and try to format it nicely
        try {
            const jsonObject = JSON.parse(promptContent);
            if (typeof jsonObject === 'object' && jsonObject !== null) {
                // It's a character card JSON, format it nicely for display
                promptContent = JSON.stringify(jsonObject, null, 2);
                promptSourceInfo = `Character Card (Generated: ${new Date(basePrompt.updatedAt).toLocaleDateString()})`;
            }
        } catch (e) {
            // Not JSON, leave as is
            console.log("Base prompt is not in JSON format");
        }
    } else {
        promptContent = '// No base prompt available. Generate one first.';
        promptSourceInfo = 'none';
    }

    systemPromptEditor.value = promptContent || ''; // Ensure value is string
    console.log(`Chat system prompt loaded from: ${promptSourceInfo}`);
    showStatus(chatStatusDiv, `Prompt Source: ${promptSourceInfo}`, 'info', 4000);
    
    // Make sure system prompt is visible
    const container = systemPromptEditor.closest('.system-prompt-container') as HTMLElement | null;
    if (container) {
        container.style.display = 'block';
        // Update checkbox
        if (showSystemPromptCheckbox) {
            showSystemPromptCheckbox.checked = true;
        }
    }

    // Update button states based on whether a variation is loaded
    updatePromptButtons();
}

/**
 * Toggle system prompt editor visibility based on checkbox state.
 */
function toggleSystemPromptVisibility(): void {
    if (!showSystemPromptCheckbox || !systemPromptEditor) return;

    // Find the container - assuming a structure like <div class="system-prompt-container">...<textarea>...</textarea>...</div>
    const container = systemPromptEditor.closest('.system-prompt-container') as HTMLElement | null;
    if (!container) {
         console.warn('Could not find system prompt container element to toggle visibility.');
         // Fallback: toggle editor directly?
         // systemPromptEditor.style.display = showSystemPromptCheckbox.checked ? 'block' : 'none';
         return;
    }

    container.style.display = showSystemPromptCheckbox.checked ? 'block' : 'none';
}

function updatePromptButtons(): void {
     if (saveChatPromptVariationButton) {
         saveChatPromptVariationButton.disabled = currentPromptSource === 'none';
         saveChatPromptVariationButton.title = currentPromptSource === 'none' ? "Cannot save variation without a base prompt" : "Save current text as chat-specific prompt variation";
     }
     if (resetChatPromptButton) {
         resetChatPromptButton.disabled = currentPromptSource !== 'variation';
         resetChatPromptButton.title = currentPromptSource === 'variation' ? "Reset chat prompt to the base prompt (deletes variation)" : "Chat is already using the base prompt";
     }
}

/**
 * Save the current system prompt content as the 'chat' variation.
 */
async function saveChatPromptVariation(): Promise<void> {
    if (!systemPromptEditor || !state.currentUserId || !state.currentUserData?.basePrompt) {
         showStatus(chatStatusDiv, 'Cannot save variation: User or base prompt missing.', 'error');
         return;
    }
    const currentUserId = state.currentUserId;
    const promptOverrideText = systemPromptEditor.value.trim();

    if (!promptOverrideText) {
         showStatus(chatStatusDiv, 'Cannot save an empty prompt variation.', 'info');
         return;
    }

    try {
        showStatus(chatStatusDiv, 'Saving chat prompt variation...', 'loading');

        // Use new endpoint and payload structure
        const response = await fetch(`/api/prompts/${currentUserId}/variations/chat`, {
            method: 'POST', // Use POST for upsert
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPromptOverride: promptOverrideText })
        });

        if (!response.ok) {
             const errorMsg = await getErrorMessage(response, 'Failed to save variation');
            throw new Error(errorMsg);
        }

        const result = await response.json(); // Expects { success: true, variationId: ... }
        
        // Fetch updated user data to get the latest variation info (including timestamp)
         await fetchAndUpdateUserData(currentUserId);
         
        // Reload prompt into editor to reflect saved state (and new timestamp)
         updateSystemPrompt(); 

        showStatus(chatStatusDiv, 'Chat variation saved.', 'success', 3000);

    } catch (error) {
        console.error('Error saving chat prompt variation:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        showStatus(chatStatusDiv, `Error saving variation: ${message}`, 'error');
    }
}

/**
 * Reset the chat system prompt back to the user's base prompt.
 * Deletes the 'chat' variation on the server.
 */
async function resetChatPrompt(confirmReset = true): Promise<void> {
    if (!systemPromptEditor || !state.currentUserId || !state.currentUserData?.basePrompt) {
        showStatus(chatStatusDiv, 'Cannot reset: User or base prompt missing.', 'error');
        return;
    }
    const currentUserId = state.currentUserId;
    const basePromptText = state.currentUserData.basePrompt.promptText;

    if (currentPromptSource !== 'variation') {
         showStatus(chatStatusDiv, 'Already using the base prompt.', 'info');
         return;
    }

    if (confirmReset && !confirm('Reset chat prompt to the base prompt? This deletes your saved chat-specific changes.')) {
        return;
    }

    try {
        showStatus(chatStatusDiv, 'Resetting prompt to base...', 'loading');

        // Delete variation on server using new endpoint
        const response = await fetch(`/api/prompts/${currentUserId}/variations/chat`, {
            method: 'DELETE',
        });

        // Response 200 OK means deleted or already didn't exist
        if (!response.ok) { 
            const errorMsg = await getErrorMessage(response, 'Failed to delete variation');
            throw new Error(errorMsg);
        }

        // Fetch updated user data to remove variation from local state
        await fetchAndUpdateUserData(currentUserId);
        
        // Reload base prompt into editor
        updateSystemPrompt(); 
        showStatus(chatStatusDiv, 'Prompt reset to base.', 'success', 3000);

    } catch (error) {
        console.error('Error resetting chat prompt:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        showStatus(chatStatusDiv, `Error resetting prompt: ${message}`, 'error');
    }
}

// Helper to fetch and update user data in state
async function fetchAndUpdateUserData(userId: string): Promise<void> {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        state.currentUserData = await response.json();
        console.log('User data updated in state.');
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Optionally show error to user
    }
} 